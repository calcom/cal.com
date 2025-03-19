import dayjs from "@calcom/dayjs";
import { prisma } from "@calcom/prisma";
import { CreditType } from "@calcom/prisma/enums";
import { getAllCreditsForTeam, getAllCreditsForUser } from "@calcom/trpc/server/routers/viewer/credits/util";

import { InternalTeamBilling } from "../../billing/teams/internal-team-billing";

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
  const isPlanActive = await teamBillingService.checkIfTeamHasActivePlan();

  if (!isPlanActive) {
    return 0;
  }

  const activeMembers = team.members.filter((member) => member.accepted).length;

  // todo: where do I get price per seat from?
  const pricePerSeat = 15;
  const totalMonthlyCredits = activeMembers * ((pricePerSeat / 2) * 100);

  return totalMonthlyCredits;
}

export async function payCredits({
  quantity,
  details,
  userId,
  teamId,
}: {
  quantity: number;
  details: string;
  userId?: number | null;
  teamId?: number | null;
}) {
  let teamToUse: { id: number; monthly: number; additional: number } | undefined;
  let fallbackTeam: { id: number; monthly: number; additional: number } | undefined;

  let userIdToUse: number | undefined;

  let userTeams = [];

  if (userId) {
    userTeams = await prisma.membership.findMany({
      where: {
        userId,
        accepted: true,
      },
    });

    // if user has enough credits, use their credits
    const userCredits = await getAllCreditsForUser(userId);
    if (userCredits.additionalCredits >= quantity) {
      userIdToUse = userId;
    }
  }

  if (teamId && !userIdToUse) {
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
    });

    let teamIdToCharge = team?.parentId ? team.parentId : team?.id;

    if (!team && userId) {
      const userOrgMembership = await prisma.membership.findFirst({
        where: {
          userId,
          accepted: true,
          team: {
            isOrganization: true,
          },
        },
      });
      teamIdToCharge = userOrgMembership?.teamId ?? teamIdToCharge;
    }

    if (teamIdToCharge) {
      const { totalRemainingMonthlyCredits, additionalCredits } = await getAllCreditsForTeam(teamIdToCharge);

      if (totalRemainingMonthlyCredits + additionalCredits >= quantity) {
        teamToUse = {
          id: teamIdToCharge,
          monthly: totalRemainingMonthlyCredits,
          additional: totalRemainingMonthlyCredits < quantity ? quantity - totalRemainingMonthlyCredits : 0,
        };
      } else {
        fallbackTeam = {
          id: teamIdToCharge,
          monthly: quantity - additionalCredits,
          additional: 0,
        };
      }
    }

    if (!teamToUse && userId) {
      // check if user is part of any team that has enough credits

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

      if (teamsWithEnoughCredits.length > 0) {
        teamToUse = {
          id: teamsWithEnoughCredits[0].teamId,
          monthly: teamsWithEnoughCredits[0].totalRemainingMonthlyCredits,
          additional:
            teamsWithEnoughCredits[0].totalRemainingMonthlyCredits < quantity
              ? quantity - teamsWithEnoughCredits[0].totalRemainingMonthlyCredits
              : 0,
        };
      } else if (!fallbackTeam) {
        fallbackTeam = {
          id: sortedTeamsWithCredits[0].teamId,
          monthly: quantity - sortedTeamsWithCredits[0].additionalCredits,
          additional: 0,
        };
      }
    }
  }

  if (userIdToUse) {
    await prisma.creditExpenseLog.create({
      data: {
        credits: quantity,
        details,
        creditType: CreditType.ADDITIONAL,
        date: new Date(),
        creditBalance: {
          connectOrCreate: {
            where: { userId: userIdToUse },
            create: { userId: userIdToUse },
          },
        },
      },
    });

    return { userId: userIdToUse, additionalCredits: quantity, remainingCredits: 0 };
  }
  const teamToPay = teamToUse || fallbackTeam;

  if (teamToPay) {
    const { monthly, additional, id } = teamToPay;

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
    return { teamId: id, additionalCredits: additional, monthlyCredits: monthly, remainingCredits: 0 };
  }
}

export async function handleLowCreditBalance({
  userId,
  teamId,
  remainingCredits,
}: {
  userId?: number | null; // user id is always given if it's a user workflows
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

    if (remainingCredits < 500) {
      const creditBalance = await prisma.creditBalance.findUnique({
        where: { userId },
      });

      if (creditBalance?.limitReachedAt) return; // user has already reached limit

      if (!remainingCredits) {
        // user balance is 0 or below 0
        //await sendDisableSmsEmail(userId);
        await prisma.creditBalance.update({
          where: { userId },
          data: {
            limitReachedAt: new Date(),
          },
        });

        //cancelScheduledSmsAndScheduleEmails({ userId: parsedUserId }); -- only user workflows
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

      if (!remainingCredits) {
        // team balance is 0 or below 0
        //await sendDisableSmsEmail(teamId);
        await prisma.creditBalance.update({
          where: { teamId },
          data: {
            limitReachedAt: new Date(),
          },
        });

        //cancelScheduledSmsAndScheduleEmails({ userId: parsedUserId });
        //-->
        //all team workflows but also all of the user workflows  that font have anyother teams with vredits left
        // I need a function that tells me that as user has no other teams with credits left
        // This function needs to be called if a team member of that team has sms scheduled (we only schedule 2 hours in advance)
        // These sms will always be turned into emails, once new credits are added we everything after the 2 hours will be scheduled again
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
