import { getMinimalTeam } from "@calcom/lib/server/queries/teams";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TGetMinimalInputSchema } from "./getMinimal.schema";

type GetMinimalDataOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetMinimalInputSchema;
};

export const getMinimal = async ({ ctx, input }: GetMinimalDataOptions) => {
  const teamMembership = await MembershipRepository.findFirstByUserIdAndTeamId({
    userId: ctx.user.id,
    teamId: input.teamId,
  });

  if (!teamMembership) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
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

export default getMinimal;
