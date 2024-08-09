import { getMinimalTeam } from "@calcom/lib/server/queries/teams";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";
import type { TGetTeamWithMinimalDataInputSchema } from "./getTeamWithMinimalData.schema";

type GetTeamWithMinimalDataOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetTeamWithMinimalDataInputSchema;
};

export const getTeamWithMinimalData = async ({ ctx, input }: GetTeamWithMinimalDataOptions) => {
  const team = await getMinimalTeam({
    id: input.teamId,
    currentOrg: ctx.user.profile?.organization ?? null,
    userId: ctx.user.organization?.isOrgAdmin ? undefined : ctx.user.id,
    isOrgView: input?.isOrg,
  });

  const teamMembership = await prisma.membership.findFirst({
    where: {
      userId: ctx.user.id,
      teamId: input.teamId,
    },
  });

  const membership = {
    role: teamMembership.role,
    accepted: teamMembership.accepted,
  };
  return { ...team, membership };
};

export default getTeamWithMinimalData;
