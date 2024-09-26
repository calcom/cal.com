import dayjs from "@calcom/dayjs";
import { sendSmsLimitAlmostReachedEmails, sendSmsLimitReachedEmails } from "@calcom/emails";
import { IS_SELF_HOSTED, SMS_CREDITS_PER_MEMBER } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import { SmsCreditAllocationType, WorkflowMethods } from "@calcom/prisma/enums";

import * as twilio from "../reminders/providers/twilioProvider";
import { smsCountryCredits } from "./countryCredits";

export const smsCreditCountSelect = {
  id: true,
  limitReached: true,
  warningSent: true,
  month: true,
  credits: true,
  overageCharges: true,
  team: {
    select: {
      id: true,
      name: true,
      smsOverageLimit: true,
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

export async function getCreditsForNumber(phoneNumber: string) {
  if (IS_SELF_HOSTED) return 0;

  const countryCode = await twilio.getCountryCode(phoneNumber);

  if (countryCode === "US" || countryCode === "CA") {
    return 0;
  }

  return smsCountryCredits[countryCode] || 3;
}

export async function getTeamIdToBeCharged(userId?: number | null, teamId?: number | null) {
  if (teamId) {
    const smsCreditCountTeam = await prisma.smsCreditCount.findFirst({
      where: {
        teamId,
        userId: null,
        month: dayjs().utc().startOf("month").toDate(),
      },
      select: smsCreditCountSelect,
    });
    if (!smsCreditCountTeam?.limitReached) {
      return teamId;
    }
  } else if (userId) {
    // I also need to cancelAndMarkScheduledSms user sms sometimes
    // but I probably don't want to do that here but instead when sms is actually sent

    const teamIdChargedForSMS = await getPayingTeamId(userId);
    return teamIdChargedForSMS ?? null;
  }
  return null;
}

export async function addCredits(phoneNumber: string, teamId: number, userId?: number | null) {
  //todo: teamId should also be given for managed event types and user worklfows
  const credits = await getCreditsForNumber(phoneNumber);

  if (!teamId && userId) {
    // user event types
    const existingSMSCreditCountUser = await prisma.smsCreditCount.findFirst({
      where: {
        teamId,
        userId: userId,
        month: dayjs().utc().startOf("month").toDate(),
      },
    });

    if (existingSMSCreditCountUser) {
      await prisma.smsCreditCount.update({
        where: {
          id: existingSMSCreditCountUser.id,
        },
        data: {
          credits: {
            increment: credits,
          },
        },
        select: smsCreditCountSelect,
      });
    } else {
      await prisma.smsCreditCount.create({
        data: {
          teamId,
          userId,
          credits,
          month: dayjs().utc().startOf("month").toDate(),
        },
        select: smsCreditCountSelect,
      });
    }
  }

  const existingSMSCreditCountTeam = await prisma.smsCreditCount.findFirst({
    where: {
      teamId,
      userId: null,
      month: dayjs().utc().startOf("month").toDate(),
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
        credits,
        month: dayjs().utc().startOf("month").toDate(),
      },
      select: smsCreditCountSelect,
    });
  }

  const team = smsCreditCountTeam.team;

  const acceptedMembers = team.members.filter((member) => member.accepted);

  const freeCredits = acceptedMembers.length * SMS_CREDITS_PER_MEMBER;

  if (smsCreditCountTeam.credits > freeCredits) {
    if (smsCreditCountTeam.team.smsOverageLimit === 0) {
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

      await sendSmsLimitReachedEmails({ id: team.id, name: team.name, ownersAndAdmins });

      await prisma.smsCreditCount.update({
        where: {
          id: smsCreditCountTeam.id,
        },
        data: {
          limitReached: true,
        },
      });

      // no more credits available for team, cancel all already scheduled sms
      cancelAndMarkScheduledSms(teamId); // todo: if I can cancel then, then I also need to send them as email instead

      return { isFree: true }; // still allow sending last sms
    } else {
      // twilio statusCallback will check if sms costs are still within overage limit
      // Now we don't know how much this SMS will cost and if it might make it reach the limit
      return { isFree: false };
    }
  } else {
    const warninigLimitReached =
      smsCreditCountTeam.team.smsOverageLimit === 0
        ? smsCreditCountTeam.credits > freeCredits * 0.8
        : smsCreditCountTeam.overageCharges > smsCreditCountTeam.team.smsOverageLimit * 0.8;

    if (warninigLimitReached) {
      if (!smsCreditCountTeam.warningSent) {
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

        // notification email to team owners that limit is almost reached
        await sendSmsLimitAlmostReachedEmails({ id: team.id, name: team.name, ownersAndAdmins });

        await prisma.smsCreditCount.update({
          where: {
            id: smsCreditCountTeam.id,
          },
          data: {
            warningSent: true,
          },
        });
      }
    }
  }
  return { isFree: true };
}

export async function getPayingTeamId(userId: number) {
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
            month: dayjs().utc().startOf("month").toDate(),
            limitReached: true,
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
              month: dayjs().utc().startOf("month").toDate(),
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

  const teamToPay = teamMembershipsWithAvailableCredits.find(
    (membership) =>
      !membership.team.smsCreditCounts.length || membership.team.smsCreditCounts[0].credits === lowestCredits
  )?.team;

  return teamToPay?.id;
}

async function cancelAndMarkScheduledSms(teamId?: number | null, userId?: number | null) {
  const smsRemindersToCancel = await prisma.workflowReminder.findMany({
    where: {
      method: WorkflowMethods.SMS,
      scheduledDate: {
        gte: dayjs().utc().startOf("month").toDate(),
        lt: dayjs().utc().endOf("month").toDate(),
      },
      workflowStep: {
        workflow: {
          ...(userId && { userId }),
          ...(teamId && { teamId }),
        },
      },
    },
    select: {
      id: true,
      scheduledDate: true,
      workflowStepId: true,
      referenceId: true,
    },
  });

  await prisma.workflowReminder.updateMany({
    where: {
      id: {
        in: smsRemindersToCancel.map((reminder) => reminder.id),
      },
    },
    data: {
      cancelled: true,
    },
  });

  for (const reminder of smsRemindersToCancel.filter((reminder) => !reminder.referenceId)) {
    if (reminder.referenceId) {
      await twilio.cancelSMS(reminder.referenceId); // todo: resend in case user will get new credits by adding new member
    }
  }
}
