import { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

type ListHandlerInput = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

// This functionality is essentially the same as the teams/list.handler.ts but it's easier for SOC to have it in a separate file.
export const listHandler = async ({ ctx }: ListHandlerInput) => {
  if (!ctx.user.organization?.id) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You do not belong to an organization" });
  }
  return await OrganizationRepository.findCurrentOrg({
    userId: ctx.user.id,
    orgId: ctx.user.organization.id,
  });
};

export default listHandler;
