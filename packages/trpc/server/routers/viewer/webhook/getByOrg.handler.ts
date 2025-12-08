import { WebhookRepository } from "@calcom/features/webhooks/lib/repository/WebhookRepository";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type getByOrgHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getByOrgHandler = async ({ ctx }: getByOrgHandlerOptions) => {
  // Use the singleton instance to avoid creating new instances repeatedly
  const webhookRepository = WebhookRepository.getInstance();
  return await webhookRepository.getFilteredWebhooksForOrg({
    userId: ctx.user.id,
    userRole: ctx.user.role,
  });
};
