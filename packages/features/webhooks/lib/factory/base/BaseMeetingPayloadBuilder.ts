import type {
  MeetingStartedDTO,
  MeetingEndedDTO,
  AfterHostsNoShowDTO,
  AfterGuestsNoShowDTO,
} from "../../dto/types";
import type { WebhookPayload } from "../types";
import type { IMeetingPayloadBuilder } from "../versioned/PayloadBuilderFactory";

/**
 * Base meeting payload builder with shared logic.
 * Version-specific builders can extend this and override methods as needed.
 */
export abstract class BaseMeetingPayloadBuilder implements IMeetingPayloadBuilder {
  /**
   * Build the meeting webhook payload.
   * Override this method in version-specific builders to modify the payload structure.
   */
  build(
    dto: MeetingStartedDTO | MeetingEndedDTO | AfterHostsNoShowDTO | AfterGuestsNoShowDTO
  ): WebhookPayload {
    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: { ...dto.booking },
    };
  }
}

