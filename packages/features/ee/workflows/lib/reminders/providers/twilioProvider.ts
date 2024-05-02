import TwilioClient from "twilio";

import { checkSMSRateLimit } from "@calcom/lib/checkRateLimitAndThrowError";
import logger from "@calcom/lib/logger";
import { setTestSMS } from "@calcom/lib/testSMS";
import prisma from "@calcom/prisma";
import { SMSLockState } from "@calcom/prisma/enums";

declare global {
  // eslint-disable-next-line no-var
  var twilio: TwilioClient.Twilio | undefined;
}

const log = logger.getSubLogger({ prefix: ["[twilioProvider]"] });

export const twilio =
  globalThis.twilio ||
  (process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.TWILIO_MESSAGING_SID)
    ? TwilioClient(process.env.TWILIO_SID, process.env.TWILIO_TOKEN)
    : undefined;

if (process.env.NODE_ENV !== "production") {
  globalThis.twilio = twilio;
}

function assertTwilio(twilio: TwilioClient.Twilio | undefined): asserts twilio is TwilioClient.Twilio {
  if (!twilio) throw new Error("Twilio credentials are missing from the .env file");
}

function getDefaultSender(whatsapp = false) {
  let defaultSender = process.env.TWILIO_PHONE_NUMBER;
  if (whatsapp) {
    defaultSender = `whatsapp:+${process.env.TWILIO_WHATSAPP_PHONE_NUMBER}`;
  }
  return defaultSender || "";
}

function getSMSNumber(phone: string, whatsapp = false) {
  return whatsapp ? `whatsapp:${phone}` : phone;
}

export const sendSMS = async (
  phoneNumber: string,
  body: string,
  sender: string,
  userId?: number | null,
  teamId?: number | null,
  whatsapp = false
) => {
  const isSMSSendingLocked = await isLockedForSMSSending(userId, teamId);

  if (isSMSSendingLocked) {
    log.debug(`${teamId ? `Team id ${teamId} ` : `User id ${userId} `} is locked for SMS sending `);
    return;
  }

  const testMode = process.env.NEXT_PUBLIC_IS_E2E || process.env.INTEGRATION_TEST_MODE;

  if (testMode) {
    setTestSMS({
      to: getSMSNumber(phoneNumber, whatsapp),
      from: whatsapp ? getDefaultSender(whatsapp) : sender ? sender : getDefaultSender(),
      message: body,
    });
    console.log(
      "Skipped sending SMS because process.env.NEXT_PUBLIC_IS_E2E or process.env.INTEGRATION_TEST_MODE is set. SMS are available in globalThis.testSMS"
    );

    return;
  }

  assertTwilio(twilio);

  if (!teamId && userId) {
    await checkSMSRateLimit({
      identifier: `sms:user:${userId}`,
      rateLimitingType: "smsMonth",
    });
  }

  const response = await twilio.messages.create({
    body: body,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SID,
    to: getSMSNumber(phoneNumber, whatsapp),
    from: whatsapp ? getDefaultSender(whatsapp) : sender ? sender : getDefaultSender(),
  });

  return response;
};

export const scheduleSMS = async (
  phoneNumber: string,
  body: string,
  scheduledDate: Date,
  sender: string,
  userId?: number | null,
  teamId?: number | null,
  whatsapp = false
) => {
  assertTwilio(twilio);

  const isSMSSendingLocked = await isLockedForSMSSending(userId, teamId);

  if (isSMSSendingLocked) {
    log.debug(`${teamId ? `Team id ${teamId} ` : `User id ${userId} `} is locked for SMS sending `);
    return;
  }

  if (!teamId && userId) {
    await checkSMSRateLimit({
      identifier: `sms:user:${userId}`,
      rateLimitingType: "smsMonth",
    });
  }

  const response = await twilio.messages.create({
    body: body,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SID,
    to: getSMSNumber(phoneNumber, whatsapp),
    scheduleType: "fixed",
    sendAt: scheduledDate,
    from: whatsapp ? getDefaultSender(whatsapp) : sender ? sender : getDefaultSender(),
  });

  return response;
};

export const cancelSMS = async (referenceId: string) => {
  assertTwilio(twilio);
  await twilio.messages(referenceId).update({ status: "canceled" });
};

export const sendVerificationCode = async (phoneNumber: string) => {
  assertTwilio(twilio);
  if (process.env.TWILIO_VERIFY_SID) {
    await twilio.verify
      .services(process.env.TWILIO_VERIFY_SID)
      .verifications.create({ to: phoneNumber, channel: "sms" });
  }
};

export const verifyNumber = async (phoneNumber: string, code: string) => {
  assertTwilio(twilio);
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
