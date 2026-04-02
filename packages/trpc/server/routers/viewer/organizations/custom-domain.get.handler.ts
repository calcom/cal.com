import { getCustomDomainService } from "@calcom/features/custom-domains/di/custom-domain-service.container";

import type { TrpcSessionUser } from "../../../types";

type GetHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    organizationId: number;
  };
};

export const getHandler = async ({ ctx }: GetHandlerOptions) => {
  const service = getCustomDomainService();
  return service.getDomain(ctx.organizationId);
};

export default getHandler;
