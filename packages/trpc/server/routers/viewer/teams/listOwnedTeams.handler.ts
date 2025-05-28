import { TeamRepository } from "@calcom/lib/server/repository/team";
import { MembershipRole } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../types";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listOwnedTeamsHandler = async ({ ctx }: ListOptions) => {
  return await TeamRepository.listOwnedTeams({
    userId: ctx.user.id,
    roles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });
};
