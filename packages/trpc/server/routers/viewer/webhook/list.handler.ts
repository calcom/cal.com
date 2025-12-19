import type { Webhook } from "@calcom/features/webhooks/lib/dto/types";
import { WebhookRepository } from "@calcom/features/webhooks/lib/repository/WebhookRepository";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TListInputSchema } from "./list.schema";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListInputSchema;
};

export const listHandler = async ({ ctx, input }: ListOptions): Promise<Webhook[]> => {
  const repository = WebhookRepository.getInstance();

  return repository.listWebhooks({
    userId: ctx.user.id,
    appId: input?.appId,
    eventTypeId: input?.eventTypeId,
    eventTriggers: input?.eventTriggers,
  });
};
