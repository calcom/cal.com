import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import { WebhookNotifier } from "../notifier/WebhookNotifier";
import { WebhookService } from "./WebhookService";  

// Import the DTO from types to ensure consistency
import type { OOOCreatedDTO } from "../dto/types";

/**
 * Service for creating out-of-office webhook DTOs and emitting webhook events
 * Handles OOO_CREATED webhooks
 */
export class OOOWebhookService extends WebhookService {
  /**
   * Emits an out-of-office created webhook
   */
  static async emitOOOCreated(params: {
    oooEntry: {
      id: number;
      start: string;
      end: string;
      createdAt: string;
      updatedAt: string;
      notes: string | null;
      reason: {
        emoji?: string;
        reason?: string;
      };
      reasonId: number;
      user: {
        id: number;
        name: string | null;
        username: string | null;
        timeZone: string;
        email: string;
      };
      toUser: {
        id: number;
        name: string | null;
        username: string | null;
        email: string;
        timeZone: string;
      } | null;
      uuid: string;
    };
    userId?: number | null;
    teamId?: number | null;
    orgId?: number | null;
    platformClientId?: string;
    isDryRun?: boolean;
  }): Promise<void> {
    const dto: OOOCreatedDTO = {
      triggerEvent: WebhookTriggerEvents.OOO_CREATED,
      createdAt: new Date().toISOString(),
      userId: params.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: params.platformClientId,
      oooEntry: params.oooEntry,
    };

    await WebhookNotifier.emitWebhook(WebhookTriggerEvents.OOO_CREATED, dto, params.isDryRun);
  }
}
