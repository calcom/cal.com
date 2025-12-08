import type { OOOCreatedDTO } from "../../dto/types";
import type { WebhookPayload } from "../types";
import type { IOOOPayloadBuilder } from "../versioned/PayloadBuilderFactory";

/**
 * Base OOO (Out of Office) payload builder with shared logic.
 * Version-specific builders can extend this and override methods as needed.
 */
export abstract class BaseOOOPayloadBuilder implements IOOOPayloadBuilder {
  /**
   * Build the OOO webhook payload.
   * Override this method in version-specific builders to modify the payload structure.
   */
  build(dto: OOOCreatedDTO): WebhookPayload {
    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: { oooEntry: dto.oooEntry },
    };
  }
}

