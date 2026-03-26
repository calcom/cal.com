import { getTeamWithoutMembers } from "@calcom/features/ee/teams/lib/queries";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TGetInputSchema } from "./get.schema";

type GetDataOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetInputSchema;
};

export const get = async ({ ctx, input }: GetDataOptions) => {
  const membershipRepository = new MembershipRepository();
  const teamMembership = await membershipRepository.findUniqueByUserIdAndTeamId({
    userId: ctx.user.id,
    teamId: input.teamId,
  });

  if (!teamMembership) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not a member of this team.",
    });
  }

  const team = await getTeamWithoutMembers({
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

export default get;
