import {
  isSMSAction,
  isSMSOrWhatsappAction,
  isWhatsappAction,
} from "@calcom/features/ee/workflows/lib/actionHelperFunctions";
import type { Workflow, WorkflowStep } from "@calcom/features/ee/workflows/lib/types";
import { checkSMSRateLimit } from "@calcom/lib/checkRateLimitAndThrowError";
import { SENDER_NAME } from "@calcom/lib/constants";
import { SchedulingType, WorkflowActions, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { getTeamIdToBeCharged } from "../smsCredits/smsCreditsUtils";
import type { ScheduleEmailReminderAction } from "./emailReminderManager";
import { scheduleEmailReminder } from "./emailReminderManager";
import type { ScheduleTextReminderAction } from "./smsReminderManager";
import { scheduleSMSReminder } from "./smsReminderManager";
import { scheduleWhatsappReminder } from "./whatsappReminderManager";

export type ExtendedCalendarEvent = Omit<CalendarEvent, "bookerUrl"> & {
  metadata?: { videoCallUrl: string | undefined };
  eventType: {
    slug?: string;
    schedulingType?: SchedulingType | null;
    parent?: { teamId?: number | null } | null;
    hosts?: { user: { email: string; destinationCalendar?: { primaryEmail: string | null } | null } }[];
  };
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
  const { userId } = workflow;
  const teamId = evt.eventType.parent?.teamId ?? workflow.teamId;
  let teamOrUserToCharge;

  let fallbackEmail;

  if (isSMSOrWhatsappAction(step.action)) {
    teamOrUserToCharge = await getTeamIdToBeCharged(userId, teamId);

    const attendeeEmail = !!emailAttendeeSendToOverride
      ? emailAttendeeSendToOverride
      : evt.attendees[0].email;

    fallbackEmail = !teamOrUserToCharge ? attendeeEmail : undefined;

    await checkSMSRateLimit({
      identifier: `sms:${teamId ? "team:" : "user:"}${teamId || workflow.userId}`,
      rateLimitingType: "sms",
    });
  }

  if (isSMSAction(step.action) && teamOrUserToCharge) {
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
      teamId: teamId,
      isVerificationPending: step.numberVerificationPending,
      seatReferenceUid,
      teamOrUserToCharge,
    });
  } else if (
    step.action === WorkflowActions.EMAIL_ATTENDEE ||
    step.action === WorkflowActions.EMAIL_HOST ||
    step.action === WorkflowActions.EMAIL_ADDRESS ||
    fallbackEmail
  ) {
    let sendTo: string[] = [];

    if (!fallbackEmail) {
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

          sendTo = attendees;
          break;
      }
    } else {
      sendTo = [fallbackEmail];
    }

    const action = (
      !isSMSOrWhatsappAction(step.action) ? step.action : WorkflowActions.EMAIL_ATTENDEE
    ) as ScheduleEmailReminderAction;

    await scheduleEmailReminder({
      evt,
      triggerEvent: workflow.trigger,
      action,
      timeSpan: {
        time: workflow.time,
        timeUnit: workflow.timeUnit,
      },
      sendTo,
      emailSubject: fallbackEmail ? "Booking notification" : step.emailSubject || "",
      emailBody: step.reminderBody || "",
      template: step.template,
      sender: step.sender || SENDER_NAME,
      workflowStepId: step.id,
      hideBranding,
      seatReferenceUid,
      includeCalendarEvent: step.includeCalendarEvent,
    });
  } else if (isWhatsappAction(step.action) && teamOrUserToCharge) {
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
      teamId: teamId,
      isVerificationPending: step.numberVerificationPending,
      seatReferenceUid,
      teamOrUserToCharge,
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
  } = args;

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
