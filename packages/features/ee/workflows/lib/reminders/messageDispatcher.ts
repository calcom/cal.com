import type { TFunction } from "i18next";

import { CreditService } from "@calcom/features/ee/billing/credit-service";
import logger from "@calcom/lib/logger";

import * as twilio from "./providers/twilioProvider";

const log = logger.getSubLogger({ prefix: ["[reminderScheduler]"] });

export async function sendSmsOrFallbackEmail(props: {
  twilioData: {
    phoneNumber: string;
    body: string;
    sender: string;
    bookingUid?: string | null;
    userId?: number | null;
    teamId?: number | null;
    isWhatsapp?: boolean;
  };
  fallbackData?: {
    email: string;
    t: TFunction;
    replyTo: string;
  };
}) {
  const { userId, teamId } = props.twilioData;

  const creditService = new CreditService();

  const hasCredits = await creditService.hasAvailableCredits({ userId, teamId });

  if (!hasCredits) {
    if (props.fallbackData) {
      // todo: send email instead
      // todo create workflow reminder in db
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
    bookingUid: string;
    userId?: number | null;
    teamId?: number | null;
    isWhatsapp?: boolean;
  };
  fallbackData?: {
    email: string;
    t: TFunction;
    replyTo: string;
  };
}) {
  const { userId, teamId } = props.twilioData;

  const creditService = new CreditService();

  const hasCredits = await creditService.hasAvailableCredits({ userId, teamId });

  if (!hasCredits) {
    if (props.fallbackData) {
      // todo: schedule email instead
      // todo create workflow reminder in db
    }

    log.debug(
      `SMS not sent because ${teamId ? `Team id ${teamId} ` : `User id ${userId} `} has no available credits`
    );
    return;
  }
  return await twilio.scheduleSMS(props.twilioData);
}
