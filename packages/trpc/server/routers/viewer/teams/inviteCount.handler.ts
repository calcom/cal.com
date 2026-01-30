import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type InviteCountOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const inviteCountHandler = async ({ ctx }: InviteCountOptions) => {
  const userId = ctx.user.id;

  const count = await MembershipRepository.countPendingInvitesByUserId({ userId });

  return { count };
};

export default inviteCountHandler;
