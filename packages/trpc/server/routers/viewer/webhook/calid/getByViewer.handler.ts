import { WebhookRepository } from "@calcom/lib/server/repository/webhook";
import type { Webhook } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type GetByViewerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

type WebhookGroup = {
  calIdTeamId?: number | null;
  profile: {
    slug: string | null;
    name: string | null;
    image?: string;
  };
  metadata?: {
    readOnly: boolean;
  };
  webhooks: Webhook[];
};

export type WebhooksByViewer = {
  webhookGroups: WebhookGroup[];
  profiles: {
    readOnly?: boolean | undefined;
    slug: string | null;
    name: string | null;
    image?: string | undefined;
    calIdTeamId: number | null | undefined;
  }[];
};

export const getByViewerHandler = async ({ ctx }: GetByViewerOptions) => {
  return await WebhookRepository.getAllCalIdWebhooksByUserId({
    userId: ctx.user.id,
    userRole: ctx.user.role,
  });
};
