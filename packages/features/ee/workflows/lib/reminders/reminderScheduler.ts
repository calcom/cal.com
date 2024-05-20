import type { WorkflowsOnEventTypes } from "@prisma/client";

import {
  isSMSAction,
  isSMSOrWhatsappAction,
  isWhatsappAction,
} from "@calcom/features/ee/workflows/lib/actionHelperFunctions";
import { checkSMSRateLimit } from "@calcom/lib/checkRateLimitAndThrowError";
import { SENDER_NAME } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import type { TimeUnit, WorkflowTemplates } from "@calcom/prisma/enums";
import { WorkflowActions, WorkflowMethods, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { deleteScheduledEmailReminder, scheduleEmailReminder } from "./emailReminderManager";
import type { ScheduleTextReminderAction } from "./smsReminderManager";
import { deleteScheduledSMSReminder, scheduleSMSReminder } from "./smsReminderManager";
import { deleteScheduledWhatsappReminder, scheduleWhatsappReminder } from "./whatsappReminderManager";

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

export type Workflow = {
  id: number;
  trigger: WorkflowTriggerEvents;
  time: number | null;
  timeUnit: TimeUnit | null;
  userId: number | null;
  teamId: number | null;
  steps: WorkflowStep[];
};

type WorkflowStep = {
  action: WorkflowActions;
  sendTo: string | null;
  template: WorkflowTemplates;
  reminderBody: string | null;
  emailSubject: string | null;
  id: number;
  sender: string | null;
  includeCalendarEvent: boolean;
  numberVerificationPending: boolean;
  numberRequired: true;
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
  const allworkflows = eventTypeWorkflows;

  if (orgId) {
    if (userId) {
      const teamsWithWorkflows = await prisma.team.findMany({
        where: {
          members: {
            some: {
              userId,
              accepted: true,
            },
          },
        },
        select: {
          activeOrgWorkflows: {
            select: {
              workflow: {
                select: workflowSelect,
              },
            },
          },
        },
      });
      const orgTeamWorkflows = teamsWithWorkflows
        .map((team) => team.activeOrgWorkflows.map((worklfowRel) => worklfowRel.workflow))
        .flat();
      allworkflows.push(...orgTeamWorkflows);
    } else if (teamId) {
      const teamWithWorkflows = await prisma.team.findFirst({
        where: {
          id: teamId,
        },
        select: {
          activeOrgWorkflows: {
            select: {
              workflow: {
                select: workflowSelect,
              },
            },
          },
        },
      });
      const orgTeamWorkflows =
        teamWithWorkflows?.activeOrgWorkflows.map((workflowRel) => workflowRel.workflow) || [];
      allworkflows.push(...orgTeamWorkflows);
    }

    const activeOnAllOrgWorkflows = await prisma.workflow.findMany({
      where: {
        teamId: orgId,
        isActiveOnAll: true,
      },
      select: workflowSelect,
    });
    allworkflows.push(...activeOnAllOrgWorkflows);
  }

  if (userId) {
    const activeOnUserWorkflows = await prisma.workflow.findMany({
      where: {
        userId,
        isActiveOnAll: true,
      },
      select: workflowSelect,
    });
    allworkflows.push(...activeOnUserWorkflows);
  } else if (teamId) {
    const activeOnTeamWorkflows = await prisma.workflow.findMany({
      where: {
        teamId,
        isActiveOnAll: true,
      },
      select: workflowSelect,
    });
    allworkflows.push(...activeOnTeamWorkflows);
  }

  // now we need to remove all the duplicate workflows from activeOnWorkflows
  const seen = new Set();

  const workflows = allworkflows.filter((workflow) => {
    const duplicate = seen.has(workflow.id);
    seen.add(workflow.id);
    return !duplicate;
  });

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

const reminderMethods: { [x: string]: (id: number, referenceId: string | null) => void } = {
  [WorkflowMethods.EMAIL]: deleteScheduledEmailReminder,
  [WorkflowMethods.SMS]: deleteScheduledSMSReminder,
  [WorkflowMethods.WHATSAPP]: deleteScheduledWhatsappReminder,
};

export const cancelWorkflowReminders = async (
  workflowReminders: { method: WorkflowMethods; id: number; referenceId: string | null }[]
) => {
  await Promise.all(
    workflowReminders.map((reminder) => {
      return reminderMethods[reminder.method](reminder.id, reminder.referenceId);
    })
  );
};

export interface SendCancelledRemindersArgs {
  workflows: (WorkflowsOnEventTypes & {
    workflow: Workflow & {
      steps: WorkflowStep[];
    };
  })[];
  smsReminderNumber: string | null;
  evt: ExtendedCalendarEvent;
  hideBranding?: boolean;
}

export const sendCancelledReminders = async (args: SendCancelledRemindersArgs) => {
  const { workflows, smsReminderNumber, evt, hideBranding } = args;
  if (!workflows.length) return;

  for (const workflowRef of workflows) {
    const { workflow } = workflowRef;

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
