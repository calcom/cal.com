import {
  isSMSAction,
  isSMSOrWhatsappAction,
  isWhatsappAction,
} from "@calcom/features/ee/workflows/lib/actionHelperFunctions";
import type { Workflow, WorkflowStep } from "@calcom/features/ee/workflows/lib/types";
import { checkSMSRateLimit } from "@calcom/lib/checkRateLimitAndThrowError";
import { SENDER_NAME } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import { WorkflowActions, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { scheduleEmailReminder } from "./emailReminderManager";
import type { ScheduleTextReminderAction } from "./smsReminderManager";
import { scheduleSMSReminder } from "./smsReminderManager";
import { scheduleWhatsappReminder } from "./whatsappReminderManager";

type ExtendedCalendarEvent = CalendarEvent & {
  metadata?: { videoCallUrl: string | undefined };
  eventType: { slug?: string };
};

type ProcessWorkflowStepParams = {
  smsReminderNumber: string | null;
  calendarEvent: ExtendedCalendarEvent;
  emailAttendeeSendToOverride?: string;
  hideBranding?: boolean;
  seatReferenceUid?: string;
};

export const workflowSelect = {
  id: true,
  trigger: true,
  time: true,
  timeUnit: true,
  userId: true,
  teamId: true,
  steps: {
    select: {
      id: true,
      action: true,
      sendTo: true,
      reminderBody: true,
      emailSubject: true,
      template: true,
      numberVerificationPending: true,
      sender: true,
      includeCalendarEvent: true,
      numberRequired: true,
    },
  },
};

export interface ScheduleWorkflowRemindersArgs extends ProcessWorkflowStepParams {
  eventTypeWorkflows: Workflow[];
  isNotConfirmed?: boolean;
  isRescheduleEvent?: boolean;
  isFirstRecurringEvent?: boolean;
  userId?: number | null;
  teamId?: number | null;
  orgId?: number | null;
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
        break;
      case WorkflowActions.EMAIL_ATTENDEE:
        const attendees = !!emailAttendeeSendToOverride
          ? [emailAttendeeSendToOverride]
          : evt.attendees?.map((attendee) => attendee.email);

        sendTo = attendees;

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
    eventTypeWorkflows,
    smsReminderNumber,
    calendarEvent: evt,
    isNotConfirmed = false,
    isRescheduleEvent = false,
    isFirstRecurringEvent = false,
    emailAttendeeSendToOverride = "",
    hideBranding,
    seatReferenceUid,
    userId,
    teamId,
    orgId,
  } = args;
  if (isNotConfirmed) return;

  const workflows = await getAllWorkflows(eventTypeWorkflows, userId, teamId, orgId);

  if (!workflows.length) return;

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
  eventTypeWorkflows: Workflow[];
  smsReminderNumber: string | null;
  evt: ExtendedCalendarEvent;
  hideBranding?: boolean;
  userId?: number | null;
  teamId?: number | null;
  orgId?: number | null;
}

const getAllWorkflows = async (
  eventTypeWorkflows: Workflow[],
  userId?: number | null,
  teamId?: number | null,
  orgId?: number | null
) => {
  const allWorkflows = eventTypeWorkflows;

  if (orgId) {
    if (teamId) {
      const orgTeamWorkflowsRel = await prisma.workflowsOnTeams.findMany({
        where: {
          teamId: teamId,
        },
        select: {
          workflow: {
            select: workflowSelect,
          },
        },
      });

      const orgTeamWorkflows = orgTeamWorkflowsRel?.map((workflowRel) => workflowRel.workflow) ?? [];
      allWorkflows.push(...orgTeamWorkflows);
    } else if (userId) {
      const orgUserWorkflowsRel = await prisma.workflowsOnTeams.findMany({
        where: {
          team: {
            members: {
              some: {
                userId: userId,
                accepted: true,
              },
            },
          },
        },
        select: {
          workflow: {
            select: workflowSelect,
          },
          team: true,
        },
      });

      const orgUserWorkflows = orgUserWorkflowsRel.map((workflowRel) => workflowRel.workflow) ?? [];
      allWorkflows.push(...orgUserWorkflows);
    }

    const activeOnAllOrgWorkflows = await prisma.workflow.findMany({
      where: {
        teamId: orgId,
        isActiveOnAll: true,
      },
      select: workflowSelect,
    });
    allWorkflows.push(...activeOnAllOrgWorkflows);
  }

  if (teamId) {
    const activeOnAllTeamWorkflows = await prisma.workflow.findMany({
      where: {
        teamId,
        isActiveOnAll: true, // what about managed event types
      },
      select: workflowSelect,
    });
    allWorkflows.push(...activeOnAllTeamWorkflows);
  } else if (userId) {
    const activeOnAllUserWorkflows = await prisma.workflow.findMany({
      where: {
        userId,
        isActiveOnAll: true, // what about managed event type?
      },
      select: workflowSelect,
    });
    allWorkflows.push(...activeOnAllUserWorkflows);
  }

  // remove all the duplicate workflows from allWorkflows
  const seen = new Set();

  const workflows = allWorkflows.filter((workflow) => {
    const duplicate = seen.has(workflow.id);
    seen.add(workflow.id);
    return !duplicate;
  });

  return workflows;
};

export const sendCancelledReminders = async (args: SendCancelledRemindersArgs) => {
  const { eventTypeWorkflows, smsReminderNumber, evt, hideBranding, userId, teamId, orgId } = args;

  const workflows = await getAllWorkflows(eventTypeWorkflows, userId, teamId, orgId);

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
