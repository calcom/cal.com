import type { TFunction } from "i18next";

import type { CreditCheckFn } from "@calcom/features/ee/billing/credit-service";
import { sendOrScheduleWorkflowEmails } from "@calcom/features/ee/workflows/lib/reminders/providers/emailProvider";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { WorkflowMethods } from "@calcom/prisma/enums";

import * as twilio from "./providers/twilioProvider";

const log = logger.getSubLogger({ prefix: ["[reminderScheduler]"] });

export async function sendSmsOrFallbackEmail(props: {
  twilioData: {
    phoneNumber: string;
    body: string;
    sender: string;
    bodyWithoutOptOut?: string;
    bookingUid?: string | null;
    userId?: number | null;
    teamId?: number | null;
    isWhatsapp?: boolean;
    contentSid?: string;
    contentVariables?: Record<string, string>;
  };
  fallbackData?: {
    email: string;
    t: TFunction;
    replyTo: string;
  };
  creditCheckFn: CreditCheckFn;
}) {
  const { userId, teamId } = props.twilioData;

  const hasCredits = await props.creditCheckFn({ userId, teamId });

  if (!hasCredits) {
    const { fallbackData, twilioData } = props;
    if (fallbackData) {
      await sendOrScheduleWorkflowEmails({
        to: [fallbackData.email],
        subject: fallbackData.t("notification_about_your_booking"),
        html: twilioData.bodyWithoutOptOut || twilioData.body,
        replyTo: fallbackData.replyTo,
      });
    }

    log.debug(
      `SMS not sent because ${teamId ? `Team id ${teamId} ` : `User id ${userId} `} has no available credits`
    );
    return;
  }

  await twilio.sendSMS(props.twilioData);
}

export async function scheduleSmsOrFallbackEmail(props: {
  twilioData: {
    phoneNumber: string;
    body: string;
    scheduledDate: Date;
    sender: string;
    bodyWithoutOptOut?: string;
    bookingUid?: string | null;
    userId?: number | null;
    teamId?: number | null;
    isWhatsapp?: boolean;
    contentSid?: string;
    contentVariables?: Record<string, string>;
  };
  fallbackData?: {
    email: string;
    t: TFunction;
    replyTo: string;
    workflowStepId?: number;
  };
  creditCheckFn: CreditCheckFn;
}) {
  const { userId, teamId } = props.twilioData;

  const hasCredits = await props.creditCheckFn({ userId, teamId });

  if (!hasCredits) {
    const { fallbackData, twilioData } = props;
    if (fallbackData) {
      const reminder = await prisma.workflowReminder.create({
        data: {
          bookingUid: twilioData.bookingUid,
          workflowStepId: fallbackData.workflowStepId,
          method: WorkflowMethods.EMAIL,
          scheduledDate: twilioData.scheduledDate,
          scheduled: true,
        },
      });

      await sendOrScheduleWorkflowEmails({
        to: [fallbackData.email],
        subject: fallbackData.t("notification_about_your_booking"),
        html: twilioData.bodyWithoutOptOut || twilioData.body,
        replyTo: fallbackData.replyTo,
        sendAt: twilioData.scheduledDate,
        referenceUid: reminder.uuid || undefined,
      });
      return { emailReminderId: reminder.id, sid: null };
    }

    log.debug(
      `SMS not sent because ${teamId ? `Team id ${teamId} ` : `User id ${userId} `} has no available credits`
    );
    return null;
  }
  const scheduledSMS = await twilio.scheduleSMS(props.twilioData);
  return scheduledSMS?.sid ? { emailReminderId: null, sid: scheduledSMS.sid } : null;
}
