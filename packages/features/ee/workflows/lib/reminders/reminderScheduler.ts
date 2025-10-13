import type { FORM_SUBMITTED_WEBHOOK_RESPONSES } from "@calcom/app-store/routing-forms/lib/formSubmissionUtils";
import {
  isAttendeeAction,
  isSMSAction,
  isSMSOrWhatsappAction,
  isWhatsappAction,
  isCalAIAction,
} from "@calcom/features/ee/workflows/lib/actionHelperFunctions";
import { sendOrScheduleWorkflowEmails } from "@calcom/features/ee/workflows/lib/reminders/providers/emailProvider";
import * as twilio from "@calcom/features/ee/workflows/lib/reminders/providers/twilioProvider";
import type { Workflow, WorkflowStep } from "@calcom/features/ee/workflows/lib/types";
import { getSubmitterEmail } from "@calcom/features/tasker/tasks/triggerFormSubmittedNoEvent/formSubmissionValidation";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { checkSMSRateLimit } from "@calcom/lib/checkRateLimitAndThrowError";
import { SENDER_NAME } from "@calcom/lib/constants";
import { formatCalEventExtended } from "@calcom/lib/formatCalendarEvent";
import { withReporting } from "@calcom/lib/sentryWrapper";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import { WorkflowActions, WorkflowMethods, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { scheduleAIPhoneCall } from "./aiPhoneCallManager";
import { scheduleEmailReminder } from "./emailReminderManager";
import type { BookingInfo } from "./smsReminderManager";
import { scheduleSMSReminder, type ScheduleTextReminderAction } from "./smsReminderManager";
import { scheduleWhatsappReminder } from "./whatsappReminderManager";

export type FormSubmissionData = {
  responses: FORM_SUBMITTED_WEBHOOK_RESPONSES;
  user: {
    email: string;
    timeFormat: number | null;
    locale: string;
  };
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
  }: ProcessWorkflowStepParams
) => {
  if (!step?.verifiedAt) return;

  const evt = calendarEvent ? formatCalEventExtended(calendarEvent) : undefined;

  if (!evt && !formData) return;

  const contextData:
    | { evt: BookingInfo; formData?: never }
    | {
        evt?: never;
        formData: FormSubmissionData;
      } = evt ? { evt } : { formData: formData as FormSubmissionData };

  if (isSMSOrWhatsappAction(step.action)) {
    await checkSMSRateLimit({
      identifier: `sms:${workflow.teamId ? "team:" : "user:"}${workflow.teamId || workflow.userId}`,
      rateLimitingType: "sms",
    });
  }

  // Common parameters for all scheduling functions
  const scheduleFunctionParams = {
    triggerEvent: workflow.trigger,
    timeSpan: {
      time: workflow.time,
      timeUnit: workflow.timeUnit,
    },
    workflowStepId: step.id,
    template: step.template,
    userId: workflow.userId,
    teamId: workflow.teamId,
    seatReferenceUid,
    verifiedAt: step.verifiedAt,
  };

  if (isSMSAction(step.action)) {
    if (!evt) {
      // SMS action not not yet supported for form triggers
      return;
    }
    const sendTo = step.action === WorkflowActions.SMS_ATTENDEE ? smsReminderNumber : step.sendTo;

    await scheduleSMSReminder({
      ...scheduleFunctionParams,
      reminderPhone: sendTo,
      action: step.action as ScheduleTextReminderAction,
      message: step.reminderBody || "",
      sender: step.sender,
      isVerificationPending: step.numberVerificationPending,
      evt,
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
      case WorkflowActions.EMAIL_HOST: {
        if (!evt) {
          // EMAIL_HOST is not supported for form triggers
          return;
        }

        sendTo = [evt.organizer?.email || ""];

        const schedulingType = evt.eventType.schedulingType;
        const isTeamEvent =
          schedulingType === SchedulingType.ROUND_ROBIN || schedulingType === SchedulingType.COLLECTIVE;
        if (isTeamEvent && evt.team?.members) {
          sendTo = sendTo.concat(evt.team.members.map((member) => member.email));
        }
        break;
      }
      case WorkflowActions.EMAIL_ATTENDEE:
        if (evt) {
          const attendees = emailAttendeeSendToOverride
            ? [emailAttendeeSendToOverride]
            : evt.attendees?.map((attendee) => attendee.email);

          const limitGuestsDate = new Date("2025-01-13");

          if (workflow.userId) {
            const userRepository = new UserRepository(prisma);
            const user = await userRepository.findById({ id: workflow.userId });
            if (user?.createdDate && user.createdDate > limitGuestsDate) {
              sendTo = attendees.slice(0, 1);
            } else {
              sendTo = attendees;
            }
          } else {
            sendTo = attendees;
          }
        }

        if (formData) {
          const submitterEmail = getSubmitterEmail(formData.responses);
          if (submitterEmail) {
            sendTo = [submitterEmail];
          }
        }
    }

    const emailParams = {
      ...scheduleFunctionParams,
      action: step.action,
      sendTo,
      emailSubject: step.emailSubject || "",
      emailBody: step.reminderBody || "",
      sender: step.sender || SENDER_NAME,
      hideBranding,
      includeCalendarEvent: step.includeCalendarEvent,
      ...contextData,
      verifiedAt: step.verifiedAt,
    } as const;

    await scheduleEmailReminder(emailParams);
  } else if (isWhatsappAction(step.action)) {
    if (!evt) {
      // Whatsapp action not not yet supported for form triggers
      return;
    }

    const sendTo = step.action === WorkflowActions.WHATSAPP_ATTENDEE ? smsReminderNumber : step.sendTo;

    await scheduleWhatsappReminder({
      ...scheduleFunctionParams,
      reminderPhone: sendTo,
      action: step.action as ScheduleTextReminderAction,
      message: step.reminderBody || "",
      isVerificationPending: step.numberVerificationPending,
      evt,
    });
  } else if (isCalAIAction(step.action)) {
    if (!evt) {
      // cal.ai not yet supported for form triggers
      return;
    }
    await scheduleAIPhoneCall({
      evt,
      triggerEvent: workflow.trigger,
      timeSpan: {
        time: workflow.time,
        timeUnit: workflow.timeUnit,
      },
      workflowStepId: step.id,
      userId: workflow.userId,
      teamId: workflow.teamId,
      seatReferenceUid,
      verifiedAt: step.verifiedAt,
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
  } = args;
  if (isDryRun || !workflows.length) return;

  for (const workflow of workflows) {
    if (workflow.steps.length === 0) continue;

    for (const step of workflow.steps) {
      await processWorkflowStep(workflow, step, {
        emailAttendeeSendToOverride,
        smsReminderNumber,
        hideBranding,
        seatReferenceUid,
        ...(evt ? { calendarEvent: evt } : { formData }),
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

const _sendCancelledReminders = async (args: SendCancelledRemindersArgs) => {
  const { smsReminderNumber, evt, workflows, hideBranding } = args;

  if (!workflows.length) return;

  for (const workflow of workflows) {
    if (workflow.trigger !== WorkflowTriggerEvents.EVENT_CANCELLED) continue;

    for (const step of workflow.steps) {
      await processWorkflowStep(workflow, step, {
        smsReminderNumber,
        hideBranding,
        calendarEvent: evt,
      });
    }
  }
};

const _cancelScheduledMessagesAndScheduleEmails = async ({
  teamId,
  userId,
}: {
  teamId?: number | null;
  userId?: number | null;
}) => {
  const { CreditService } = await import("@calcom/features/ee/billing/credit-service");

  let userIdsWithNoCredits: number[] = userId ? [userId] : [];

  if (teamId) {
    const teamMembers = await prisma.membership.findMany({
      where: {
        teamId,
        accepted: true,
      },
    });

    const creditService = new CreditService();

    userIdsWithNoCredits = (
      await Promise.all(
        teamMembers.map(async (member) => {
          const hasCredits = await creditService.hasAvailableCredits({ userId: member.userId });
          return { userId: member.userId, hasCredits };
        })
      )
    )
      .filter(({ hasCredits }) => !hasCredits)
      .map(({ userId }) => userId);
  }

  const scheduledMessages = await prisma.workflowReminder.findMany({
    where: {
      workflowStep: {
        workflow: {
          OR: [
            {
              userId: {
                in: userIdsWithNoCredits,
              },
            },
            ...(teamId ? [{ teamId }] : []),
          ],
        },
      },
      scheduled: true,
      OR: [{ cancelled: false }, { cancelled: null }],
      referenceId: {
        not: null,
      },
      method: {
        in: [WorkflowMethods.SMS, WorkflowMethods.WHATSAPP],
      },
    },
    select: {
      referenceId: true,
      workflowStep: {
        select: {
          action: true,
        },
      },
      scheduledDate: true,
      uuid: true,
      id: true,
      booking: {
        select: {
          attendees: {
            select: {
              email: true,
              locale: true,
            },
          },
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  });

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

  await prisma.workflowReminder.updateMany({
    where: {
      id: {
        in: scheduledMessages.map((msg) => msg.id),
      },
    },
    data: {
      method: WorkflowMethods.EMAIL,
      referenceId: null,
    },
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
