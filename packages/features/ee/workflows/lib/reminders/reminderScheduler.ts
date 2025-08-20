import {
  isAttendeeAction,
  isSMSAction,
  isSMSOrWhatsappAction,
  isWhatsappAction,
} from "@calcom/features/ee/workflows/lib/actionHelperFunctions";
import { sendOrScheduleWorkflowEmails } from "@calcom/features/ee/workflows/lib/reminders/providers/emailProvider";
import * as twilio from "@calcom/features/ee/workflows/lib/reminders/providers/twilioProvider";
import type { Workflow, WorkflowStep } from "@calcom/features/ee/workflows/lib/types";
import { checkSMSRateLimit } from "@calcom/lib/checkRateLimitAndThrowError";
import { SENDER_NAME } from "@calcom/lib/constants";
import { withReporting } from "@calcom/lib/sentryWrapper";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import { WorkflowActions, WorkflowMethods, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { scheduleEmailReminder } from "./emailReminderManager";
import { scheduleSMSReminder } from "./smsReminderManager";
import type { ScheduleTextReminderAction } from "./smsReminderManager";
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
  if (!step?.verifiedAt) return;

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
      verifiedAt: step.verifiedAt,
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
          const user = await prisma.user.findUnique({
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
      verifiedAt: step.verifiedAt,
      userId: workflow.userId,
      teamId: workflow.teamId,
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
      verifiedAt: step.verifiedAt,
    });
  }
};

const _scheduleWorkflowReminders = async (args: ScheduleWorkflowRemindersArgs) => {
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
