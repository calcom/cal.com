import TwilioClient from "twilio";
import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import { sendSmsLimitAlmostReachedEmails, sendSmsLimitReachedEmails } from "@calcom/emails";
import { checkSMSRateLimit } from "@calcom/lib/checkRateLimitAndThrowError";
import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { setTestSMS } from "@calcom/lib/testSMS";
import prisma from "@calcom/prisma";
import { SMSLockState } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["[twilioProvider]"] });

const testMode = process.env.NEXT_PUBLIC_IS_E2E || process.env.INTEGRATION_TEST_MODE;

const creditsPerMember = 250;

async function getCountryCode(phoneNumber: string) {
  const twilio = createTwilioClient();

  const numberDetails = await twilio.lookups.phoneNumbers(phoneNumber).fetch();

  return numberDetails.countryCode;
}

export async function getCreditsForNumber(phoneNumber: string) {
  if (IS_SELF_HOSTED) return 0;

  const countryCode = await getCountryCode(phoneNumber);

  if (countryCode === "US" || countryCode === "CA") {
    return 0;
  }

  const country = await prisma.smsCountryCredits.findFirst({
    where: {
      iso: countryCode,
    },
  });

  return country?.credits || 3;
}

async function addCredits(phoneNumber: string, userId?: number | null, teamId: number) {
  const credits = await getCreditsForNumber(phoneNumber);

  const userTeamKey = userId ? `${teamId}:${userId}` : `${teamId}`;

  const smsCreditCount = await prisma.smsCreditCount.upsert({
    where: {
      userTeamKey: userTeamKey,
    },
    update: {
      credits: {
        increment: credits,
      },
    },
    create: {
      userTeamKey: userTeamKey,
      teamId,
      userId,
      credits,
    },
    select: {
      limitReachedAt: true,
      warningSentAt: true,
      credits: true,
      team: {
        select: {
          name: true,
          members: {
            select: {
              accepted: true,
              role: true,
              user: {
                select: {
                  email: true,
                  name: true,
                  locale: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const team = smsCreditCount.team;

  const acceptedMembers = team.members.filter((member) => member.accepted);

  const totalCredits = acceptedMembers.length * creditsPerMember;

  if (smsCreditCount.credits > totalCredits) {
    if (
      !smsCreditCount.limitReachedAt ||
      dayjs(smsCreditCount.limitReachedAt).isBefore(dayjs().startOf("month"))
    ) {
      // duplicate code
      const owners = await Promise.all(
        acceptedMembers
          .filter((member) => member.role === "OWNER")
          .map(async (member) => {
            return {
              email: member.user.email,
              name: member.user.name,
              t: await getTranslation(member.user.locale ?? "es", "common"),
            };
          })
      );

      await sendSmsLimitReachedEmails({ name: team.name, owners });

      await prisma.smsCreditCount.update({
        where: {
          userTeamKey,
        },
        data: {
          limitReachedAt: new Date(),
        },
      });
    }
    return false;
  }

  if (smsCreditCount.credits > totalCredits * 0.8) {
    if (
      !smsCreditCount.warningSentAt ||
      dayjs(smsCreditCount.warningSentAt).isBefore(dayjs().startOf("month"))
    ) {
      const owners = await Promise.all(
        acceptedMembers
          .filter((member) => member.role === "OWNER")
          .map(async (member) => {
            return {
              email: member.user.email,
              name: member.user.name,
              t: await getTranslation(member.user.locale ?? "es", "common"),
            };
          })
      );
      // notification email to team owners when over 80% of credits used
      await sendSmsLimitAlmostReachedEmails({ name: team.name, owners });

      await prisma.smsCreditCount.update({
        where: {
          userTeamKey,
        },
        data: {
          warningSentAt: new Date(),
        },
      });
    }
  }

  return true;
}

async function removeCredits(credits: number, userId?: number | null, teamId: number) {
  const userTeamKey = userId ? `${teamId}:${userId}` : `${teamId}`;

  await prisma.smsCreditCount.update({
    where: {
      userTeamKey,
    },
    data: {
      credits: {
        increment: credits,
      },
    },
  });
}

function createTwilioClient() {
  if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.TWILIO_MESSAGING_SID) {
    return TwilioClient(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  }
  throw new Error("Twilio credentials are missing from the .env file");
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
  teamId?: number | null, // either event type team id or user's team teamId
  isTeamEventType: boolean, // a managed event type also counts as a team event type
  whatsapp = false
) => {
  const isSMSSendingLocked = await isLockedForSMSSending(userId, teamId);

  if (isSMSSendingLocked) {
    log.debug(`${teamId ? `Team id ${teamId} ` : `User id ${userId} `} is locked for SMS sending `);
    return;
  }

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

  const twilio = createTwilioClient();

  if (!teamId && userId) {
    await checkSMSRateLimit({
      identifier: `sms:user:${userId}`,
      rateLimitingType: "smsMonth",
    });
  }

  const hasSMSCredits = await addCredits(phoneNumber, userId, teamId);

  if (hasSMSCredits) {
    const response = await twilio.messages.create({
      body: body,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SID,
      to: getSMSNumber(phoneNumber, whatsapp),
      from: whatsapp ? getDefaultSender(whatsapp) : sender ? sender : getDefaultSender(),
    });
    return response;
  } else {
    //send email instead
  }
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
  const isSMSSendingLocked = await isLockedForSMSSending(userId, teamId);

  if (isSMSSendingLocked) {
    log.debug(`${teamId ? `Team id ${teamId} ` : `User id ${userId} `} is locked for SMS sending `);
    return;
  }

  if (testMode) {
    setTestSMS({
      to: getSMSNumber(phoneNumber, whatsapp),
      from: whatsapp ? getDefaultSender(whatsapp) : sender ? sender : getDefaultSender(),
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

  const hasSMSCredits = await addCredits(phoneNumber, userId, teamId);

  if (hasSMSCredits) {
    const response = await twilio.messages.create({
      body: body,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SID,
      to: getSMSNumber(phoneNumber, whatsapp),
      scheduleType: "fixed",
      sendAt: scheduledDate,
      from: whatsapp ? getDefaultSender(whatsapp) : sender ? sender : getDefaultSender(),
    });
    return response;
  } else {
    //send email instead
  }
};

export const cancelSMS = async (referenceId: string, credits: number, userId?: number, teamId?: number) => {
  const twilio = createTwilioClient();
  await twilio.messages(referenceId).update({ status: "canceled" });

  await removeCredits(credits, userId, teamId);
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
