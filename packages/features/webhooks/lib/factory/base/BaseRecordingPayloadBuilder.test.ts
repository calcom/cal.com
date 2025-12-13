import { describe, it, expect } from "vitest";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { RecordingReadyDTO, TranscriptionGeneratedDTO } from "../../dto/types";
import { BaseRecordingPayloadBuilder } from "./BaseRecordingPayloadBuilder";

// Concrete implementation for testing
class TestRecordingPayloadBuilder extends BaseRecordingPayloadBuilder {}

describe("BaseRecordingPayloadBuilder", () => {
  const builder = new TestRecordingPayloadBuilder();

  describe("RECORDING_READY", () => {
    it("should build payload with download link", () => {
      const dto: RecordingReadyDTO = {
        triggerEvent: WebhookTriggerEvents.RECORDING_READY,
        createdAt: "2024-01-15T10:00:00Z",
        downloadLink: "https://storage.example.com/recording-123.mp4",
      };

      const payload = builder.build(dto);

      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.RECORDING_READY);
      expect(payload.createdAt).toBe("2024-01-15T10:00:00Z");
      expect(payload.payload.downloadLink).toBe("https://storage.example.com/recording-123.mp4");
    });
  });

  describe("RECORDING_TRANSCRIPTION_GENERATED", () => {
    it("should build payload with download links", () => {
      const dto: TranscriptionGeneratedDTO = {
        triggerEvent: WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED,
        createdAt: "2024-01-15T11:00:00Z",
        downloadLinks: {
          transcript: "https://storage.example.com/transcript-123.txt",
          srt: "https://storage.example.com/transcript-123.srt",
        },
      };

      const payload = builder.build(dto);

      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED);
      expect(payload.payload.downloadLinks).toEqual({
        transcript: "https://storage.example.com/transcript-123.txt",
        srt: "https://storage.example.com/transcript-123.srt",
      });
    });
  });
});

