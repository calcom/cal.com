import { BookingSeatRepository } from "@calcom/features/bookings/repositories/BookingSeatRepository";
import type { CreditCheckFn } from "@calcom/features/ee/billing/credit-service";
import {
  isAttendeeAction,
  isSMSAction,
  isSMSOrWhatsappAction,
  isWhatsappAction,
  isCalAIAction,
} from "@calcom/features/ee/workflows/lib/actionHelperFunctions";
import { isEmailAction } from "@calcom/features/ee/workflows/lib/actionHelperFunctions";
import { EmailWorkflowService } from "@calcom/features/ee/workflows/lib/service/EmailWorkflowService";
import { WorkflowService } from "@calcom/features/ee/workflows/lib/service/WorkflowService";
import type { Workflow, WorkflowStep } from "@calcom/features/ee/workflows/lib/types";
import { WorkflowReminderRepository } from "@calcom/features/ee/workflows/repositories/WorkflowReminderRepository";
import { formatCalEventExtended } from "@calcom/lib/formatCalendarEvent";
import { withReporting } from "@calcom/lib/sentryWrapper";
import { getTranslation } from "@calcom/lib/server/i18n";
import { checkSMSRateLimit } from "@calcom/lib/smsLockState";
import { prisma } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import { WorkflowActions, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

import type { FormSubmissionData } from "../types";
import type { BookingInfo } from "../types";
import type { ScheduleTextReminderAction } from "./smsReminderManager";

export type WorkflowContextData =
  | { evt: BookingInfo; formData?: never }
  | {
      evt?: never;
      formData: FormSubmissionData;
    };

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

type ProcessWorkflowStepParams = (
  | { calendarEvent: ExtendedCalendarEvent; formData?: never }
  | {
      calendarEvent?: never;
      formData: FormSubmissionData;
    }
) & {
  smsReminderNumber: string | null;
  emailAttendeeSendToOverride?: string;
  hideBranding?: boolean;
  seatReferenceUid?: string;
};

export type ScheduleWorkflowRemindersArgs = ProcessWorkflowStepParams & {
  workflows: Workflow[];
  isDryRun?: boolean;
  creditCheckFn: CreditCheckFn;
};

const getReminderPhoneNumber = async (
  action: WorkflowActions,
  seatReferenceUid: string | undefined,
  smsReminderNumber: string | null,
  stepSendTo: string | null
) => {
  const isAttendeeAction =
    action === WorkflowActions.SMS_ATTENDEE || action === WorkflowActions.WHATSAPP_ATTENDEE;

  if (!isAttendeeAction) {
    return stepSendTo;
  }

  if (seatReferenceUid) {
    const bookingSeatRepository = new BookingSeatRepository(prisma);
    const seatAttendeeData = await bookingSeatRepository.getByReferenceUidWithAttendeeDetails(
      seatReferenceUid
    );
    return seatAttendeeData?.attendee?.phoneNumber || smsReminderNumber;
  }

  return smsReminderNumber;
};

const processWorkflowStep = async (
  workflow: Workflow,
  step: WorkflowStep,
  {
    smsReminderNumber,
    calendarEvent,
    emailAttendeeSendToOverride,
    hideBranding,
    seatReferenceUid,
    formData,
  }: ProcessWorkflowStepParams,
  creditCheckFn: CreditCheckFn
) => {
  if (!step?.verifiedAt) return;

  const evt = calendarEvent ? formatCalEventExtended(calendarEvent) : undefined;

  if (!evt && !formData) return;

  const contextData: WorkflowContextData = evt ? { evt } : { formData: formData as FormSubmissionData };

  if (isSMSOrWhatsappAction(step.action)) {
    await checkSMSRateLimit({
      identifier: `sms:${workflow.teamId ? "team:" : "user:"}${workflow.teamId || workflow.userId}`,
      rateLimitingType: "sms",
    });
  }

  // Common parameters for all scheduling functions
  const scheduleFunctionParams = WorkflowService.generateCommonScheduleFunctionParams({
    workflow,
    workflowStep: step,
    seatReferenceUid: seatReferenceUid,
    creditCheckFn,
  });

  if (isSMSAction(step.action)) {
    const { scheduleSMSReminder } = await import("./smsReminderManager");
    const sendTo = await getReminderPhoneNumber(
      step.action,
      seatReferenceUid,
      smsReminderNumber,
      step.sendTo
    );

    await scheduleSMSReminder({
      ...scheduleFunctionParams,
      reminderPhone: sendTo,
      action: step.action as ScheduleTextReminderAction,
      message: step.reminderBody || "",
      sender: step.sender,
      isVerificationPending: step.numberVerificationPending,
      ...contextData,
    });
  } else if (isEmailAction(step.action)) {
    const { scheduleEmailReminder } = await import("./emailReminderManager");
    if (!evt && step.action === WorkflowActions.EMAIL_HOST) {
      // EMAIL_HOST is not supported for form triggers
      return;
    }

    const workflowReminderRepository = new WorkflowReminderRepository(prisma);
    const bookingSeatRepository = new BookingSeatRepository(prisma);
    const emailWorkflowService = new EmailWorkflowService(workflowReminderRepository, bookingSeatRepository);
    const emailParams = await emailWorkflowService.generateParametersToBuildEmailWorkflowContent({
      evt,
      workflowStep: step,
      workflow,
      emailAttendeeSendToOverride,
      formData,
      commonScheduleFunctionParams: scheduleFunctionParams,
      hideBranding,
    });
    await scheduleEmailReminder(emailParams);
  } else if (isWhatsappAction(step.action)) {
    if (!evt) {
      // Whatsapp action not not yet supported for form triggers
      return;
    }

    const { scheduleWhatsappReminder } = await import("./whatsappReminderManager");
    const sendTo = await getReminderPhoneNumber(
      step.action,
      seatReferenceUid,
      smsReminderNumber,
      step.sendTo
    );

    await scheduleWhatsappReminder({
      ...scheduleFunctionParams,
      verifiedAt: step.verifiedAt,
      reminderPhone: sendTo,
      action: step.action as ScheduleTextReminderAction,
      message: step.reminderBody || "",
      isVerificationPending: step.numberVerificationPending,
      evt,
    });
  } else if (isCalAIAction(step.action)) {
    const { scheduleAIPhoneCall } = await import("./aiPhoneCallManager");
    await scheduleAIPhoneCall({
      triggerEvent: workflow.trigger,
      timeSpan: {
        time: workflow.time,
        timeUnit: workflow.timeUnit,
      },
      workflowStepId: step.id,
      userId: workflow.userId,
      teamId: workflow.teamId,
      seatReferenceUid,
      submittedPhoneNumber: smsReminderNumber,
      verifiedAt: step.verifiedAt,
      routedEventTypeId: formData ? formData.routedEventTypeId : null,
      ...contextData,
    });
  }
};

const _scheduleWorkflowReminders = async (args: ScheduleWorkflowRemindersArgs) => {
  const {
    workflows,
    smsReminderNumber,
    calendarEvent: evt,
    emailAttendeeSendToOverride = "",
    hideBranding,
    seatReferenceUid,
    isDryRun = false,
    formData,
    creditCheckFn,
  } = args;
  if (isDryRun || !workflows.length) return;

  for (const workflow of workflows) {
    if (workflow.steps.length === 0) continue;

    for (const step of workflow.steps) {
      if (
        // These tasks currently write the entire payload in the task
        (workflow.trigger === WorkflowTriggerEvents.BEFORE_EVENT ||
          workflow.trigger === WorkflowTriggerEvents.AFTER_EVENT) &&
        isEmailAction(step.action) &&
        evt
      ) {
        await WorkflowService.scheduleLazyEmailWorkflow({
          evt,
          workflowStepId: step.id,
          workflowTriggerEvent: workflow.trigger,
          workflow,
          seatReferenceId: args.seatReferenceUid,
        });
        continue;
      }

      await processWorkflowStep(
        workflow,
        step,
        {
          emailAttendeeSendToOverride,
          smsReminderNumber,
          hideBranding,
          seatReferenceUid,
          ...(evt ? { calendarEvent: evt } : { formData }),
        },
        creditCheckFn
      );
    }
  }
};

export interface SendCancelledRemindersArgs {
  workflows: Workflow[];
  smsReminderNumber: string | null;
  evt: ExtendedCalendarEvent;
  hideBranding?: boolean;
  creditCheckFn: CreditCheckFn;
}

const _sendCancelledReminders = async (args: SendCancelledRemindersArgs) => {
  const { smsReminderNumber, evt, workflows, hideBranding, creditCheckFn } = args;

  if (!workflows.length) return;

  for (const workflow of workflows) {
    if (workflow.trigger !== WorkflowTriggerEvents.EVENT_CANCELLED) continue;

    for (const step of workflow.steps) {
      await processWorkflowStep(
        workflow,
        step,
        {
          smsReminderNumber,
          hideBranding,
          calendarEvent: evt,
        },
        creditCheckFn
      );
    }
  }
};

const _cancelScheduledMessagesAndScheduleEmails = async ({
  teamId,
  userIdsWithNoCredits,
}: {
  teamId?: number | null;
  userIdsWithNoCredits: number[];
}) => {
  const { WorkflowReminderRepository } = await import(
    "@calcom/features/ee/workflows/repositories/WorkflowReminderRepository"
  );

  const workflowReminderRepository = new WorkflowReminderRepository(prisma);
  const scheduledMessages = await workflowReminderRepository.findScheduledMessagesToCancel({
    teamId,
    userIdsWithNoCredits,
  });

  const [twilio, { sendOrScheduleWorkflowEmails }] = await Promise.all([
    import("./providers/twilioProvider"),
    import("./providers/emailProvider"),
  ]);

  await Promise.allSettled(scheduledMessages.map((msg) => twilio.cancelSMS(msg.referenceId ?? "")));

  await Promise.allSettled(
    scheduledMessages.map(async (msg) => {
      if (msg.workflowStep?.action && isAttendeeAction(msg.workflowStep.action)) {
        const messageBody = await twilio.getMessageBody(msg.referenceId ?? "");
        const sendTo = msg.booking?.attendees?.[0];

        if (sendTo) {
          const t = await getTranslation(sendTo.locale ?? "en", "common");
          await sendOrScheduleWorkflowEmails({
            to: [sendTo.email],
            subject: t("notification_about_your_booking"),
            html: messageBody,
            replyTo: msg.booking?.user?.email ?? "",
            sendAt: msg.scheduledDate,
            referenceUid: msg.uuid || undefined,
          });
        }
      }
    })
  );

  await workflowReminderRepository.updateRemindersToEmail({
    reminderIds: scheduledMessages.map((msg) => msg.id),
  });
};
// Export functions wrapped with withReporting
export const scheduleWorkflowReminders = withReporting(
  _scheduleWorkflowReminders,
  "scheduleWorkflowReminders"
);
export const sendCancelledReminders = withReporting(_sendCancelledReminders, "sendCancelledReminders");
export const cancelScheduledMessagesAndScheduleEmails = withReporting(
  _cancelScheduledMessagesAndScheduleEmails,
  "cancelScheduledMessagesAndScheduleEmails"
);
