import type { FormSubmittedDTO, FormSubmittedNoEventDTO } from "../../dto/types";
import type { WebhookPayload } from "../types";
import type { IFormPayloadBuilder } from "../versioned/PayloadBuilderFactory";

/**
 * Abstract base class for form payload builders.
 *
 * This class defines the interface that all version-specific form payload
 * builders must implement. It does NOT contain any version-specific payload logic.
 *
 * Each webhook version should have its own concrete implementation in
 * versioned/v{VERSION}/FormPayloadBuilder.ts
 */
export abstract class BaseFormPayloadBuilder implements IFormPayloadBuilder {
  /**
   * Build the form webhook payload.
   * Each version must implement this method with its specific payload structure.
   */
  abstract build(dto: FormSubmittedDTO | FormSubmittedNoEventDTO): WebhookPayload;
}
