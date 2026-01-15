import type { WebhookTriggerEvents, UserPermissionRole } from "@calcom/prisma/enums";

import type { Webhook, WebhookSubscriber, WebhookGroup } from "../dto/types";

/**
 * Webhook Version enum - defines the payload format versions.
 *
 * This is a TypeScript-only enum (not Prisma).
 * DB operations go through the repository which enforces these values.
 */
export const WebhookVersion = {
  V_2021_10_20: "2021-10-20",
} as const;

export type WebhookVersion = (typeof WebhookVersion)[keyof typeof WebhookVersion];

/**
 * Default webhook version - used for new webhooks and as fallback
 */
export const DEFAULT_WEBHOOK_VERSION = WebhookVersion.V_2021_10_20;

const VALID_WEBHOOK_VERSIONS = new Set<string>(Object.values(WebhookVersion));


export function isValidWebhookVersion(value: string): value is WebhookVersion {
  return VALID_WEBHOOK_VERSIONS.has(value);
}

/**
 * Parse and validate a webhook version string.
 * Throws if the version is invalid.
 */
export function parseWebhookVersion(value: string): WebhookVersion {
  if (!isValidWebhookVersion(value)) {
    throw new Error(
      `Invalid webhook version: "${value}". Valid versions are: ${Object.values(WebhookVersion).join(", ")}`
    );
  }
  return value;
}
export interface GetSubscribersOptions {
  userId?: number | null;
  eventTypeId?: number | null;
  triggerEvent: WebhookTriggerEvents;
  teamId?: number | number[] | null;
  orgId?: number | null;
  oAuthClientId?: string | null;
}

export interface ListWebhooksOptions {
  userId: number;
  appId?: string | null;
  eventTypeId?: number | null;
  eventTriggers?: WebhookTriggerEvents[];
}

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
    version: WebhookVersion;
  }>;
  getFilteredWebhooksForUser(options: { userId: number; userRole?: UserPermissionRole }): Promise<{
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
  listWebhooks(options: ListWebhooksOptions): Promise<Webhook[]>;
}

