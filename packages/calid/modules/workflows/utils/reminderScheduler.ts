import {
  isSMSAction,
  isSMSOrWhatsappAction,
  isWhatsappAction,
} from "@calid/features/modules/workflows/config/utils";

import { checkSMSRateLimit } from "@calcom/lib/checkRateLimitAndThrowError";
import { SENDER_NAME } from "@calcom/lib/constants";
import { SchedulingType, WorkflowActions, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

import type {
  CalIdScheduleTextReminderAction,
  CalIdScheduleEmailReminderAction,
  CalIdWorkflow,
  CalIdWorkflowStep,
} from "../config/types";
import { scheduleEmailReminder } from "../managers/emailManager";
import { scheduleSMSReminder } from "../managers/smsManager";
import { scheduleWhatsappReminder } from "../managers/whatsappManager";

export type ExtendedCalendarEvent = Omit<CalendarEvent, "bookerUrl"> & {
  metadata?: { videoCallUrl: string | undefined };
  eventType: {
    slug: string;
    schedulingType?: SchedulingType | null;
    hosts?: { user: { email: string; destinationCalendar?: { primaryEmail: string | null } | null } }[];
    title?: string;
    id?: number;
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
  workflows: CalIdWorkflow[];
  isNotConfirmed?: boolean;
  isRescheduleEvent?: boolean;
  isFirstRecurringEvent?: boolean;
  isDryRun?: boolean;
}

const executeStepLogic = async (
  workflowConfig: CalIdWorkflow,
  stepConfig: CalIdWorkflowStep,
  {
    smsReminderNumber,
    calendarEvent: eventData,
    emailAttendeeSendToOverride,
    hideBranding,
    seatReferenceUid,
  }: ProcessWorkflowStepParams
) => {
  console.log("reminderScheduler");
  const requiresRateLimiting = isSMSOrWhatsappAction(stepConfig.action);

  if (requiresRateLimiting) {
    const rateLimitKey = workflowConfig.calIdTeamId
      ? `sms:team:${workflowConfig.calIdTeamId}`
      : `sms:user:${workflowConfig.userId}`;

    await checkSMSRateLimit({
      identifier: rateLimitKey,
      rateLimitingType: "sms",
    });
  }

  const isTextMessage = isSMSAction(stepConfig.action);

  if (isTextMessage) {
    const recipientNumber =
      stepConfig.action === WorkflowActions.SMS_ATTENDEE ? smsReminderNumber : stepConfig.sendTo;

    await scheduleSMSReminder({
      evt: eventData,
      reminderPhone: recipientNumber,
      triggerEvent: workflowConfig.trigger,
      action: stepConfig.action as CalIdScheduleTextReminderAction,
      timeSpan: {
        time: workflowConfig.time,
        timeUnit: workflowConfig.timeUnit,
      },
      message: stepConfig.reminderBody || "",
      workflowStepId: stepConfig.id,
      template: stepConfig.template,
      sender: stepConfig.sender,
      userId: workflowConfig.userId,
      calIdTeamId: workflowConfig.calIdTeamId,
      isVerificationPending: stepConfig.numberVerificationPending,
      seatReferenceUid,
    });

    return;
  }

  const emailActions: WorkflowActions[] = [
    WorkflowActions.EMAIL_ATTENDEE,
    WorkflowActions.EMAIL_HOST,
    WorkflowActions.EMAIL_ADDRESS,
  ];

  const isEmailAction = emailActions.includes(stepConfig.action);

  if (isEmailAction) {
    let recipients: string[] = [];

    if (stepConfig.action === WorkflowActions.EMAIL_ADDRESS) {
      recipients = [stepConfig.sendTo || ""];
    } else if (stepConfig.action === WorkflowActions.EMAIL_HOST) {
      recipients = [eventData.organizer?.email || ""];

      const eventSchedulingType = eventData.eventType.schedulingType;
      const teamEventTypes: SchedulingType[] = [SchedulingType.ROUND_ROBIN, SchedulingType.COLLECTIVE];
      const isTeamBasedEvent = teamEventTypes.includes(eventSchedulingType as SchedulingType);

      if (isTeamBasedEvent && eventData.team?.members) {
        const memberEmails = eventData.team.members.map((member) => member.email);
        recipients = [...recipients, ...memberEmails];
      }
    } else if (stepConfig.action === WorkflowActions.EMAIL_ATTENDEE) {
      recipients = emailAttendeeSendToOverride
        ? [emailAttendeeSendToOverride]
        : eventData.attendees?.map((attendee) => attendee.email) || [];
    }

    const isPostEventAttendeeEmail =
      workflowConfig.trigger === WorkflowTriggerEvents.AFTER_EVENT &&
      stepConfig.action === WorkflowActions.EMAIL_ATTENDEE;

    if (isPostEventAttendeeEmail) {
      const emailTasks = eventData.attendees.map((participant) => {
        const { email: recipientEmail, id: participantId } = participant;

        return scheduleEmailReminder({
          evt: eventData,
          triggerEvent: workflowConfig.trigger,
          action: WorkflowActions.EMAIL_ATTENDEE,
          timeSpan: {
            time: workflowConfig.time,
            timeUnit: workflowConfig.timeUnit,
          },
          sendTo: [recipientEmail],
          emailSubject: stepConfig.emailSubject || "",
          emailBody: stepConfig.reminderBody || "",
          template: stepConfig.template,
          sender: stepConfig.sender || SENDER_NAME,
          workflowStepId: stepConfig.id,
          hideBranding,
          seatReferenceUid,
          includeCalendarEvent: stepConfig.includeCalendarEvent,
          attendeeId: participantId,
          // verifiedAt: stepConfig.verifiedAt,
          // userId: workflowConfig.userId,
          // teamId: workflowConfig.teamId,
        });
      });

      await Promise.all(emailTasks);
    } else {
      await scheduleEmailReminder({
        evt: eventData,
        triggerEvent: workflowConfig.trigger,
        action: stepConfig.action as CalIdScheduleEmailReminderAction,
        timeSpan: {
          time: workflowConfig.time,
          timeUnit: workflowConfig.timeUnit,
        },
        sendTo: recipients,
        emailSubject: stepConfig.emailSubject || "",
        emailBody: stepConfig.reminderBody || "",
        template: stepConfig.template,
        sender: stepConfig.sender || SENDER_NAME,
        workflowStepId: stepConfig.id,
        hideBranding,
        seatReferenceUid,
        includeCalendarEvent: stepConfig.includeCalendarEvent,
        // verifiedAt: stepConfig.verifiedAt,
        // userId: workflowConfig.userId,
        // teamId: workflowConfig.teamId,
      });
    }

    return;
  }

  const isWhatsapp = isWhatsappAction(stepConfig.action);

  if (isWhatsapp) {
    const whatsappRecipient =
      stepConfig.action === WorkflowActions.WHATSAPP_ATTENDEE ? smsReminderNumber : stepConfig.sendTo;

    await scheduleWhatsappReminder({
      evt: eventData,
      workflow: workflowConfig,
      reminderPhone: whatsappRecipient,
      triggerEvent: workflowConfig.trigger,
      action: stepConfig.action as CalIdScheduleTextReminderAction,
      timeSpan: {
        time: workflowConfig.time,
        timeUnit: workflowConfig.timeUnit,
      },
      message: stepConfig.reminderBody || "",
      workflowStepId: stepConfig.id,
      template: stepConfig.template,
      userId: workflowConfig.userId,
      calIdTeamId: workflowConfig.calIdTeamId,
      isVerificationPending: stepConfig.numberVerificationPending,
      seatReferenceUid,
      metaTemplateName: stepConfig.metaTemplateName,
      metaPhoneNumberId: stepConfig.metaTemplatePhoneNumberId,
    });
  }
};

export const scheduleWorkflowReminders = async (args: ScheduleWorkflowRemindersArgs) => {
  const {
    workflows,
    smsReminderNumber,
    calendarEvent: eventData,
    isNotConfirmed = false,
    isRescheduleEvent = false,
    isFirstRecurringEvent = true,
    emailAttendeeSendToOverride = "",
    hideBranding,
    seatReferenceUid,
    isDryRun = false,
  } = args;

  if (isDryRun) return;
  const shouldSkipProcessing = isNotConfirmed || workflows.length === 0;

  if (shouldSkipProcessing) return;

  const workflowIterator = workflows[Symbol.iterator]();
  let currentWorkflow = workflowIterator.next();

  while (!currentWorkflow.done) {
    const workflowInstance = currentWorkflow.value;

    if (workflowInstance.steps.length === 0) {
      currentWorkflow = workflowIterator.next();
      continue;
    }

    const isTimedTrigger = (
      [WorkflowTriggerEvents.BEFORE_EVENT, WorkflowTriggerEvents.AFTER_EVENT] as WorkflowTriggerEvents[]
    ).includes(workflowInstance.trigger);

    const isNewEventTrigger =
      workflowInstance.trigger === WorkflowTriggerEvents.NEW_EVENT &&
      !isRescheduleEvent &&
      isFirstRecurringEvent;

    const isRescheduleTrigger =
      workflowInstance.trigger === WorkflowTriggerEvents.RESCHEDULE_EVENT && isRescheduleEvent;

    const shouldExecuteWorkflow = isTimedTrigger || isNewEventTrigger || isRescheduleTrigger;

    if (!shouldExecuteWorkflow) {
      currentWorkflow = workflowIterator.next();
      continue;
    }

    const stepIterator = workflowInstance.steps[Symbol.iterator]();

    let currentStep = stepIterator.next();

    while (!currentStep.done) {
      await executeStepLogic(workflowInstance, currentStep.value, {
        calendarEvent: eventData,
        emailAttendeeSendToOverride,
        smsReminderNumber,
        hideBranding,
        seatReferenceUid,
      });

      currentStep = stepIterator.next();
    }

    currentWorkflow = workflowIterator.next();
  }
};

export interface SendCancelledRemindersArgs {
  workflows: CalIdWorkflow[];
  smsReminderNumber: string | null;
  evt: ExtendedCalendarEvent;
  hideBranding?: boolean;
}

export const sendCancelledReminders = async (args: SendCancelledRemindersArgs) => {
  const { smsReminderNumber, evt: eventData, workflows, hideBranding } = args;

  const hasWorkflows = workflows.length > 0;

  if (!hasWorkflows) return;

  let workflowIndex = 0;

  while (workflowIndex < workflows.length) {
    const currentWorkflow = workflows[workflowIndex];

    const isCancellationTrigger = currentWorkflow.trigger === WorkflowTriggerEvents.EVENT_CANCELLED;

    if (!isCancellationTrigger) {
      workflowIndex++;
      continue;
    }

    let stepIndex = 0;

    while (stepIndex < currentWorkflow.steps.length) {
      const currentStep = currentWorkflow.steps[stepIndex];

      executeStepLogic(currentWorkflow, currentStep, {
        smsReminderNumber,
        hideBranding,
        calendarEvent: eventData,
      });

      stepIndex++;
    }

    workflowIndex++;
  }
};
