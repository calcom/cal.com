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
import { SmsCreditAllocationType, SMSLockState } from "@calcom/prisma/enums";

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

export async function addCredits(phoneNumber: string, userId?: number | null, teamId?: number | null) {
  //todo: teamId should also be given for managed event types and user worklfows

  const credits = await getCreditsForNumber(phoneNumber);

  const smsCreditCountSelect = {
    id: true,
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
  };

  if (!teamId && userId) {
    // user event types
    let teamMembershipsWithAvailableCredits = await prisma.membership.findMany({
      where: {
        userId,
        team: {
          smsCreditAllocationType: {
            not: SmsCreditAllocationType.NONE,
          },
          smsCreditCounts: {
            none: {
              userId: null,
              limitReachedAt: {
                gte: dayjs().startOf("month").toDate(),
              },
            },
          },
        },
      },
      select: {
        team: {
          select: {
            id: true,
            smsCreditAllocationType: true,
            smsCreditAllocationValue: true,
            smsCreditCounts: {
              where: {
                userId,
              },
              select: {
                credits: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    teamMembershipsWithAvailableCredits = teamMembershipsWithAvailableCredits.filter(
      (membership) =>
        membership.team.smsCreditAllocationType === SmsCreditAllocationType.ALL ||
        (membership.team.smsCreditAllocationValue || 0) > (membership.team.smsCreditCounts[0]?.credits || 0)
    );

    //no teams of the user have credits available
    if (!teamMembershipsWithAvailableCredits.length) return null;

    const lowestCredits = Math.min(
      ...teamMembershipsWithAvailableCredits.map(
        (membership) => membership.team.smsCreditCounts[0]?.credits || 0
      )
    );

    /*
    Find the team that needs to pay sms credits for the user event type:
    1. The team that didn't pay any credits for this user yet (!membership.team.smsCreditCounts.length)
    2. The team that paid the least amount of credits for this user
    */
    const teamToPay = teamMembershipsWithAvailableCredits.find(
      (membership) =>
        !membership.team.smsCreditCounts.length ||
        membership.team.smsCreditCounts[0].credits === lowestCredits
    )?.team;

    teamId = teamToPay?.id;
  }

  if (teamId) {
    const existingSMSCreditCountTeam = await prisma.smsCreditCount.findFirst({
      where: {
        teamId,
        userId: null,
      },
    });

    let smsCreditCountTeam;

    if (existingSMSCreditCountTeam) {
      smsCreditCountTeam = await prisma.smsCreditCount.update({
        where: {
          id: existingSMSCreditCountTeam.id,
        },
        data: {
          credits: {
            increment: credits,
          },
        },
        select: smsCreditCountSelect,
      });
    } else {
      smsCreditCountTeam = await prisma.smsCreditCount.create({
        data: {
          teamId,
          userId,
          credits,
        },
        select: smsCreditCountSelect,
      });
    }
    const team = smsCreditCountTeam.team;

    const acceptedMembers = team.members.filter((member) => member.accepted);

    const totalCredits = acceptedMembers.length * creditsPerMember;

    if (smsCreditCountTeam.credits > totalCredits) {
      if (
        !smsCreditCountTeam.limitReachedAt ||
        dayjs(smsCreditCountTeam.limitReachedAt).isBefore(dayjs().startOf("month"))
      ) {
        // limit reached
        const ownersAndAdmins = await Promise.all(
          acceptedMembers
            .filter((member) => member.role === "OWNER" || member.role === "ADMIN")
            .map(async (member) => {
              return {
                email: member.user.email,
                name: member.user.name,
                t: await getTranslation(member.user.locale ?? "en", "common"),
              };
            })
        );

        await sendSmsLimitReachedEmails({ name: team.name, ownersAndAdmins });

        await prisma.smsCreditCount.update({
          where: {
            id: smsCreditCountTeam.id,
          },
          data: {
            limitReachedAt: new Date(),
          },
        });
        return { teamId }; // limit reached now, allow sending last sms
      }
      return null; // limit was already reached, don't send sms
    } else if (smsCreditCountTeam.credits > totalCredits * 0.8) {
      if (
        !smsCreditCountTeam.warningSentAt ||
        dayjs(smsCreditCountTeam.warningSentAt).isBefore(dayjs().startOf("month"))
      ) {
        const ownersAndAdmins = await Promise.all(
          acceptedMembers
            .filter((member) => member.role === "OWNER" || member.role === "ADMIN")
            .map(async (member) => {
              return {
                email: member.user.email,
                name: member.user.name,
                t: await getTranslation(member.user.locale ?? "es", "common"),
              };
            })
        );

        // notification email to team owners when over 80% of credits used
        await sendSmsLimitAlmostReachedEmails({ name: team.name, ownersAndAdmins });

        await prisma.smsCreditCount.update({
          where: {
            id: smsCreditCountTeam.id,
          },
          data: {
            warningSentAt: new Date(),
          },
        });
      }
    }
    return { teamId };
  }
  return null;
}

async function removeCredits(credits: number, userId?: number, teamId?: number) {
  if (!teamId) {
    // workflowReminder was created before sms credits were added and teamId isn't set yet
    return;
  }
  const smsCreditCountTeam = await prisma.smsCreditCount.findFirst({
    where: {
      teamId,
    },
  });

  if (smsCreditCountTeam) {
    await prisma.smsCreditCount.update({
      where: {
        id: smsCreditCountTeam.id,
      },
      data: {
        credits: {
          decrement: credits,
        },
      },
    });
  }

  if (!!userId) {
    const smsCreditCountUser = await prisma.smsCreditCount.findFirst({
      where: {
        teamId,
        userId,
      },
    });
    if (smsCreditCountUser) {
      await prisma.smsCreditCount.update({
        where: {
          id: smsCreditCountUser.id,
        },
        data: {
          credits: {
            decrement: credits,
          },
        },
      });
    }
  }
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
  teamId?: number | null, // teamId of workflow
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

  const payingTeam = await addCredits(phoneNumber, userId, teamId);

  if (!!payingTeam) {
    const response = await twilio.messages.create({
      body: body,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SID,
      to: getSMSNumber(phoneNumber, whatsapp),
      from: whatsapp ? getDefaultSender(whatsapp) : sender ? sender : getDefaultSender(),
    });
    return { ...response, teamId: payingTeam.teamId };
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
    return { sid: uuidv4(), teamId: null };
  }

  const twilio = createTwilioClient();

  if (!teamId && userId) {
    await checkSMSRateLimit({
      identifier: `sms:user:${userId}`,
      rateLimitingType: "smsMonth",
    });
  }

  const payingTeam = await addCredits(phoneNumber, userId, teamId);

  if (!!payingTeam) {
    const response = await twilio.messages.create({
      body: body,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SID,
      to: getSMSNumber(phoneNumber, whatsapp),
      scheduleType: "fixed",
      sendAt: scheduledDate,
      from: whatsapp ? getDefaultSender(whatsapp) : sender ? sender : getDefaultSender(),
    });
    return { ...response, teamId: payingTeam.teamId };
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
