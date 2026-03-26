import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ILogger } from "../../interface/infrastructure";
import type { RecordingWebhookTaskPayload } from "../../types/webhookTask";
import { RecordingWebhookDataFetcher } from "./RecordingWebhookDataFetcher";

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn((_locale: string, _ns: string) => {
    const t = ((key: string) => key) as ((key: string) => string) & { locale: string };
    t.locale = _locale;
    return t;
  }),
}));

vi.mock("@calcom/lib/videoTokens", () => ({
  generateVideoToken: vi.fn(() => "mock-token"),
}));

vi.mock("@calcom/lib/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/lib/constants")>();
  return {
    ...actual,
    WEBAPP_URL: "https://app.cal.com",
  };
});

vi.mock("@calcom/app-store/dailyvideo/lib", () => ({
  getBatchProcessorJobAccessLink: vi.fn(() =>
    Promise.resolve({
      transcription: [{ format: "txt", link: "https://daily.co/transcript.txt" }],
    })
  ),
}));

function createMockBooking(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    uid: "booking-uid-1",
    title: "Test Event",
    description: "Test description",
    userPrimaryEmail: null,
    startTime: new Date("2024-01-01T00:00:00Z"),
    endTime: new Date("2024-01-01T01:00:00Z"),
    user: {
      id: 5,
      email: "org@test.com",
      name: "Organizer",
      timeZone: "UTC",
      locale: "en",
    },
    attendees: [{ id: 101, name: "Attendee", email: "att@test.com", timeZone: "UTC", locale: "en" }],
    eventType: { id: 1, customReplyToEmail: null },
    ...overrides,
  };
}

