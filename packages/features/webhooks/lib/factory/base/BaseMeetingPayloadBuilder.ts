import type {
  MeetingStartedDTO,
  MeetingEndedDTO,
  AfterHostsNoShowDTO,
  AfterGuestsNoShowDTO,
} from "../../dto/types";
import type { WebhookPayload } from "../types";
import type { IMeetingPayloadBuilder } from "../versioned/PayloadBuilderFactory";

/**
 * Abstract base class for meeting payload builders.
 *
 * This class defines the interface that all version-specific meeting payload
 * builders must implement. It does NOT contain any version-specific payload logic.
 *
 * Each webhook version should have its own concrete implementation in
 * versioned/v{VERSION}/MeetingPayloadBuilder.ts
 */
export abstract class BaseMeetingPayloadBuilder implements IMeetingPayloadBuilder {
  /**
   * Build the meeting webhook payload.
   * Each version must implement this method with its specific payload structure.
   */
  abstract build(
    dto: MeetingStartedDTO | MeetingEndedDTO | AfterHostsNoShowDTO | AfterGuestsNoShowDTO
  ): WebhookPayload;
}
