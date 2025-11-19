import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { getAttributesForTeam } from "@calcom/lib/service/attribute/server/getAttributes";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TGetAttributesForTeamInputSchema } from "./getAttributesForTeam.schema";

type GetAttributesForTeamHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetAttributesForTeamInputSchema;
};

export default async function getAttributesForTeamHandler({
  ctx,
  input,
}: GetAttributesForTeamHandlerOptions) {
  const { teamId } = input;
  const { user } = ctx;
  const isMemberOfTeam = await MembershipRepository.findUniqueByUserIdAndTeamId({ userId: user.id, teamId });

  if (!isMemberOfTeam) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "You are not a member of this team",
    });
  }

  return getAttributesForTeam({ teamId });
}
