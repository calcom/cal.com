import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { getAttributesForTeam } from "@calcom/lib/service/attribute/server/getAttributes";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

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
  const isMemberOfTeam = await MembershipRepository.findFirstByUserIdAndTeamId({ userId: user.id, teamId });

  if (!isMemberOfTeam) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "You are not a member of this team",
    });
  }

  return getAttributesForTeam({ teamId });
}
