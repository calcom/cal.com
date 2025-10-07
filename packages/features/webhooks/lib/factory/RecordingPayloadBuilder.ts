import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { RecordingReadyDTO, TranscriptionGeneratedDTO } from "../dto/types";
import type { WebhookPayload } from "./types";

export class RecordingPayloadBuilder {
  canHandle(triggerEvent: WebhookTriggerEvents): boolean {
    return (
      triggerEvent === WebhookTriggerEvents.RECORDING_READY ||
      triggerEvent === WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED
    );
  }

  build(dto: RecordingReadyDTO | TranscriptionGeneratedDTO): WebhookPayload {
    if (dto.triggerEvent === WebhookTriggerEvents.RECORDING_READY) {
      return {
        triggerEvent: dto.triggerEvent,
        createdAt: dto.createdAt,
        payload: { downloadLink: dto.downloadLink },
      };
    }

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: {
        downloadLinks: dto.downloadLinks,
      },
    };
  }
}
