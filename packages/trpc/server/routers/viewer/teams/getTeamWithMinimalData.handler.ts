import { getMinimalTeam } from "@calcom/lib/server/queries/teams";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TGetTeamWithMinimalDataInputSchema } from "./getTeamWithMinimalData.schema";

type GetTeamWithMinimalDataOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetTeamWithMinimalDataInputSchema;
};

export const getTeamWithMinimalData = async ({ ctx, input }: GetTeamWithMinimalDataOptions) => {
  const teamMembership = await prisma.membership.findFirst({
    where: {
      userId: ctx.user.id,
      teamId: input.teamId,
    },
  });

  if (!teamMembership) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "You are not a member of this team.",
    });
  }

  const team = await getMinimalTeam({
    id: input.teamId,
    userId: ctx.user.organization?.isOrgAdmin ? undefined : ctx.user.id,
    isOrgView: input?.isOrg,
  });

  if (!team) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team not found",
    });
  }

  const membership = {
    role: teamMembership.role,
    accepted: teamMembership.accepted,
  };
  return { ...team, membership };
};

export default getTeamWithMinimalData;
