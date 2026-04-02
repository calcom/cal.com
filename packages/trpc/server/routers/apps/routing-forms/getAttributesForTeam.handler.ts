import { getAttributesForTeam } from "@calcom/features/attributes/lib/getAttributes";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
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
  const membershipRepository = new MembershipRepository();
  const isMemberOfTeam = await membershipRepository.findUniqueByUserIdAndTeamId({ userId: user.id, teamId });

  if (!isMemberOfTeam) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "You are not a member of this team",
    });
  }

  return getAttributesForTeam({ teamId });
}
