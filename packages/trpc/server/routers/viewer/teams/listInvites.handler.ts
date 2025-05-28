import { TeamRepository } from "@calcom/lib/server/repository/team";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type ListInvitesOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listInvitesHandler = async ({ ctx }: ListInvitesOptions) => {
  const userId = ctx.user.id;
  return await TeamRepository.listUserInvites(userId);
};

export default listInvitesHandler;
