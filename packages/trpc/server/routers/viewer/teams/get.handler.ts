import { mapBusinessErrorToTRPCError } from "@calcom/lib/errorMapping";
import { AuthorizationError, NotFoundError } from "@calcom/lib/errors";
import { getTeamWithoutMembers } from "@calcom/lib/server/queries/teams";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";

import type { TrpcSessionUser } from "../../../types";
import type { TGetInputSchema } from "./get.schema";

type GetDataOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetInputSchema;
};

export const get = async ({ ctx, input }: GetDataOptions) => {
  try {
    const teamMembership = await MembershipRepository.findUniqueByUserIdAndTeamId({
      userId: ctx.user.id,
      teamId: input.teamId,
    });

    if (!teamMembership) {
      throw new AuthorizationError("You are not a member of this team.");
    }

    const team = await getTeamWithoutMembers({
      id: input.teamId,
      userId: ctx.user.organization?.isOrgAdmin ? undefined : ctx.user.id,
      isOrgView: input?.isOrg,
    });

    if (!team) {
      throw new NotFoundError("Team not found");
    }

    const membership = {
      role: teamMembership.role,
      accepted: teamMembership.accepted,
    };
    return { ...team, membership };
  } catch (error) {
    throw mapBusinessErrorToTRPCError(error);
  }
};

export default get;
