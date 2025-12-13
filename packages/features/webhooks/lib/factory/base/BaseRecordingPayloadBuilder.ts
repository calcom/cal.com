import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { RecordingReadyDTO, TranscriptionGeneratedDTO } from "../../dto/types";
import type { WebhookPayload } from "../types";
import type { IRecordingPayloadBuilder } from "../versioned/PayloadBuilderFactory";

/**
 * Base recording payload builder with shared logic.
 * Version-specific builders can extend this and override methods as needed.
 */
export abstract class BaseRecordingPayloadBuilder implements IRecordingPayloadBuilder {
  /**
   * Build the recording webhook payload.
   * Override this method in version-specific builders to modify the payload structure.
   */
  build(dto: RecordingReadyDTO | TranscriptionGeneratedDTO): WebhookPayload {
    if (dto.triggerEvent === WebhookTriggerEvents.RECORDING_READY) {
      return this.buildRecordingReadyPayload(dto as RecordingReadyDTO);
    }

    return this.buildTranscriptionPayload(dto as TranscriptionGeneratedDTO);
  }

  /**
   * Build recording ready payload.
   * Override to customize in future versions.
   */
  protected buildRecordingReadyPayload(dto: RecordingReadyDTO): WebhookPayload {
    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: { downloadLink: dto.downloadLink },
    };
  }

  /**
   * Build transcription generated payload.
   * Override to customize in future versions.
   */
  protected buildTranscriptionPayload(dto: TranscriptionGeneratedDTO): WebhookPayload {
    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: { downloadLinks: dto.downloadLinks },
    };
  }
}

