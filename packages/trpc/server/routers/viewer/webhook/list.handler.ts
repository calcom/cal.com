import { WebhookRepository } from "@calcom/lib/server/repository/webhook";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TListInputSchema } from "./list.schema";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListInputSchema;
};

export const listHandler = async ({ ctx, input }: ListOptions) => {
  return await WebhookRepository.findWebhooksByFilters({ userId: ctx.user.id, input });
};
