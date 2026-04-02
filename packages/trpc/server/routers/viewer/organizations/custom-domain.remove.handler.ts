import { getCustomDomainService } from "@calcom/features/custom-domains/di/custom-domain-service.container";

import type { TrpcSessionUser } from "../../../types";

type RemoveHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    organizationId: number;
  };
};

export const removeHandler = async ({ ctx }: RemoveHandlerOptions) => {
  const service = getCustomDomainService();
  return service.removeDomain({ teamId: ctx.organizationId });
};

export default removeHandler;
