import TwilioClient from "twilio";
import { v4 as uuidv4 } from "uuid";

import { hasAvailableCredits } from "@calcom/features/ee/billing/lib/credits";
import { checkSMSRateLimit } from "@calcom/lib/checkRateLimitAndThrowError";
import logger from "@calcom/lib/logger";
import { setTestSMS } from "@calcom/lib/testSMS";
import prisma from "@calcom/prisma";
import { SMSLockState } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["[twilioProvider]"] });

const testMode = process.env.NEXT_PUBLIC_IS_E2E || process.env.INTEGRATION_TEST_MODE || process.env.IS_E2E;

export function createTwilioClient() {
  if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.TWILIO_MESSAGING_SID) {
    return TwilioClient(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  }
  throw new Error("Twilio credentials are missing from the .env file");
}

function getDefaultSender(isWhatsapp = false) {
  let defaultSender = process.env.TWILIO_PHONE_NUMBER;
  if (isWhatsapp) {
    defaultSender = `whatsapp:+${process.env.TWILIO_WHATSAPP_PHONE_NUMBER}`;
  }
  return defaultSender || "";
}

function getSMSNumber(phone: string, isWhatsapp = false) {
  return isWhatsapp ? `whatsapp:${phone}` : phone;
}

export const sendSMS = async ({
  phoneNumber,
  body,
  sender,
  bookingUid,
  userId,
  teamId,
  isWhatsapp = false,
}: {
  phoneNumber: string;
  body: string;
  sender: string;
  bookingUid: string;
  userId?: number | null;
  teamId?: number | null;
  isWhatsapp?: boolean;
}) => {
  log.silly("sendSMS", JSON.stringify({ phoneNumber, body, sender, userId, teamId }));

  const isSMSSendingLocked = await isLockedForSMSSending(userId, teamId);

  if (isSMSSendingLocked) {
    log.debug(`${teamId ? `Team id ${teamId} ` : `User id ${userId} `} is locked for SMS sending `);
    return;
  }

  const hasCredits = await hasAvailableCredits({ userId, teamId });

  if (!hasCredits) {
    // todo: send email instead
    log.debug(
      `SMS not sent because ${teamId ? `Team id ${teamId} ` : `User id ${userId} `} has no available credits`
    );
    return;
  }

  if (testMode) {
    setTestSMS({
      to: getSMSNumber(phoneNumber, isWhatsapp),
      from: isWhatsapp ? getDefaultSender(isWhatsapp) : sender ? sender : getDefaultSender(),
      message: body,
    });
    console.log(
      "Skipped sending SMS because process.env.NEXT_PUBLIC_IS_E2E or process.env.INTEGRATION_TEST_MODE is set. SMS are available in globalThis.testSMS"
    );

    return;
  }

  const twilio = createTwilioClient();

  if (!teamId && userId) {
    await checkSMSRateLimit({
      identifier: `sms:user:${userId}`,
      rateLimitingType: "smsMonth",
    });
  }

  const response = await twilio.messages.create({
    body: body,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SID,
    to: getSMSNumber(phoneNumber, isWhatsapp),
    from: isWhatsapp ? getDefaultSender(isWhatsapp) : sender ? sender : getDefaultSender(),
    statusCallback: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/twilio/webhook?userId=${userId}${
      teamId ? "&teamId=${teamId}" : ""
    }&bookingUid=${bookingUid}`,
  });

  return response;
};

export const scheduleSMS = async ({
  phoneNumber,
  body,
  scheduledDate,
  sender,
  bookingUid,
  userId,
  teamId,
  isWhatsapp = false,
}: {
  phoneNumber: string;
  body: string;
  scheduledDate: Date;
  sender: string;
  bookingUid: string;
  userId?: number | null;
  teamId?: number | null;
  isWhatsapp?: boolean;
}) => {
  const isSMSSendingLocked = await isLockedForSMSSending(userId, teamId);

  const hasCredits = await hasAvailableCredits({ userId, teamId });

  if (!hasCredits) {
    /*
     we schedule 2 hours in advance
     so even when credits are bought now all SMS within the next two hours are sent as email
    */

    // todo: schedule email instead

    log.debug(
      `SMS not scheduled because ${
        teamId ? `Team id ${teamId} ` : `User id ${userId} `
      } has no available credits`
    );
    return;
  }

  if (isSMSSendingLocked) {
    log.debug(`${teamId ? `Team id ${teamId} ` : `User id ${userId} `} is locked for SMS sending `);
    return;
  }

  if (testMode) {
    setTestSMS({
      to: getSMSNumber(phoneNumber, isWhatsapp),
      from: isWhatsapp ? getDefaultSender(isWhatsapp) : sender ? sender : getDefaultSender(),
      message: body,
    });
    console.log(
      "Skipped sending SMS because process.env.NEXT_PUBLIC_IS_E2E or process.env.INTEGRATION_TEST_MODE is set. SMS are available in globalThis.testSMS"
    );
    return { sid: uuidv4() };
  }

  const twilio = createTwilioClient();

  if (!teamId && userId) {
    await checkSMSRateLimit({
      identifier: `sms:user:${userId}`,
      rateLimitingType: "smsMonth",
    });
  }

  const response = await twilio.messages.create({
    body: body,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SID,
    to: getSMSNumber(phoneNumber, isWhatsapp),
    scheduleType: "fixed",
    sendAt: scheduledDate,
    from: isWhatsapp ? getDefaultSender(isWhatsapp) : sender ? sender : getDefaultSender(),
    statusCallback: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/twilio/webhook?userId=${userId}${
      teamId ? "&teamId=${teamId}" : ""
    }&bookingUid=${bookingUid}`,
  });

  return response;
};

