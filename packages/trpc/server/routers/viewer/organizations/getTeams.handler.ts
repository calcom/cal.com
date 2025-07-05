import { OrganizationRepository } from "@calcom/lib/server/repository/organization";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";

type GetTeamsHandler = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export async function getTeamsHandler({ ctx }: GetTeamsHandler) {
  const currentUser = ctx.user;
  const currentUserOrgId = ctx.user.organizationId ?? currentUser.profiles[0].organizationId;

  if (!currentUserOrgId) throw new TRPCError({ code: "UNAUTHORIZED" });

  return await OrganizationRepository.getTeams({ organizationId: currentUserOrgId });
}

export default getTeamsHandler;
