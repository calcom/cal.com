import { getCustomDomainService } from "@calcom/features/custom-domains/di/custom-domain-service.container";

import type { TrpcSessionUser } from "../../../types";
import type { TAddInputSchema } from "./custom-domain.add.schema";

type AddHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    organizationId: number;
  };
  input: TAddInputSchema;
};

export const addHandler = async ({ ctx, input }: AddHandlerOptions) => {
  const service = getCustomDomainService();
  return service.addDomain({ teamId: ctx.organizationId, slug: input.slug });
};

export default addHandler;