export const cancelSMS = async (referenceId: string) => {
  const twilio = createTwilioClient();
  await twilio.messages(referenceId).update({ status: "canceled" });
};

export const sendVerificationCode = async (phoneNumber: string) => {
  const twilio = createTwilioClient();
  if (process.env.TWILIO_VERIFY_SID) {
    await twilio.verify
      .services(process.env.TWILIO_VERIFY_SID)
      .verifications.create({ to: phoneNumber, channel: "sms" });
  }
};

export const verifyNumber = async (phoneNumber: string, code: string) => {
  const twilio = createTwilioClient();
  if (process.env.TWILIO_VERIFY_SID) {
    try {
      const verification_check = await twilio.verify.v2
        .services(process.env.TWILIO_VERIFY_SID)
        .verificationChecks.create({ to: phoneNumber, code: code });
      return verification_check.status;
    } catch (e) {
      return "failed";
    }
  }
};

async function isLockedForSMSSending(userId?: number | null, teamId?: number | null) {
  if (teamId) {
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
      },
    });
    return team?.smsLockState === SMSLockState.LOCKED;
  }

  if (userId) {
    const memberships = await prisma.membership.findMany({
      where: {
        userId: userId,
      },
      select: {
        team: {
          select: {
            smsLockState: true,
          },
        },
      },
    });

    const memberOfLockedTeam = memberships.find(
      (membership) => membership.team.smsLockState === SMSLockState.LOCKED
    );

    if (!!memberOfLockedTeam) {
      return true;
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
    });
    return user?.smsLockState === SMSLockState.LOCKED;
  }
}

export async function getCountryCodeForNumber(phoneNumber: string) {
  const twilio = createTwilioClient();
  const { countryCode } = await twilio.lookups.v2.phoneNumbers(phoneNumber).fetch();
  return countryCode;
}

export async function getCreditsForSMS(smsSid: string) {
  const twilio = createTwilioClient();

  const message = await twilio.messages(smsSid).fetch();

  const twilioPrice = message.price ? Math.abs(parseFloat(message.price)) : 0; // todo: might not work because price is a string
  const price = twilioPrice * 1.8;
  const credits = Math.ceil(price * 100);

  return credits || null;
}

export async function validateRequest(
  authToken: string,
  twilioHeader: string,
  url: string,
  params: Record<string, any>
) {
  return TwilioClient.validateRequest(authToken, twilioHeader, url, params);
}
