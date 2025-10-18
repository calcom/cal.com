import type { WebhookTriggerEvents, UserPermissionRole } from "@calcom/prisma/enums";
import type { Webhook } from "@calcom/prisma/client";

import type { WebhookSubscriber } from "../dto/types";

export interface GetSubscribersOptions {
  userId?: number | null;
  eventTypeId?: number | null;
  triggerEvent: WebhookTriggerEvents;
  teamId?: number | number[] | null;
  orgId?: number | null;
  oAuthClientId?: string | null;
}

type WebhookGroup = {
  teamId?: number | null;
  profile: {
    slug: string | null;
    name: string | null;
    image?: string;
  };
  metadata?: {
    canModify: boolean;
    canDelete: boolean;
  };
  webhooks: Webhook[];
};

export interface IWebhookRepository {
  getSubscribers(options: GetSubscribersOptions): Promise<WebhookSubscriber[]>;
  getWebhookById(id: string): Promise<WebhookSubscriber | null>;
  findByWebhookId(webhookId?: string): Promise<{
    id: string;
    subscriberUrl: string;
    payloadTemplate: string | null;
    active: boolean;
    eventTriggers: WebhookTriggerEvents[];
    secret: string | null;
    teamId: number | null;
    userId: number | null;
    platform: boolean;
    time: number | null;
    timeUnit: string | null;
  }>;
  getFilteredWebhooksForUser(options: {
    userId: number;
    userRole?: UserPermissionRole;
  }): Promise<{
    webhookGroups: WebhookGroup[];
    profiles: {
      teamId: number | null | undefined;
      slug: string | null;
      name: string | null;
      image?: string | undefined;
      canModify?: boolean;
      canDelete?: boolean;
    }[];
  }>;
}
