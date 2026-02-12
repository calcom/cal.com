import type { DelegationCredentialErrorDTO } from "../../dto/types";
import type { WebhookPayload } from "../types";
import type { IDelegationPayloadBuilder } from "../versioned/PayloadBuilderFactory";

/**
 * Abstract base class for delegation payload builders.
 *
 * This class defines the interface that all version-specific delegation payload
 * builders must implement. It does NOT contain any version-specific payload logic.
 *
 * Each webhook version should have its own concrete implementation in
 * versioned/v{VERSION}/DelegationPayloadBuilder.ts
 */
export abstract class BaseDelegationPayloadBuilder implements IDelegationPayloadBuilder {
  /**
   * Build the delegation webhook payload.
   * Each version must implement this method with its specific payload structure.
   */
  abstract build(dto: DelegationCredentialErrorDTO): WebhookPayload;
}
