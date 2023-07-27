import { z } from "zod";

import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";

const ZGetMembersFromOtherTeamInput = z.object({
  teamId: z.number(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

type TGetOtherTeamMembersInputSchema = z.infer<typeof ZGetMembersFromOtherTeamInput>;

type GetMembersFromOtherTeam = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetOtherTeamMembersInputSchema;
};

export const getMembersHandler = async ({ input, ctx }: GetMembersFromOtherTeam) => {
  const { teamId, limit, offset } = input;

  if (!ctx.user.organizationId) return [];

  const teamQuery = await prisma.team.findUnique({
    where: {
      id: ctx.user.organizationId,
    },
    select: {
      members: {
        where: {
          teamId,
          accepted: true,
        },
        select: {
          accepted: true,
          disableImpersonation: true,
          id: true,
          teamId: true,
          role: true,
          userId: true,
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              completedOnboarding: true,
              name: true,
            },
          },
        },
        distinct: ["userId"],
      },
    },
  });
  return teamQuery?.members || [];
};
