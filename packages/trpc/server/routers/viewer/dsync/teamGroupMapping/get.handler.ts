import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type Options = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getHandler = async ({ ctx }: Options) => {
  // Get org teams
  const teamsQuery = await prisma.team.findMany({
    where: {
      parentId: ctx.user.organizationId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  const teamGroupMappingQuery = await prisma.dSyncTeamGroupMapping.findMany({
    where: {
      orgId: ctx.user.organizationId,
    },
  });

  const teamGroupMapping = teamsQuery.map((team) => {
    return {
      name: team.name,
      slug: team.slug,
    };
  });

  return {
    teamGroupMapping,
  };
};
