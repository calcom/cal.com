import { MembershipRole } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../types";
import { findCurrentOrganizationMembership } from "./organizationUtils";

type GetCurrentHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
};

export const getCurrentHandler = async ({ ctx }: GetCurrentHandlerOptions) => {
  const membership = await findCurrentOrganizationMembership({ userId: ctx.user.id });

  if (!membership) {
    return null;
  }

  return {
    ...membership.team,
    role: membership.role,
    canUpdate: membership.role === MembershipRole.OWNER || membership.role === MembershipRole.ADMIN,
  };
};
