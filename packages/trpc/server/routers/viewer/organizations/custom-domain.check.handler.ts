import { getCustomDomainService } from "@calcom/features/custom-domains/di/custom-domain-service.container";

import type { TrpcSessionUser } from "../../../types";
import type { TCheckInputSchema } from "./custom-domain.check.schema";

type CheckHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    organizationId: number;
  };
  input: TCheckInputSchema;
};

export const checkHandler = async ({ input }: CheckHandlerOptions) => {
  const service = getCustomDomainService();
  return service.checkAvailability(input.slug);
};

export default checkHandler;
