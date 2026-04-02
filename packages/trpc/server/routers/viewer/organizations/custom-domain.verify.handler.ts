import { getCustomDomainService } from "@calcom/features/custom-domains/di/custom-domain-service.container";

import type { TrpcSessionUser } from "../../../types";

type VerifyHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    organizationId: number;
  };
};

export const verifyHandler = async ({ ctx }: VerifyHandlerOptions) => {
  const service = getCustomDomainService();
  return service.verifyDomainStatus(ctx.organizationId);
};

export default verifyHandler;
