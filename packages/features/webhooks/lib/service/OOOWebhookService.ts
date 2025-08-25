import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { OOOCreatedDTO } from "../dto/types";
import { WebhookNotifier } from "../notifier/WebhookNotifier";
import { WebhookService } from "./WebhookService";

/**
 * Specialized service for out-of-office (OOO) webhook events.
 *
 * @description This service provides high-level methods for emitting out-of-office
 * webhook events when users create OOO entries. It handles the complexity of mapping
 * OOO data to standardized webhook DTOs and coordinates with the webhook notification
 * system to notify external integrations about availability changes.
 *
 * @responsibilities
 * - Creates properly structured DTOs for OOO creation events
 * - Handles OOO entry data mapping and validation for webhook delivery
 * - Coordinates with WebhookNotifier for reliable event emission
 * - Supports dry-run testing for OOO webhook flows
 *
 * @features
 * - Static methods for easy integration without instantiation
 * - Automatic timestamp generation for webhook events
 * - Support for various OOO entry types and configurations
 * - Flexible parameter handling for different OOO scenarios
 * - Built-in dry-run support for testing webhook flows
 *
 * @example Emitting an OOO created webhook
 * ```typescript
 * await OOOWebhookService.emitOOOCreated({
 *   oooEntry: {
 *     id: 123,
 *     start: "2024-01-01T00:00:00Z",
 *     end: "2024-01-07T23:59:59Z",
 *     reason: { emoji: "🏖️", reason: "Vacation" },
 *     user: { id: 456, email: "user@example.com" }
 *   },
 *   userId: 456,
 *   teamId: 789
 * });
 * ```
 *
 * @example Testing OOO webhook with dry-run
 * ```typescript
 * await OOOWebhookService.emitOOOCreated({
 *   oooEntry: oooData,
 *   userId: 456,
 *   isDryRun: true
 * });
 * // Webhook processing is simulated without actual delivery
 * ```
 *
 * @see WebhookNotifier For the underlying webhook emission mechanism
 * @see OOOCreatedDTO For the OOO creation event structure
 */
export class OOOWebhookService extends WebhookService {
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
        name?: string | null;
        username?: string | null;
        email?: string;
        timeZone?: string;
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

    await WebhookNotifier.emitWebhook(dto, params.isDryRun);
  }
}
