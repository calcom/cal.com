import {
  isSMSAction,
  isSMSOrWhatsappAction,
  isWhatsappAction,
} from "@calcom/features/ee/workflows/lib/actionHelperFunctions";
import type { Workflow, WorkflowStep } from "@calcom/features/ee/workflows/lib/types";
import { checkSMSRateLimit } from "@calcom/lib/checkRateLimitAndThrowError";
import { SENDER_NAME } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import { SchedulingType, WorkflowActions, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { scheduleEmailReminder } from "./emailReminderManager";
import type { ScheduleTextReminderAction } from "./smsReminderManager";
import { scheduleSMSReminder } from "./smsReminderManager";
import { scheduleWhatsappReminder } from "./whatsappReminderManager";

export type ExtendedCalendarEvent = Omit<CalendarEvent, "bookerUrl"> & {
  metadata?: { videoCallUrl: string | undefined };
  eventType: {
    slug: string;
    schedulingType?: SchedulingType | null;
    hosts?: { user: { email: string; destinationCalendar?: { primaryEmail: string | null } | null } }[];
  };
  rescheduleReason?: string | null;
  cancellationReason?: string | null;
  bookerUrl: string;
};

type ProcessWorkflowStepParams = {
  smsReminderNumber: string | null;
  calendarEvent: ExtendedCalendarEvent;
  emailAttendeeSendToOverride?: string;
  hideBranding?: boolean;
  seatReferenceUid?: string;
};

export interface ScheduleWorkflowRemindersArgs extends ProcessWorkflowStepParams {
  workflows: Workflow[];
  isNotConfirmed?: boolean;
  isRescheduleEvent?: boolean;
  isFirstRecurringEvent?: boolean;
  isDryRun?: boolean;
}

const processWorkflowStep = async (
  workflow: Workflow,
  step: WorkflowStep,
  {
    smsReminderNumber,
    calendarEvent: evt,
    emailAttendeeSendToOverride,
    hideBranding,
    seatReferenceUid,
  }: ProcessWorkflowStepParams
) => {
  if (isSMSOrWhatsappAction(step.action)) {
    await checkSMSRateLimit({
      identifier: `sms:${workflow.teamId ? "team:" : "user:"}${workflow.teamId || workflow.userId}`,
      rateLimitingType: "sms",
    });
  }

  if (isSMSAction(step.action)) {
    const sendTo = step.action === WorkflowActions.SMS_ATTENDEE ? smsReminderNumber : step.sendTo;
    await scheduleSMSReminder({
      evt,
      reminderPhone: sendTo,
      triggerEvent: workflow.trigger,
      action: step.action as ScheduleTextReminderAction,
      timeSpan: {
        time: workflow.time,
        timeUnit: workflow.timeUnit,
      },
      message: step.reminderBody || "",
      workflowStepId: step.id,
      template: step.template,
      sender: step.sender,
      userId: workflow.userId,
      teamId: workflow.teamId,
      isVerificationPending: step.numberVerificationPending,
      seatReferenceUid,
    });
  } else if (
    step.action === WorkflowActions.EMAIL_ATTENDEE ||
    step.action === WorkflowActions.EMAIL_HOST ||
    step.action === WorkflowActions.EMAIL_ADDRESS
  ) {
    let sendTo: string[] = [];

    switch (step.action) {
      case WorkflowActions.EMAIL_ADDRESS:
        sendTo = [step.sendTo || ""];
        break;
      case WorkflowActions.EMAIL_HOST:
        sendTo = [evt.organizer?.email || ""];

        const schedulingType = evt.eventType.schedulingType;
        const isTeamEvent =
          schedulingType === SchedulingType.ROUND_ROBIN || schedulingType === SchedulingType.COLLECTIVE;
        if (isTeamEvent && evt.team?.members) {
          sendTo = sendTo.concat(evt.team.members.map((member) => member.email));
        }
        break;
      case WorkflowActions.EMAIL_ATTENDEE:
        const attendees = !!emailAttendeeSendToOverride
          ? [emailAttendeeSendToOverride]
          : evt.attendees?.map((attendee) => attendee.email);

        const limitGuestsDate = new Date("2025-01-13");

        if (workflow.userId) {
          const user = await prisma.user.findFirst({
            where: {
              id: workflow.userId,
            },
            select: {
              createdDate: true,
            },
          });
          if (user?.createdDate && user.createdDate > limitGuestsDate) {
            sendTo = attendees.slice(0, 1);
          } else {
            sendTo = attendees;
          }
        } else {
          sendTo = attendees;
        }

        break;
    }

    await scheduleEmailReminder({
      evt,
      triggerEvent: workflow.trigger,
      action: step.action,
      timeSpan: {
        time: workflow.time,
        timeUnit: workflow.timeUnit,
      },
      sendTo,
      emailSubject: step.emailSubject || "",
      emailBody: step.reminderBody || "",
      template: step.template,
      sender: step.sender || SENDER_NAME,
      workflowStepId: step.id,
      hideBranding,
      seatReferenceUid,
      includeCalendarEvent: step.includeCalendarEvent,
    });
  } else if (isWhatsappAction(step.action)) {
    const sendTo = step.action === WorkflowActions.WHATSAPP_ATTENDEE ? smsReminderNumber : step.sendTo;
    await scheduleWhatsappReminder({
      evt,
      reminderPhone: sendTo,
      triggerEvent: workflow.trigger,
      action: step.action as ScheduleTextReminderAction,
      timeSpan: {
        time: workflow.time,
        timeUnit: workflow.timeUnit,
      },
      message: step.reminderBody || "",
      workflowStepId: step.id,
      template: step.template,
      userId: workflow.userId,
      teamId: workflow.teamId,
      isVerificationPending: step.numberVerificationPending,
      seatReferenceUid,
    });
  }
};

export const scheduleWorkflowReminders = async (args: ScheduleWorkflowRemindersArgs) => {
  const {
    workflows,
    smsReminderNumber,
    calendarEvent: evt,
    isNotConfirmed = false,
    isRescheduleEvent = false,
    isFirstRecurringEvent = true,
    emailAttendeeSendToOverride = "",
    hideBranding,
    seatReferenceUid,
    isDryRun = false,
  } = args;
  if (isDryRun) return;
  if (isNotConfirmed || !workflows.length) return;

  for (const workflow of workflows) {
    if (workflow.steps.length === 0) continue;

    const isNotBeforeOrAfterEvent =
      workflow.trigger !== WorkflowTriggerEvents.BEFORE_EVENT &&
      workflow.trigger !== WorkflowTriggerEvents.AFTER_EVENT;

    if (
      isNotBeforeOrAfterEvent &&
      // Check if the trigger is not a new event without a reschedule and is the first recurring event.
      !(
        workflow.trigger === WorkflowTriggerEvents.NEW_EVENT &&
        !isRescheduleEvent &&
        isFirstRecurringEvent
      ) &&
      // Check if the trigger is not a rescheduled event that is rescheduled.
      !(workflow.trigger === WorkflowTriggerEvents.RESCHEDULE_EVENT && isRescheduleEvent)
    ) {
      continue;
    }
    for (const step of workflow.steps) {
      await processWorkflowStep(workflow, step, {
        calendarEvent: evt,
        emailAttendeeSendToOverride,
        smsReminderNumber,
        hideBranding,
        seatReferenceUid,
      });
    }
  }
};

export interface SendCancelledRemindersArgs {
  workflows: Workflow[];
  smsReminderNumber: string | null;
  evt: ExtendedCalendarEvent;
  hideBranding?: boolean;
}

export const sendCancelledReminders = async (args: SendCancelledRemindersArgs) => {
  const { smsReminderNumber, evt, workflows, hideBranding } = args;

  if (!workflows.length) return;

  for (const workflow of workflows) {
    if (workflow.trigger !== WorkflowTriggerEvents.EVENT_CANCELLED) continue;

    for (const step of workflow.steps) {
      processWorkflowStep(workflow, step, {
        smsReminderNumber,
        hideBranding,
        calendarEvent: evt,
      });
    }
  }
};