describe("RecordingWebhookDataFetcher", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockBookingRepository: { getBookingForCalEventBuilderFromUid: ReturnType<typeof vi.fn> };
  let fetcher: RecordingWebhookDataFetcher;

  function createMockLogger() {
    return {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      getSubLogger: vi.fn().mockReturnThis(),
    };
  }

  function createPayload(overrides?: Partial<RecordingWebhookTaskPayload>): RecordingWebhookTaskPayload {
    return {
      operationId: "op-1",
      timestamp: new Date().toISOString(),
      triggerEvent: WebhookTriggerEvents.RECORDING_READY,
      recordingId: "rec-1",
      bookingUid: "booking-uid-1",
      eventTypeId: 10,
      userId: 5,
      teamId: 3,
      oAuthClientId: null,
      ...overrides,
    } as RecordingWebhookTaskPayload;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
    mockBookingRepository = {
      getBookingForCalEventBuilderFromUid: vi.fn(),
    };
    fetcher = new RecordingWebhookDataFetcher(
      mockLogger as unknown as ILogger,
      mockBookingRepository as unknown as BookingRepository
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("canHandle", () => {
    it("should return true for RECORDING_READY and RECORDING_TRANSCRIPTION_GENERATED", () => {
      expect(fetcher.canHandle(WebhookTriggerEvents.RECORDING_READY)).toBe(true);
      expect(fetcher.canHandle(WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED)).toBe(true);
    });

    it("should return false for non-recording triggers", () => {
      expect(fetcher.canHandle(WebhookTriggerEvents.BOOKING_CREATED)).toBe(false);
      expect(fetcher.canHandle(WebhookTriggerEvents.FORM_SUBMITTED)).toBe(false);
    });
  });

  describe("fetchEventData", () => {
    it("should return null when recordingId is missing", async () => {
      const payload = createPayload({ recordingId: "" } as Partial<RecordingWebhookTaskPayload>);

      const result = await fetcher.fetchEventData(payload);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("should return null when bookingUid is missing", async () => {
      const payload = createPayload({ bookingUid: "" } as Partial<RecordingWebhookTaskPayload>);

      const result = await fetcher.fetchEventData(payload);

      expect(result).toBeNull();
    });

    it("should return null when booking not found", async () => {
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockResolvedValue(null);
      const payload = createPayload();

      const result = await fetcher.fetchEventData(payload);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("should return calendarEvent matching legacy shape for RECORDING_READY", async () => {
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockResolvedValue(createMockBooking());
      const payload = createPayload({ recordingId: "rec-99" } as Partial<RecordingWebhookTaskPayload>);

      const result = await fetcher.fetchEventData(payload);

      expect(result).not.toBeNull();
      const evt = result?.calendarEvent as Record<string, unknown>;
      expect(evt.type).toBe("Test Event");
      expect(evt.title).toBe("Test Event");
      expect(evt.description).toBe("Test description");
      expect(evt.startTime).toBe("2024-01-01T00:00:00.000Z");
      expect(evt.endTime).toBe("2024-01-01T01:00:00.000Z");
      expect(evt.uid).toBe("booking-uid-1");
      expect((evt.organizer as Record<string, unknown>).email).toBe("org@test.com");
      expect((evt.organizer as Record<string, unknown>).name).toBe("Organizer");
      expect(result?.downloadLink).toBe("https://app.cal.com/api/video/recording?token=mock-token");
    });

    it("should not include extra fields like location, bookingId, conferenceData", async () => {
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockResolvedValue(createMockBooking());
      const payload = createPayload();

      const result = await fetcher.fetchEventData(payload);

      const evt = result?.calendarEvent as Record<string, unknown>;
      expect(evt).not.toHaveProperty("location");
      expect(evt).not.toHaveProperty("bookingId");
      expect(evt).not.toHaveProperty("conferenceData");
      expect(evt).not.toHaveProperty("responses");
    });

    it("should include customReplyToEmail from eventType", async () => {
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockResolvedValue(
        createMockBooking({ eventType: { id: 1, customReplyToEmail: "reply@example.com" } })
      );
      const payload = createPayload();

      const result = await fetcher.fetchEventData(payload);

      const evt = result?.calendarEvent as Record<string, unknown>;
      expect(evt.customReplyToEmail).toBe("reply@example.com");
    });

    it("should set customReplyToEmail to null when eventType has null", async () => {
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockResolvedValue(createMockBooking());
      const payload = createPayload();

      const result = await fetcher.fetchEventData(payload);

      const evt = result?.calendarEvent as Record<string, unknown>;
      expect(evt.customReplyToEmail).toBeNull();
    });

    it("should include attendee id in calendarEvent", async () => {
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockResolvedValue(createMockBooking());
      const payload = createPayload();

      const result = await fetcher.fetchEventData(payload);

      const evt = result?.calendarEvent as Record<string, unknown>;
      const attendees = evt.attendees as Array<Record<string, unknown>>;
      expect(attendees[0].id).toBe(101);
    });

    it("should prefer userPrimaryEmail over user.email for organizer", async () => {
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockResolvedValue(
        createMockBooking({ userPrimaryEmail: "primary@org.com" })
      );
      const payload = createPayload();

      const result = await fetcher.fetchEventData(payload);

      const evt = result?.calendarEvent as Record<string, unknown>;
      const organizer = evt.organizer as Record<string, unknown>;
      expect(organizer.email).toBe("primary@org.com");
    });

    it("should fall back to user.email when userPrimaryEmail is null", async () => {
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockResolvedValue(createMockBooking());
      const payload = createPayload();

      const result = await fetcher.fetchEventData(payload);

      const evt = result?.calendarEvent as Record<string, unknown>;
      const organizer = evt.organizer as Record<string, unknown>;
      expect(organizer.email).toBe("org@test.com");
    });

    it("should throw when repository throws", async () => {
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockRejectedValue(new Error("DB failure"));
      const payload = createPayload();

      await expect(fetcher.fetchEventData(payload)).rejects.toThrow("DB failure");

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should return calendarEvent and downloadLinks for RECORDING_TRANSCRIPTION_GENERATED", async () => {
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockResolvedValue(createMockBooking());

      const payload = createPayload({
        triggerEvent: WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED,
        recordingId: "rec-99",
        batchProcessorJobId: "job-123",
      } as Partial<RecordingWebhookTaskPayload>);

      const result = await fetcher.fetchEventData(payload);

      expect(result).not.toBeNull();
      expect(result?.downloadLinks).toEqual({
        transcription: [{ format: "txt", link: "https://daily.co/transcript.txt" }],
        recording: "https://app.cal.com/api/video/recording?token=mock-token",
      });
      expect(result?.downloadLink).toBeUndefined();
    });

    it("should use fallback values when user fields are missing", async () => {
      mockBookingRepository.getBookingForCalEventBuilderFromUid.mockResolvedValue(
        createMockBooking({ user: null, description: null })
      );
      const payload = createPayload();

      const result = await fetcher.fetchEventData(payload);

      const evt = result?.calendarEvent as Record<string, unknown>;
      const organizer = evt.organizer as Record<string, unknown>;
      expect(organizer.email).toBe("Email-less");
      expect(organizer.name).toBe("Nameless");
      expect(organizer.timeZone).toBe("Europe/London");
      expect(evt.description).toBeUndefined();
    });
  });

  describe("getSubscriberContext", () => {
    it("should pass through all subscriber fields including orgId", () => {
      const payload = createPayload({
        userId: 5,
        eventTypeId: 10,
        teamId: 3,
        orgId: 42,
        oAuthClientId: "oauth-1",
      } as Partial<RecordingWebhookTaskPayload>);

      const context = fetcher.getSubscriberContext(payload);

      expect(context).toEqual({
        triggerEvent: WebhookTriggerEvents.RECORDING_READY,
        userId: 5,
        eventTypeId: 10,
        teamId: 3,
        orgId: 42,
        oAuthClientId: "oauth-1",
      });
    });

    it("should have orgId undefined when not provided", () => {
      const payload = createPayload();

      const context = fetcher.getSubscriberContext(payload);

      expect(context.orgId).toBeUndefined();
    });
  });
});
