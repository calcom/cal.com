import { z } from "zod";

import { getCSATData } from "@calcom/lib/server/queries/insights/getCSATData";
import { getNoShowHosts } from "@calcom/lib/server/queries/insights/getNoShowHosts";

import { authedProcedure, router } from "../../trpc";

const insightsInputSchema = z.object({
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
  teamId: z.number().optional(),
});

export const insightsRouter = router({
  noShowHosts: authedProcedure.input(insightsInputSchema).query(async ({ ctx, input }) => {
    const { startDate, endDate, teamId } = input;
    const userId = ctx.user.id;

    // Verify user has access to team if teamId is provided
    if (teamId) {
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          teamId,
          userId,
        },
      });

      if (!membership) {
        throw new Error("Unauthorized access to team data");
      }
    }

    const data = await getNoShowHosts({
      startDate,
      endDate,
      teamId,
      userId: teamId ? undefined : userId,
    });

    return {
      success: true,
      data,
    };
  }),

  csatData: authedProcedure.input(insightsInputSchema).query(async ({ ctx, input }) => {
    const { startDate, endDate, teamId } = input;
    const userId = ctx.user.id;

    // Verify user has access to team if teamId is provided
    if (teamId) {
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          teamId,
          userId,
        },
      });

      if (!membership) {
        throw new Error("Unauthorized access to team data");
      }
    }

    const data = await getCSATData({
      startDate,
      endDate,
      teamId,
      userId: teamId ? undefined : userId,
    });

    return {
      success: true,
      data,
    };
  }),
});