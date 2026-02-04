import type { InstantMeetingDTO } from "../../../dto/types";
import type { WebhookPayload } from "../../types";
import { BaseInstantMeetingBuilder } from "../../base/BaseInstantMeetingBuilder";

/**
 * Instant meeting payload builder for webhook version v2021-10-20.
 *
 * This is the initial instant meeting webhook payload format.
 * It includes notification-style data (title, body, icon, url, actions).
 */
export class InstantMeetingBuilder extends BaseInstantMeetingBuilder {
  /**
   * Build the instant meeting webhook payload for v2021-10-20.
   */
  build(dto: InstantMeetingDTO): WebhookPayload {
    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: {
        title: dto.title,
        body: dto.body,
        icon: dto.icon,
        url: dto.url,
        actions: dto.actions,
        requireInteraction: dto.requireInteraction,
        type: dto.type,
      },
    };
  }
}
