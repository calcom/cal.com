import type { OOOCreatedDTO } from "../../dto/types";
import type { WebhookPayload } from "../types";
import type { IOOOPayloadBuilder } from "../versioned/PayloadBuilderFactory";

/**
 * Abstract base class for OOO (Out of Office) payload builders.
 *
 * This class defines the interface that all version-specific OOO payload
 * builders must implement. It does NOT contain any version-specific payload logic.
 *
 * Each webhook version should have its own concrete implementation in
 * versioned/v{VERSION}/OOOPayloadBuilder.ts
 */
export abstract class BaseOOOPayloadBuilder implements IOOOPayloadBuilder {
  /**
   * Build the OOO webhook payload.
   * Each version must implement this method with its specific payload structure.
   */
  abstract build(dto: OOOCreatedDTO): WebhookPayload;
}
