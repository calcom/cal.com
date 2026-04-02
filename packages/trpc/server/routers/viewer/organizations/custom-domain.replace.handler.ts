import { getCustomDomainService } from "@calcom/features/custom-domains/di/custom-domain-service.container";

import type { TrpcSessionUser } from "../../../types";
import type { TReplaceInputSchema } from "./custom-domain.replace.schema";

type ReplaceHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    organizationId: number;
  };
  input: TReplaceInputSchema;
};

export const replaceHandler = async ({ ctx, input }: ReplaceHandlerOptions) => {
  const service = getCustomDomainService();
  return service.replaceDomain({ teamId: ctx.organizationId, newSlug: input.newSlug });
};

export default replaceHandler;
