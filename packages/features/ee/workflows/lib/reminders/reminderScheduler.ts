import type { Workflow, WorkflowsOnEventTypes, WorkflowStep } from "@prisma/client";
import { WorkflowActions, WorkflowTriggerEvents } from "@prisma/client";
import type { MailData } from "@sendgrid/helpers/classes/mail";

import { SENDER_ID, SENDER_NAME } from "@calcom/lib/constants";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { scheduleEmailReminder } from "./emailReminderManager";
import { scheduleSMSReminder } from "./smsReminderManager";

type ExtendedCalendarEvent = CalendarEvent & {
  metadata?: { videoCallUrl: string | undefined };
  eventType: { slug?: string };
};

export interface ScheduleWorkflowRemindersArgs {
  workflows: (WorkflowsOnEventTypes & {
    workflow: Workflow & {
      steps: WorkflowStep[];
    };
  })[];
  smsReminderNumber: string | null;
  calendarEvent: ExtendedCalendarEvent;
  requiresConfirmation?: boolean;
  isRescheduleEvent?: boolean;
  isFirstRecurringEvent?: boolean;
  emailAttendeeSendToOverride?: string;
  hideBranding?: boolean;
}

export const scheduleWorkflowReminders = async (args: ScheduleWorkflowRemindersArgs) => {
  const {
    workflows,
    smsReminderNumber,
    calendarEvent: evt,
    requiresConfirmation = false,
    isRescheduleEvent = false,
    isFirstRecurringEvent = false,
    emailAttendeeSendToOverride = "",
    hideBranding,
  } = args;
  if (workflows.length > 0 && !requiresConfirmation) {
    for (const workflowReference of workflows) {
      if (workflowReference.workflow.steps.length === 0) continue;

      const workflow = workflowReference.workflow;
      if (
        workflow.trigger === WorkflowTriggerEvents.BEFORE_EVENT ||
        (workflow.trigger === WorkflowTriggerEvents.NEW_EVENT &&
          !isRescheduleEvent &&
          isFirstRecurringEvent) ||
        (workflow.trigger === WorkflowTriggerEvents.RESCHEDULE_EVENT && isRescheduleEvent) ||
        workflow.trigger === WorkflowTriggerEvents.AFTER_EVENT
      ) {
        for (const step of workflow.steps) {
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
              step.numberVerificationPending
            );
          } else if (
            step.action === WorkflowActions.EMAIL_ATTENDEE ||
            step.action === WorkflowActions.EMAIL_HOST
          ) {
            let sendTo = "";

            switch (step.action) {
              case WorkflowActions.EMAIL_HOST:
                sendTo = evt.organizer?.email || "";
                break;
              case WorkflowActions.EMAIL_ATTENDEE:
                sendTo = !!emailAttendeeSendToOverride
                  ? emailAttendeeSendToOverride
                  : evt.attendees?.[0]?.email || "";
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
              hideBranding
            );
          }
        }
      }
    }
  }
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

  if (workflows.length > 0) {
    for (const workflowRef of workflows) {
      const { workflow } = workflowRef;

      if (workflow.trigger === WorkflowTriggerEvents.EVENT_CANCELLED) {
        for (const step of workflow.steps) {
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
              step.numberVerificationPending
            );
          } else if (
            step.action === WorkflowActions.EMAIL_ATTENDEE ||
            step.action === WorkflowActions.EMAIL_HOST
          ) {
            let sendTo: MailData["to"] = "";

            switch (step.action) {
              case WorkflowActions.EMAIL_HOST:
                sendTo = evt.organizer.email;
                break;
              case WorkflowActions.EMAIL_ATTENDEE:
                sendTo = evt.attendees.map((a) => a.email);
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
              hideBranding
            );
          }
        }
      }
    }
  }
};
