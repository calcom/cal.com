import { OrganizationPaymentService } from "@calcom/features/ee/organizations/lib/OrganizationPaymentService";

import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateWithPaymentIntentInputSchema } from "./createWithPaymentIntent.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateWithPaymentIntentInputSchema;
};

export const createHandler = async ({ input, ctx }: CreateOptions) => {
  const paymentService = new OrganizationPaymentService(ctx.user);
  return paymentService.createPaymentIntent({
    ...input,
    logo: input.logo ?? null,
    bio: input.bio ?? null,
  });
};

export default createHandler;
