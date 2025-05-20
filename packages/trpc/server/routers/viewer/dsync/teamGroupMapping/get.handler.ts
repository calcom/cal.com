import userCanCreateTeamGroupMapping from "@calcom/features/ee/dsync/lib/server/userCanCreateTeamGroupMapping";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

type Options = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getHandler = async ({ ctx }: Options) => {
  const { organizationId } = await userCanCreateTeamGroupMapping(ctx.user, ctx.user.organizationId);

  // Get org teams
  const teamsQuery = await ctx.prisma.team.findMany({
    where: {
      parentId: organizationId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  const directoryId = await ctx.prisma.dSyncData.findFirst({
    where: {
      organizationId,
    },
    select: {
      directoryId: true,
    },
  });

  if (!directoryId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Could not find directory id" });
  }

  const teamGroupMappingQuery = await ctx.prisma.dSyncTeamGroupMapping.findMany({
    where: {
      directoryId: directoryId.directoryId,
    },
    select: {
      teamId: true,
      groupName: true,
    },
  });

  const teamGroupMapping = teamsQuery.map((team) => {
    return {
      id: team.id,
      name: team.name,
      slug: team.slug,
      directoryId: directoryId?.directoryId,
      groupNames: teamGroupMappingQuery.reduce((groupNames, mapping) => {
        if (mapping.teamId === team.id) {
          groupNames.push(mapping.groupName);
        }

        return groupNames;
      }, [] as string[]),
    };
  });

  return {
    teamGroupMapping,
  };
};

export default getHandler;
