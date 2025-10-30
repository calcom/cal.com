import { WebhookRepository } from "@calcom/features/webhooks/lib/repository/WebhookRepository";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TGetInputSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetInputSchema;
};

export const getHandler = async ({ ctx: _ctx, input }: GetOptions) => {
  const webhookRepository = WebhookRepository.getInstance();
  return await webhookRepository.findByWebhookId(input.webhookId);
};
