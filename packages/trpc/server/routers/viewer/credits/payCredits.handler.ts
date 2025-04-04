import prisma from "@calcom/prisma";
import { CreditType } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TPayCreditsSchema } from "./payCredits.schema";
import { getAllCreditsForTeam, getAllCreditsForUser } from "./util";

type PayCreditsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TPayCreditsSchema;
};

export const payCreditsHandler = async ({ ctx, input }: PayCreditsOptions) => {
  const { quantity, details, userId } = input;

  // teamId is always undefined for orgs

  const teamId = ctx.user.organizationId ?? input.teamId;

  let teamToUse: { id: number; monthly: number; additional: number } | undefined;
  let userIdToUse: number | undefined;

  if (userId) {
    const userCredits = await getAllCreditsForUser(userId);
    if (userCredits.additionalCredits >= quantity) {
      userIdToUse = userId;
    }
  }

  if (!userIdToUse) {
    if (teamId) {
      const { totalRemainingMonthlyCredits, additionalCredits } = await getAllCreditsForTeam(teamId);

      if (totalRemainingMonthlyCredits + additionalCredits >= quantity) {
        teamToUse = {
          id: teamId,
          monthly: totalRemainingMonthlyCredits,
          additional: totalRemainingMonthlyCredits < quantity ? quantity - totalRemainingMonthlyCredits : 0,
        };
      }

      if (!teamToUse && !ctx.user.organizationId) {
        // no credits for orgs, no need to check team credits they were moved to the org when org was created
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient credits",
        });
      }
    }

    //if given teamId has not enough credits, check i
    if (!teamToUse) {
      // check if user is part of any team that has enough credits
      const teams = await prisma.membership.findMany({
        where: {
          userId: ctx.user.id,
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

      const teamsWithEnoughCredits = teamsWithCredits.filter(
        (team) => team.totalRemainingMonthlyCredits + team.additionalCredits >= quantity
      );

      // or should we look for the team that has the least credits used for this user?
      const {
        totalRemainingMonthlyCredits,
        additionalCredits,
        teamId: teamIdToUse,
      } = teamsWithEnoughCredits.sort(
        (a, b) => a.totalRemainingMonthlyCredits - b.totalRemainingMonthlyCredits
      )[0];

      teamToUse = {
        id: teamIdToUse,
        monthly: totalRemainingMonthlyCredits,
        additional: totalRemainingMonthlyCredits < quantity ? quantity - totalRemainingMonthlyCredits : 0,
      };
    }

    if (!teamToUse) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Insufficient credits",
      });
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

    return { userId: userIdToUse, additionalCredits: quantity };
  }

  if (teamToUse) {
    const { monthly, additional, id } = teamToUse;

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
    return { teamId: id, additionalCredits: additional, monthlyCredits: monthly };
  }
};
