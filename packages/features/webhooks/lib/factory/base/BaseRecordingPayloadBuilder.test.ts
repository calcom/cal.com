import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";
import { describe, expect, it, vi } from "vitest";

import type { RecordingReadyDTO, TranscriptionGeneratedDTO } from "../../dto/types";
import { RecordingPayloadBuilder } from "../versioned/v2021-10-20/RecordingPayloadBuilder";

vi.mock("@calcom/lib/dayjs", () => ({
  getUTCOffsetByTimezone: vi.fn((tz: string) => {
    if (tz === "America/New_York") return -300;
    if (tz === "UTC") return 0;
    return null;
  }),
}));

const mockCalendarEvent: CalendarEvent = {
  type: "30min",
  title: "Test Meeting",
  description: "A test booking",
  additionalNotes: "Notes here",
  startTime: "2024-01-15T10:00:00Z",
  endTime: "2024-01-15T10:30:00Z",
  organizer: {
    id: 1,
    email: "organizer@example.com",
    name: "Organizer",
    timeZone: "America/New_York",
    language: { locale: "en", translate: ((key: string) => key) as never },
  },
  attendees: [{ email: "attendee@example.com", name: "Attendee", timeZone: "UTC" }],
  location: "https://cal.com/video/123",
  uid: "booking-uid-123",
  bookingId: 42,
  assignmentReason: { reasonEnum: "ROUND_ROBIN_OPTIMIZATION" },
} as unknown as CalendarEvent;

describe("RecordingPayloadBuilder (v2021-10-20)", () => {
  const builder = new RecordingPayloadBuilder();

  describe("RECORDING_READY", () => {
    it("should spread CalendarEvent fields and include downloadLink", () => {
      const dto: RecordingReadyDTO = {
        triggerEvent: WebhookTriggerEvents.RECORDING_READY,
        createdAt: "2024-01-15T10:00:00Z",
        evt: mockCalendarEvent,
        downloadLink: "https://storage.example.com/recording-123.mp4",
      };

      const payload = builder.build(dto);

      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.RECORDING_READY);
      expect(payload.createdAt).toBe("2024-01-15T10:00:00Z");
      expect(payload.payload.downloadLink).toBe("https://storage.example.com/recording-123.mp4");
      expect(payload.payload.title).toBe("Test Meeting");
      expect(payload.payload.uid).toBe("booking-uid-123");
      expect(payload.payload.bookingId).toBe(42);
      expect(payload.payload.organizer).toBeDefined();
      expect(payload.payload.attendees).toHaveLength(1);
    });

    it("should add utcOffset to organizer and attendees", () => {
      const dto: RecordingReadyDTO = {
        triggerEvent: WebhookTriggerEvents.RECORDING_READY,
        createdAt: "2024-01-15T10:00:00Z",
        evt: mockCalendarEvent,
        downloadLink: "https://storage.example.com/recording.mp4",
      };

      const payload = builder.build(dto);

      expect(payload.payload.organizer.utcOffset).toBe(-300);
      expect(payload.payload.attendees[0].utcOffset).toBe(0);
    });

    it("should strip assignmentReason from CalendarEvent", () => {
      const dto: RecordingReadyDTO = {
        triggerEvent: WebhookTriggerEvents.RECORDING_READY,
        createdAt: "2024-01-15T10:00:00Z",
        evt: mockCalendarEvent,
        downloadLink: "https://storage.example.com/recording.mp4",
      };

      const payload = builder.build(dto);

      expect(payload.payload.assignmentReason).toBeUndefined();
    });
  });

  describe("RECORDING_TRANSCRIPTION_GENERATED", () => {
    it("should spread CalendarEvent fields and include downloadLinks", () => {
      const downloadLinks = {
        transcription: [{ format: "txt", link: "https://storage.example.com/transcript-123.txt" }],
        recording: "https://storage.example.com/recording-123.mp4",
      };
      const dto: TranscriptionGeneratedDTO = {
        triggerEvent: WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED,
        createdAt: "2024-01-15T11:00:00Z",
        evt: mockCalendarEvent,
        downloadLinks,
      };

      const payload = builder.build(dto);

      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED);
      expect(payload.payload.downloadLinks).toEqual(downloadLinks);
      expect(payload.payload.title).toBe("Test Meeting");
      expect(payload.payload.uid).toBe("booking-uid-123");
    });

    it("should handle undefined downloadLinks", () => {
      const dto: TranscriptionGeneratedDTO = {
        triggerEvent: WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED,
        createdAt: "2024-01-15T11:00:00Z",
        evt: mockCalendarEvent,
      };

      const payload = builder.build(dto);

      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED);
      expect(payload.payload.downloadLinks).toBeUndefined();
      expect(payload.payload.title).toBe("Test Meeting");
    });
  });

  it("should route to correct builder method based on trigger", () => {
    const recordingDto: RecordingReadyDTO = {
      triggerEvent: WebhookTriggerEvents.RECORDING_READY,
      createdAt: "2024-01-15T10:00:00Z",
      evt: mockCalendarEvent,
      downloadLink: "https://storage.example.com/recording.mp4",
    };
    const transcriptionDto: TranscriptionGeneratedDTO = {
      triggerEvent: WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED,
      createdAt: "2024-01-15T11:00:00Z",
      evt: mockCalendarEvent,
      downloadLinks: {
        transcription: [{ format: "txt", link: "https://storage.example.com/transcript.txt" }],
        recording: "https://storage.example.com/recording.mp4",
      },
    };

    const recPayload = builder.build(recordingDto);
    const transPayload = builder.build(transcriptionDto);

    expect(recPayload.triggerEvent).toBe(WebhookTriggerEvents.RECORDING_READY);
    expect(transPayload.triggerEvent).toBe(WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED);
    expect(recPayload.payload).toHaveProperty("downloadLink");
    expect(transPayload.payload).toHaveProperty("downloadLinks");
    expect(recPayload.payload).toHaveProperty("title");
    expect(transPayload.payload).toHaveProperty("title");
  });
});
