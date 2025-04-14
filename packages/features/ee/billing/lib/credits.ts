import dayjs from "@calcom/dayjs";
import { sendCreditBalanceLowWarningEmails } from "@calcom/emails";
import { IS_SMS_CREDITS_ENABLED } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server";
import { prisma } from "@calcom/prisma";
import { getAllCreditsForTeam } from "@calcom/trpc/server/routers/viewer/credits/util";
import { isSubscriptionActive } from "@calcom/trpc/server/routers/viewer/teams/util";

import { InternalTeamBilling } from "../../billing/teams/internal-team-billing";

/* WIP */
export async function getMonthlyCredits(teamId: number) {
  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
    select: {
      members: {
        select: {
          accepted: true,
        },
      },
      id: true,
      metadata: true,
      parentId: true,
      isOrganization: true,
    },
  });

  if (!team) return 0;

  const teamBillingService = new InternalTeamBilling(team);
  const subscriptionStatus = await teamBillingService.getSubscriptionStatus();

  if (isSubscriptionActive(subscriptionStatus)) {
    return 0;
  }

  const activeMembers = team.members.filter((member) => member.accepted).length;

  // todo: where do I get price per seat from? --> different for team and org
  const pricePerSeat = 15;
  const totalMonthlyCredits = activeMembers * ((pricePerSeat / 2) * 100);

  return totalMonthlyCredits;
}

async function hasTeamAvailableCredits(teamId: number) {
  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
    select: {
      credits: {
        select: {
          limitReachedAt: true,
          additionalCredits: true,
        },
      },
      parent: {
        select: {
          credits: {
            select: {
              limitReachedAt: true,
            },
          },
        },
      },
    },
  });

  if (team?.parent) {
    // check if org has available credits
    if (!team?.parent.credits?.limitReachedAt) {
      return true;
    }

    // check if a team has left over additional credits
    if (team?.credits?.additionalCredits && team?.credits.additionalCredits > 0) {
      return true;
    }
    return false;
  }

  // non org event type
  if (!team?.credits?.limitReachedAt) {
    return true;
  }
  return false;
}

export async function hasAvailableCredits({
  userId,
  teamId,
}: {
  userId?: number | null;
  teamId?: number | null;
}) {
  if (!IS_SMS_CREDITS_ENABLED) return true;

  if (teamId) {
    return hasTeamAvailableCredits(teamId);
  }

  if (userId) {
    const userCredits = await prisma.creditBalance.findUnique({
      where: {
        userId,
      },
    });

    //check if user has available credits
    if (userCredits?.additionalCredits && userCredits.additionalCredits > 0) {
      return true;
    }

    const teams = await prisma.membership.findMany({
      where: {
        userId,
        accepted: true,
      },
    });

    //check if user is member of team that has available credits
    for (const team of teams) {
      const hasAvailableCredits = await hasTeamAvailableCredits(team.id);
      if (hasAvailableCredits) {
        return true;
      }
    }
    return false;
  }

  return false;
}

/*
  credits can be 0, then we just check for available credits
*/
export async function getEntityToCharge({
  credits,
  userId,
  teamId,
}: {
  credits: number;
  userId?: number | null;
  teamId?: number | null;
}) {
  // todo

  if (userId) {
    return { userId, availableCredits: 0 };
  }

  if (teamId) {
    return { teamId, availableCredits: 0 };
  }
  return null;
}

export async function handleLowCreditBalance({
  userId,
  teamId,
  remainingCredits,
}: {
  userId?: number | null; // either userId or teamId is given never both
  teamId?: number | null;
  remainingCredits: number;
}) {
  if (userId && !teamId) {
    // check if user is on a team/org plan
    const team = await prisma.membership.findFirst({
      where: {
        userId,
        accepted: true,
      },
    });

    // user paid with left over personal credits, but is on a team/org plan, so we don't need to handle low credit balance
    if (team) return;

    // don't hard code credits amount
    const warningLimitUser = 500;
    if (remainingCredits < warningLimitUser) {
      const creditBalance = await prisma.creditBalance.findUnique({
        where: { userId },
      });

      if (creditBalance?.limitReachedAt) return; // user has already reached limit

      if (remainingCredits <= 0) {
        //await sendDisableSmsEmail(userId);
        await prisma.creditBalance.update({
          where: { userId },
          data: {
            limitReachedAt: new Date(),
          },
        });

        //cancelScheduledSmsAndScheduleEmails({ userId: parsedUserId }); --> only from user worklfows
        return;
      }

      if (creditBalance?.warningSentAt) return; // user has already sent warning email

      // user balance below 500 credits (5$)
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) return;

      await sendCreditBalanceLowWarningEmails({
        balance: remainingCredits,
        user: {
          name: user.name ?? "",
          email: user.email,
          t: await getTranslation(user.locale ?? "en", "common"),
        },
      });

      await prisma.creditBalance.update({
        where: { userId },
        data: {
          warningSentAt: new Date(),
        },
      });
    }
    return;
  }

  if (teamId) {
    const { totalMonthlyCredits } = await getAllCreditsForTeam(teamId);
    const warningLimit = totalMonthlyCredits * 0.2;
    if (remainingCredits < warningLimit) {
      const creditBalance = await prisma.creditBalance.findUnique({
        where: { teamId },
      });

      if (dayjs(creditBalance?.limitReachedAt).isAfter(dayjs().startOf("month"))) return; // team has already reached limit this month

      if (remainingCredits <= 0) {
        //await sendDisableSmsEmail(teamId);
        await prisma.creditBalance.update({
          where: { teamId },
          data: {
            limitReachedAt: new Date(),
          },
        });

        //cancelScheduledSmsAndScheduleEmails({ teamId }); --> team workflows, and also user workflows if the user has no credits or other team with credits
        return;
      }

      if (dayjs(creditBalance?.warningSentAt).isAfter(dayjs().startOf("month"))) return; // team has already sent warning email this month

      // team balance below 20% of credits
      //await sendWarningEmail(teamId);
      await prisma.creditBalance.update({
        where: { teamId },
        data: {
          warningSentAt: new Date(),
        },
      });
    }
  }
}
