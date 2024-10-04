import dayjs from "@calcom/dayjs";
import { sendSmsLimitAlmostReachedEmails, sendSmsLimitReachedEmails } from "@calcom/emails";
import { IS_SELF_HOSTED, SMS_CREDITS_PER_MEMBER } from "@calcom/lib/constants";
import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import { SmsCreditAllocationType, WorkflowMethods } from "@calcom/prisma/enums";

import { isAttendeeAction } from "../actionHelperFunctions";
import * as twilio from "../reminders/providers/twilioProvider";
import { smsCountryCredits } from "./countryCredits";

export const smsCreditCountSelect = {
  id: true,
  limitReached: true,
  warningSent: true,
  month: true,
  credits: true,
  overageCharges: true,
  user: {
    select: {
      name: true,
      email: true,
      locale: true,
    },
  },
  team: {
    select: {
      id: true,
      name: true,
      smsOverageLimit: true,
      parent: true,
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
      return { teamId };
    }
  } else if (userId) {
    const teamOrUserChargedForSMS = await getPayingTeamId(userId);
    return teamOrUserChargedForSMS;
  }
  return null;
}

export async function addCredits(
  phoneNumber: string,
  teamId?: number | null,
  userId?: number | null,
  getCreditsFn = getCreditsForNumber
) {
  const credits = await getCreditsFn(phoneNumber);
  if (credits === 0) return { isFree: true };

  let smsCreditCount;

  if (userId) {
    // user event types
    const existingSMSCreditCountUser = await prisma.smsCreditCount.findFirst({
      where: {
        ...(teamId ? { teamId } : { teamId: null }),
        userId: userId,
        month: dayjs().utc().startOf("month").toDate(),
      },
    });

    if (existingSMSCreditCountUser) {
      smsCreditCount = await prisma.smsCreditCount.update({
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
      smsCreditCount = await prisma.smsCreditCount.create({
        data: {
          ...(teamId ? { teamId } : { teamId: null }),
          userId,
          credits,
          month: dayjs().utc().startOf("month").toDate(),
        },
        select: smsCreditCountSelect,
      });
    }
  }

  if (teamId) {
    const existingSMSCreditCountTeam = await prisma.smsCreditCount.findFirst({
      where: {
        teamId,
        userId: null,
        month: dayjs().utc().startOf("month").toDate(),
      },
    });

    if (existingSMSCreditCountTeam) {
      smsCreditCount = await prisma.smsCreditCount.update({
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
      smsCreditCount = await prisma.smsCreditCount.create({
        data: {
          teamId,
          credits,
          month: dayjs().utc().startOf("month").toDate(),
        },
        select: smsCreditCountSelect,
      });
    }
  }

  if (!smsCreditCount) return { isFree: false };

  const team = smsCreditCount.team;

  if (team?.parent) {
    //orgs have unlimited free sms
    return { isFree: true };
  }

  const acceptedMembers = team?.members.filter((member) => member.accepted) ?? [];

  const freeCredits = (acceptedMembers.length ?? 1) * SMS_CREDITS_PER_MEMBER;

  const warninigLimitReached =
    !team || team.smsOverageLimit === 0
      ? smsCreditCount.credits > freeCredits * 0.8
      : smsCreditCount.overageCharges > team.smsOverageLimit * 0.8;

  let isFree = true;

  const ownersAndAdmins = team
    ? await Promise.all(
        acceptedMembers
          .filter((member) => member.role === "OWNER" || member.role === "ADMIN")
          .map(async (member) => {
            return {
              email: member.user.email,
              name: member.user.name,
              t: await getTranslation(member.user.locale ?? "es", "common"),
            };
          })
      )
    : [];

  const user =
    !team && smsCreditCount.user
      ? {
          email: smsCreditCount.user.email,
          name: smsCreditCount.user.name || "",
          t: await getTranslation(smsCreditCount.user?.locale ?? "en", "common"),
        }
      : undefined;

  if (smsCreditCount.credits > freeCredits) {
    if (!team || team.smsOverageLimit === 0) {
      await sendSmsLimitReachedEmails(
        team ? { team: { id: team.id, name: team.name, ownersAndAdmins } } : { user }
      );

      await prisma.smsCreditCount.update({
        where: {
          id: smsCreditCount.id,
        },
        data: {
          limitReached: true,
        },
      });

      // no more credits available for team, cancel all already scheduled sms and schedule emails instead
      await cancelScheduledSmsAndScheduleEmails({ teamId, userId });

      return { isFree: true }; // still allow sending last sms
    }
    isFree = false;
  }
  if (warninigLimitReached) {
    if (!smsCreditCount.warningSent) {
      await sendSmsLimitAlmostReachedEmails(
        team ? { team: { id: team.id, name: team.name, ownersAndAdmins } } : { user }
      );

      await prisma.smsCreditCount.update({
        where: {
          id: smsCreditCount.id,
        },
        data: {
          warningSent: true,
        },
      });
    }
  }
  return { isFree };
}

export async function getPayingTeamId(userId: number) {
  const userWithoutTeam = await prisma.user.findFirst({
    where: {
      id: userId,
      teams: {
        none: {
          accepted: true,
        },
      },
    },
  });

  const isCurrentUsernamePremium =
    userWithoutTeam && hasKeyInMetadata(userWithoutTeam, "isPremium")
      ? !!userWithoutTeam.metadata.isPremium
      : false;

  if (userWithoutTeam && isCurrentUsernamePremium) return { userId: userWithoutTeam.id };

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

  return teamToPay ? { teamId: teamToPay.id } : null;
}

export async function cancelScheduledSmsAndScheduleEmails({
  teamId,
  userId,
}: {
  teamId?: number | null;
  userId?: number | null;
}) {
  //todo: if only userId is given cancel for user only
  const smsRemindersToCancel = await prisma.workflowReminder.findMany({
    where: {
      OR: [{ method: WorkflowMethods.SMS }, { method: WorkflowMethods.WHATSAPP }],
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
    select: { referenceId: true, id: true, workflowStep: { select: { action: true } } },
  });

  if (smsRemindersToCancel?.length) {
    await Promise.all(
      smsRemindersToCancel?.map(async (reminder) => {
        // Cancel already scheduled SMS
        if (reminder.referenceId) {
          await twilio.cancelSMS(reminder.referenceId);
        }
        if (reminder.workflowStep?.action && isAttendeeAction(reminder.workflowStep?.action)) {
          // Update attendee reminders to unscheduled email reminder
          await prisma.workflowReminder.update({
            where: { id: reminder.id },
            data: {
              method: WorkflowMethods.EMAIL,
              referenceId: null,
              scheduled: false,
            },
          });
        }
      })
    );
  }
}
