import type { WebhookGroup } from "@calcom/features/webhooks/lib/dto/types";
import { WebhookRepository } from "@calcom/features/webhooks/lib/repository/WebhookRepository";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type GetByViewerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export type WebhooksByViewer = {
  webhookGroups: WebhookGroup[];
  profiles: {
    readOnly?: boolean | undefined;
    slug: string | null;
    name: string | null;
    image?: string | undefined;
    teamId: number | null | undefined;
  }[];
};

export const getByViewerHandler = async ({ ctx }: GetByViewerOptions): Promise<WebhooksByViewer> => {
  // Use the singleton instance to avoid creating new instances repeatedly
  const webhookRepository = WebhookRepository.getInstance();
  return await webhookRepository.getFilteredWebhooksForUser({
    userId: ctx.user.id,
    userRole: ctx.user.role,
  });
};
