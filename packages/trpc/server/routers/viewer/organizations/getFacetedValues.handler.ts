import { OrganizationRepository } from "@calcom/lib/server/repository/organization";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getFacetedValuesHandler = async ({ ctx }: DeleteOptions) => {
  const { user } = ctx;

  const organizationId = user.organization?.id;

  if (!organizationId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
  }

  return await OrganizationRepository.getFacetedValues({ organizationId });
};

export default getFacetedValuesHandler;
