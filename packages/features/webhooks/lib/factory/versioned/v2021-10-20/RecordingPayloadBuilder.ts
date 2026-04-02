import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { RecordingReadyDTO, TranscriptionGeneratedDTO } from "../../../dto/types";
import { BaseRecordingPayloadBuilder } from "../../base/BaseRecordingPayloadBuilder";
import type { WebhookPayload } from "../../types";

/**
 * Recording payload builder for webhook version 2021-10-20.
 *
 * This is the initial recording webhook payload format.
 * It handles both RECORDING_READY and RECORDING_TRANSCRIPTION_GENERATED events.
 */
export class RecordingPayloadBuilder extends BaseRecordingPayloadBuilder {
  /**
   * Build the recording webhook payload for v2021-10-20.
   */
  build(dto: RecordingReadyDTO | TranscriptionGeneratedDTO): WebhookPayload {
    if (dto.triggerEvent === WebhookTriggerEvents.RECORDING_READY) {
      return this.buildRecordingReadyPayload(dto as RecordingReadyDTO);
    }

    return this.buildTranscriptionPayload(dto as TranscriptionGeneratedDTO);
  }

  /**
   * Build recording ready payload for v2021-10-20.
   */
  private buildRecordingReadyPayload(dto: RecordingReadyDTO): WebhookPayload {
    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: { downloadLink: dto.downloadLink },
    };
  }

  /**
   * Build transcription generated payload for v2021-10-20.
   */
  private buildTranscriptionPayload(dto: TranscriptionGeneratedDTO): WebhookPayload {
    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: { downloadLinks: dto.downloadLinks },
    };
  }
}
