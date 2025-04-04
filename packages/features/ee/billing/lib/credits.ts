import dayjs from "@calcom/dayjs";
import { IS_SMS_CREDITS_ENABLED } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { CreditType } from "@calcom/prisma/enums";
import { getAllCreditsForTeam, getAllCreditsForUser } from "@calcom/trpc/server/routers/viewer/credits/util";
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

export async function payCredits({
  quantity,
  details,
  userId,
  teamId,
}: {
  quantity: number;
  details: string;
  userId?: number | null; // either userId or teamId is is given never both
  teamId?: number | null;
}) {
  let teamToPay: { id: number; monthly: number; additional: number; remainingCredits: number } | undefined;

  if (userId) {
    // if user has enough credits, use their credits
    const userCredits = await getAllCreditsForUser(userId);
    if (userCredits.additionalCredits >= quantity) {
      await prisma.creditExpenseLog.create({
        data: {
          credits: quantity,
          details,
          creditType: CreditType.ADDITIONAL,
          date: new Date(),
          creditBalance: {
            connectOrCreate: {
              where: { userId },
              create: { userId },
            },
          },
        },
      });

      return {
        userId,
        additionalCredits: quantity,
        monthlyCredits: 0,
        remainingCredits: userCredits.additionalCredits - quantity,
      };
    }

    if (!teamId) {
      //todo: check if user is part of org
      // teamId is never give if we have userId
      const teams = await prisma.membership.findMany({
        where: {
          userId,
          accepted: true,
        },
      });

      // find teams that have enough credits
      const teamsWithCredits = await Promise.all(
        teams.map(async (team) => {
          const teamCredits = await getAllCreditsForTeam(team.id);
          return { ...teamCredits, teamId: team.id };
        })
      );

      const sortedTeamsWithCredits = teamsWithCredits.sort(
        (a, b) => a.totalRemainingMonthlyCredits - b.totalRemainingMonthlyCredits
      );

      const teamsWithEnoughCredits = sortedTeamsWithCredits.filter(
        (team) => team.totalRemainingMonthlyCredits + team.additionalCredits >= quantity
      );

      const hasTeamWithEnoughCredits = teamsWithEnoughCredits.length > 0;

      if (teamsWithEnoughCredits.length === 0) {
        const hasEnoughMonthlyCredits = teamsWithEnoughCredits[0].totalRemainingMonthlyCredits >= quantity;
        teamToPay = {
          id: teamsWithEnoughCredits[0].teamId,
          monthly: hasEnoughMonthlyCredits
            ? quantity
            : teamsWithEnoughCredits[0].totalRemainingMonthlyCredits,
          additional: hasEnoughMonthlyCredits
            ? 0
            : quantity - teamsWithEnoughCredits[0].totalRemainingMonthlyCredits,
          remainingCredits:
            teamsWithEnoughCredits[0].totalRemainingMonthlyCredits +
            teamsWithEnoughCredits[0].additionalCredits -
            quantity,
        };
      } else {
        teamToPay = {
          id: sortedTeamsWithCredits[0].teamId,
          monthly: sortedTeamsWithCredits[0].totalRemainingMonthlyCredits,
          additional: sortedTeamsWithCredits[0].additionalCredits,
          remainingCredits: 0,
        };
      }
    }
  }

  if (teamId && !teamToPay) {
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
    });

    const teamIdToCharge = team?.parentId ? team.parentId : team?.id;
    //if org has not enough credits, check also team
    if (teamIdToCharge) {
      const { totalRemainingMonthlyCredits, additionalCredits } = await getAllCreditsForTeam(teamIdToCharge);

      const hasRemainingCredits = totalRemainingMonthlyCredits + additionalCredits >= quantity;

      if (hasRemainingCredits) {
        const hasEnoughMonthlyCredits = totalRemainingMonthlyCredits >= quantity;
        teamToPay = {
          id: teamIdToCharge,
          monthly: hasEnoughMonthlyCredits ? quantity : totalRemainingMonthlyCredits,
          additional: hasEnoughMonthlyCredits ? 0 : quantity - totalRemainingMonthlyCredits,
          remainingCredits: totalRemainingMonthlyCredits + additionalCredits - quantity,
        };
      }
    }
  }

  if (teamToPay) {
    const { monthly, additional, id, remainingCredits } = teamToPay;

    if (monthly) {
      await prisma.creditExpenseLog.create({
        data: {
          credits: monthly,
          details,
          creditType: CreditType.MONTHLY,
          date: new Date(),
          creditBalance: {
            connectOrCreate: {
              where: { teamId: id },
              create: { teamId: id },
            },
          },
        },
      });
    }

    if (additional) {
      await prisma.creditExpenseLog.create({
        data: {
          credits: additional,
          details,
          creditType: CreditType.ADDITIONAL,
          date: new Date(),
          creditBalance: {
            connectOrCreate: {
              where: { teamId: id },
              create: { teamId: id },
            },
          },
        },
      });
    }
    return { teamId: id, additionalCredits: additional, monthlyCredits: monthly, remainingCredits };
  }
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
      //await sendWarningEmail(userId);
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
