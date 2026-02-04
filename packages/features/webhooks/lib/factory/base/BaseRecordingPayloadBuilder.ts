import type { RecordingReadyDTO, TranscriptionGeneratedDTO } from "../../dto/types";
import type { WebhookPayload } from "../types";
import type { IRecordingPayloadBuilder } from "../versioned/PayloadBuilderFactory";

/**
 * Abstract base class for recording payload builders.
 *
 * This class defines the interface that all version-specific recording payload
 * builders must implement. It does NOT contain any version-specific payload logic.
 *
 * Each webhook version should have its own concrete implementation in
 * versioned/v{VERSION}/RecordingPayloadBuilder.ts
 */
export abstract class BaseRecordingPayloadBuilder implements IRecordingPayloadBuilder {
  /**
   * Build the recording webhook payload.
   * Each version must implement this method with its specific payload structure.
   */
  abstract build(dto: RecordingReadyDTO | TranscriptionGeneratedDTO): WebhookPayload;
}
