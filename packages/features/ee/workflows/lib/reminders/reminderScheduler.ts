import type { Workflow, WorkflowsOnEventTypes, WorkflowStep } from "@prisma/client";

import {
  isTextMessageToAttendeeAction,
  isWhatsappAction,
} from "@calcom/features/ee/workflows/lib/actionHelperFunctions";
import { SENDER_ID, SENDER_NAME } from "@calcom/lib/constants";
import { WorkflowActions, WorkflowMethods, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { deleteScheduledEmailReminder, scheduleEmailReminder } from "./emailReminderManager";
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
  isKYCVerified: boolean;
  eventTypeRequiresConfirmation?: boolean;
};

export interface ScheduleWorkflowRemindersArgs extends ProcessWorkflowStepParams {
  workflows: (WorkflowsOnEventTypes & {
    workflow: Workflow & {
      steps: WorkflowStep[];
    };
  })[];
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
    eventTypeRequiresConfirmation,
    isKYCVerified,
  }: ProcessWorkflowStepParams
) => {
  if (isTextMessageToAttendeeAction(step.action) && (!isKYCVerified || !eventTypeRequiresConfirmation))
    return;

  if (step.action === WorkflowActions.SMS_ATTENDEE || step.action === WorkflowActions.SMS_NUMBER) {
    const sendTo = step.action === WorkflowActions.SMS_ATTENDEE ? smsReminderNumber : step.sendTo;
    await scheduleSMSReminder(
      evt,
      sendTo,
      workflow.trigger,
      step.action,
      {
        time: workflow.time,
        timeUnit: workflow.timeUnit,
      },
      step.reminderBody || "",
      step.id,
      step.template,
      step.sender || SENDER_ID,
      workflow.userId,
      workflow.teamId,
      step.numberVerificationPending,
      seatReferenceUid
    );
  } else if (step.action === WorkflowActions.EMAIL_ATTENDEE || step.action === WorkflowActions.EMAIL_HOST) {
    let sendTo: string[] = [];

    switch (step.action) {
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

    await scheduleEmailReminder(
      evt,
      workflow.trigger,
      step.action,
      {
        time: workflow.time,
        timeUnit: workflow.timeUnit,
      },
      sendTo,
      step.emailSubject || "",
      step.reminderBody || "",
      step.id,
      step.template,
      step.sender || SENDER_NAME,
      hideBranding,
      seatReferenceUid,
      step.includeCalendarEvent
    );
  } else if (isWhatsappAction(step.action)) {
    const sendTo = step.action === WorkflowActions.WHATSAPP_ATTENDEE ? smsReminderNumber : step.sendTo;
    await scheduleWhatsappReminder(
      evt,
      sendTo,
      workflow.trigger,
      step.action,
      {
        time: workflow.time,
        timeUnit: workflow.timeUnit,
      },
      step.reminderBody || "",
      step.id,
      step.template,
      workflow.userId,
      workflow.teamId,
      step.numberVerificationPending,
      seatReferenceUid
    );
  }
};

export const scheduleWorkflowReminders = async (args: ScheduleWorkflowRemindersArgs) => {
  const {
    workflows,
    smsReminderNumber,
    calendarEvent: evt,
    isNotConfirmed = false,
    isRescheduleEvent = false,
    isFirstRecurringEvent = false,
    emailAttendeeSendToOverride = "",
    hideBranding,
    seatReferenceUid,
    eventTypeRequiresConfirmation = false,
    isKYCVerified,
  } = args;
  if (isNotConfirmed || !workflows.length) return;

  for (const workflowReference of workflows) {
    if (workflowReference.workflow.steps.length === 0) continue;

    const workflow = workflowReference.workflow;
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
        eventTypeRequiresConfirmation,
        isKYCVerified,
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
  isKYCVerified: boolean;
  eventTypeRequiresConfirmation?: boolean;
}

export const sendCancelledReminders = async (args: SendCancelledRemindersArgs) => {
  const { workflows, smsReminderNumber, evt, hideBranding, isKYCVerified, eventTypeRequiresConfirmation } =
    args;
  if (!workflows.length) return;

  for (const workflowRef of workflows) {
    const { workflow } = workflowRef;

    if (workflow.trigger !== WorkflowTriggerEvents.EVENT_CANCELLED) continue;

    for (const step of workflow.steps) {
      processWorkflowStep(workflow, step, {
        smsReminderNumber,
        hideBranding,
        calendarEvent: evt,
        eventTypeRequiresConfirmation,
        isKYCVerified,
      });
    }
  }
};
