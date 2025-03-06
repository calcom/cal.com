import { FeaturesRepository } from "@calcom/features/flags/features.repository";
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
  const organizationId = ctx.user.organization?.id ?? ctx.user.profiles[0]?.organizationId;
  if (!organizationId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You do not belong to an organization" });
  }

  const currentOrg = await OrganizationRepository.findCurrentOrg({
    userId: ctx.user.id,
    orgId: organizationId,
  });

  if (!currentOrg) {
    return currentOrg;
  }

  const featureRepo = new FeaturesRepository();
  const hasDomainWideDelegation = await featureRepo.checkIfTeamHasFeature(
    organizationId,
    "domain-wide-delegation"
  );

  return {
    ...currentOrg,
    features: {
      domainWideDelegation: hasDomainWideDelegation,
    },
  };
};

export default listHandler;
