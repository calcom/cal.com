import type { NextRequest } from "next/server";
import TwilioClient from "twilio";
import { v4 as uuidv4 } from "uuid";

import { checkSMSRateLimit } from "@calcom/lib/checkRateLimitAndThrowError";
import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { setTestSMS } from "@calcom/lib/testSMS";
import prisma from "@calcom/prisma";
import { SMSLockState } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["[twilioProvider]"] });

const testMode = process.env.NEXT_PUBLIC_IS_E2E || process.env.INTEGRATION_TEST_MODE || process.env.IS_E2E;

function createTwilioClient() {
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
  bookingUid?: string | null;
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

  if (testMode) {
    setTestSMS({
      to: getSMSNumber(phoneNumber, isWhatsapp),
      from: isWhatsapp ? getDefaultSender(isWhatsapp) : sender || getDefaultSender(),
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
    from: isWhatsapp ? getDefaultSender(isWhatsapp) : sender || getDefaultSender(),
    statusCallback: getStatusCallbackUrl(userId, teamId, bookingUid),
  });

  return response;
};

const getStatusCallbackUrl = (userId?: number | null, teamId?: number | null, bookingUid?: string | null) => {
  const query = new URLSearchParams();
  if (userId) query.append("userId", String(userId));
  if (teamId) query.append("teamId", String(teamId));
  if (bookingUid) query.append("bookingUid", bookingUid);
  return `${WEBAPP_URL}/api/twilio/webhook${query.toString() ? `?${query.toString()}` : ""}`;
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
  bookingUid?: string | null;
  userId?: number | null;
  teamId?: number | null;
  isWhatsapp?: boolean;
}) => {
  const isSMSSendingLocked = await isLockedForSMSSending(userId, teamId);

  if (isSMSSendingLocked) {
    log.debug(`${teamId ? `Team id ${teamId} ` : `User id ${userId} `} is locked for SMS sending `);
    return;
  }

  if (testMode) {
    setTestSMS({
      to: getSMSNumber(phoneNumber, isWhatsapp),
      from: isWhatsapp ? getDefaultSender(isWhatsapp) : sender || getDefaultSender(),
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
    body,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SID,
    to: getSMSNumber(phoneNumber, isWhatsapp),
    scheduleType: "fixed",
    sendAt: scheduledDate,
    from: isWhatsapp ? getDefaultSender(isWhatsapp) : sender || getDefaultSender(),
    statusCallback: getStatusCallbackUrl(userId, teamId, bookingUid),
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

export const getMessageBody = async (referenceId: string) => {
  const twilio = createTwilioClient();
  const message = await twilio.messages(referenceId).fetch();
  return message.body;
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

export async function getPriceForSMS(smsSid: string) {
  const twilio = createTwilioClient();
  const message = await twilio.messages(smsSid).fetch();
  if (message.price == null || message.price === "null") return null;
  return Math.abs(parseFloat(message.price));
}

export async function validateWebhookRequest({
  requestUrl,
  params,
  signature,
}: {
  requestUrl: string;
  params: object;
  signature: string;
}) {
  if (!process.env.TWILIO_TOKEN) {
    throw new Error("TWILIO_TOKEN is not set");
  }

  const isSignatureValid = TwilioClient.validateRequest(
    process.env.TWILIO_TOKEN,
    signature,
    requestUrl,
    params
  );
  return isSignatureValid;
}

export async function determineOptOutType(
  req: NextRequest
): Promise<{ phoneNumber: string; optOutStatus: boolean } | { error: string }> {
  const signature = req.headers.get("X-Twilio-Signature");
  const formData = await req.formData();
  const params = Object.fromEntries(formData.entries());

  if (!signature) {
    return { error: "Missing Twilio signature" };
  }

  const fullUrl = `${WEBAPP_URL}${req.nextUrl.pathname}`;

  const isSignatureValid = await validateWebhookRequest({
    requestUrl: fullUrl,
    params: params,
    signature: signature,
  });

  if (!isSignatureValid) {
    return { error: "Invalid signature" };
  }

  const accountSid = params["AccountSid"]?.valueOf();

  if (accountSid !== process.env.TWILIO_SID) {
    return { error: "Invalid account SID" };
  }

  // Twilio returns phone numbers with a + prefix
  const phoneNumberRaw = params["From"]?.valueOf();

  if (!phoneNumberRaw) {
    return { error: "No phone number to handle" };
  }

  const phoneNumber = phoneNumberRaw.toString();

  if (!formData.get("OptOutType")) {
    return { error: "No opt out message to handle" };
  }

  const optOutMessage = formData.get("OptOutType")?.valueOf();

  if (optOutMessage !== "STOP" && optOutMessage !== "START") {
    return { error: "Invalid opt out type" };
  }

  const optOutStatus = optOutMessage === "STOP" ? true : false;

  return { phoneNumber, optOutStatus };
}
export async function deleteMultipleScheduledSMS(referenceIds: string[]) {
  const twilio = createTwilioClient();

  const pLimit = (await import("p-limit")).default;
  const limit = pLimit(10);

  await Promise.allSettled(
    referenceIds.map((referenceId) => {
      return limit(() => twilio.messages(referenceId).update({ status: "canceled" })).catch((error) => {
        log.error(`Error canceling scheduled SMS with id ${referenceId}`, error);
      });
    })
  );
}
