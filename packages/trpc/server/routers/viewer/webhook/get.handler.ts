import { WebhookRepository } from "@calcom/lib/server/repository/webhook";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TGetInputSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetInputSchema;
};

export const getHandler = async ({ ctx: _ctx, input }: GetOptions) => {
  return await WebhookRepository.findByWebhookId(input.webhookId);
};
