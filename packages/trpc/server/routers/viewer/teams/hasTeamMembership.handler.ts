import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type HasTeamMembershipOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const hasTeamMembershipHandler = async ({
  ctx,
}: HasTeamMembershipOptions) => {
  const userId = ctx.user.id;
  const hasTeamMembership = await MembershipRepository.hasAnyTeamMembershipByUserId({ userId });
  return { hasTeamMembership };
};

export default hasTeamMembershipHandler;
