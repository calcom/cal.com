import type { InstantMeetingDTO } from "../../dto/types";
import type { WebhookPayload } from "../types";
import type { IInstantMeetingBuilder } from "../versioned/PayloadBuilderFactory";

/**
 * Base instant meeting payload builder with shared logic.
 * Version-specific builders can extend this and override methods as needed.
 */
export abstract class BaseInstantMeetingBuilder implements IInstantMeetingBuilder {
  /**
   * Build the instant meeting webhook payload.
   * Override this method in version-specific builders to modify the payload structure.
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

