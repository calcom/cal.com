import { z } from "zod";

import { getTeamWithMembers } from "@lib/queries/teams";

import { createProtectedRouter } from "@server/createRouter";

export const viewerTeamsRouter = createProtectedRouter()
  .query("get", {
    input: z.object({
      teamId: z.number(),
    }),
    async resolve({ input }) {
      return await getTeamWithMembers(input.teamId);
    },
  })
  .query("list", {
    async resolve({ ctx }) {
      return ctx.prisma.team.findMany({
        where: {},
      });
    },
  })
  .mutation("update", {
    input: z.object({
      id: z.number(),
      bio: z.string().optional(),
      name: z.string().optional(),
      logo: z.string().optional(),
      slug: z.string().optional(),
      hideBranding: z.boolean().optional(),
    }),
    async resolve({ ctx, input }) {
      const team = await ctx.prisma.team.findFirst({
        where: {
          id: input.id,
        },
      });
      if (!team) {
        return;
      }
      if (input.teamUrl) {
        const userConflict = await ctx.prisma.team.findMany({
          where: {
            slug: input.teamUrl,
          },
        });
        if (userConflict.some((t) => t.id !== team.id)) {
          // return res.status(409).json({ message: "Team username already taken" });
        }
      }
      await ctx.prisma.team.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
          slug: input.slug,
          logo: input.logo,
          bio: input.bio,
          hideBranding: input.hideBranding,
        },
      });
    },
  });
