import type { InstantMeetingDTO } from "../../dto/types";
import type { WebhookPayload } from "../types";
import type { IInstantMeetingBuilder } from "../versioned/PayloadBuilderFactory";

/**
 * Abstract base class for instant meeting payload builders.
 *
 * This class defines the interface that all version-specific instant meeting
 * payload builders must implement. It does NOT contain any version-specific payload logic.
 *
 * Each webhook version should have its own concrete implementation in
 * versioned/v{VERSION}/InstantMeetingBuilder.ts
 */
export abstract class BaseInstantMeetingBuilder implements IInstantMeetingBuilder {
  /**
   * Build the instant meeting webhook payload.
   * Each version must implement this method with its specific payload structure.
   */
  abstract build(dto: InstantMeetingDTO): WebhookPayload;
}
