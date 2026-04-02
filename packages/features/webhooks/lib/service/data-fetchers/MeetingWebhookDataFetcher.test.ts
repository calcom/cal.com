import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ILogger } from "../../interface/infrastructure";
import type { MeetingWebhookTaskPayload } from "../../types/webhookTask";
import { MeetingWebhookDataFetcher } from "./MeetingWebhookDataFetcher";

const mockGetCalEventResponses = vi.fn();

vi.mock("@calcom/features/bookings/lib/getCalEventResponses", () => ({
  getCalEventResponses: (...args: unknown[]) => mockGetCalEventResponses(...args),
}));

const defaultCalEventResponses = {
  responses: {
    name: { label: "your_name", value: "Test User", isHidden: false },
    email: { label: "email_address", value: "test@example.com", isHidden: false },
  },
  userFieldsResponses: {},
};

function createMockLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    getSubLogger: vi.fn().mockReturnThis(),
  };
}

function createMockBookingRepository() {
  return {
    findBookingForMeetingWebhook: vi.fn(),
  };
}

const mockBooking = {
  id: 123,
  uid: "booking-uid-abc",
  title: "Test Meeting",
  description: "",
  startTime: new Date("2026-04-01T10:00:00Z"),
  endTime: new Date("2026-04-01T11:00:00Z"),
  status: "ACCEPTED",
  location: "integrations:daily",
  customInputs: {},
  responses: { name: "Test User", email: "test@example.com" },
  userId: 10,
  userPrimaryEmail: "organizer@example.com",
  eventTypeId: 1,
  metadata: {},
  paid: false,
  createdAt: new Date("2026-04-01T09:00:00Z"),
  updatedAt: new Date("2026-04-01T09:00:00Z"),
  user: {
    email: "organizer@example.com",
    name: "Organizer",
    username: "organizer",
    timeZone: "UTC",
    locale: "en",
  },
  eventType: {
    bookingFields: null,
    team: null,
  },
  attendees: [
    {
      id: 1,
      name: "Attendee",
      email: "attendee@example.com",
      timeZone: "UTC",
      locale: "en",
      phoneNumber: null,
      bookingId: 123,
      noShow: false,
    },
  ],
  payment: [],
  references: [],
};

function createPayload(overrides?: Partial<MeetingWebhookTaskPayload>): MeetingWebhookTaskPayload {
  return {
    operationId: "op-1",
    timestamp: new Date().toISOString(),
    triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
    bookingId: 123,
    bookingUid: "booking-uid-abc",
    startTime: "2026-04-01T10:00:00Z",
    endTime: "2026-04-01T11:00:00Z",
    eventTypeId: 1,
    teamId: 5,
    userId: 10,
    orgId: 20,
    oAuthClientId: null,
    ...overrides,
  } as MeetingWebhookTaskPayload;
}

describe("MeetingWebhookDataFetcher", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockBookingRepo: ReturnType<typeof createMockBookingRepository>;
  let fetcher: MeetingWebhookDataFetcher;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCalEventResponses.mockReturnValue(defaultCalEventResponses);
    mockLogger = createMockLogger();
    mockBookingRepo = createMockBookingRepository();
    fetcher = new MeetingWebhookDataFetcher(mockLogger as unknown as ILogger, mockBookingRepo as never);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("canHandle", () => {
    it("should return true for MEETING_STARTED", () => {
      expect(fetcher.canHandle(WebhookTriggerEvents.MEETING_STARTED)).toBe(true);
    });

    it("should return true for MEETING_ENDED", () => {
      expect(fetcher.canHandle(WebhookTriggerEvents.MEETING_ENDED)).toBe(true);
    });

    it("should return false for other events", () => {
      expect(fetcher.canHandle(WebhookTriggerEvents.BOOKING_CREATED)).toBe(false);
      expect(fetcher.canHandle(WebhookTriggerEvents.FORM_SUBMITTED)).toBe(false);
      expect(fetcher.canHandle(WebhookTriggerEvents.OOO_CREATED)).toBe(false);
    });
  });

  describe("fetchEventData", () => {
    it("should fetch raw booking and apply getCalEventResponses", async () => {
      mockBookingRepo.findBookingForMeetingWebhook.mockResolvedValueOnce(mockBooking);

      const result = await fetcher.fetchEventData(createPayload());

      expect(mockBookingRepo.findBookingForMeetingWebhook).toHaveBeenCalledWith("booking-uid-abc");
      expect(result.data).not.toBeNull();
      expect(result.error).toBeUndefined();

      const data = result.data as Record<string, unknown>;
      // Raw booking fields preserved
      expect(data.id).toBe(123);
      expect(data.uid).toBe("booking-uid-abc");
      expect(data.title).toBe("Test Meeting");
      expect(data.status).toBe("ACCEPTED");
      expect(data.userId).toBe(10);
      expect(data.paid).toBe(false);
      expect(data.user).toBe(mockBooking.user);
      expect(data.attendees).toBe(mockBooking.attendees);
      expect(data.payment).toBe(mockBooking.payment);
      expect(data.references).toBe(mockBooking.references);

      // getCalEventResponses applied (overrides raw responses)
      expect(data.responses).toEqual({
        name: { label: "your_name", value: "Test User", isHidden: false },
        email: { label: "email_address", value: "test@example.com", isHidden: false },
      });
    });

    it("should return { data: null } when booking is not found", async () => {
      mockBookingRepo.findBookingForMeetingWebhook.mockResolvedValueOnce(null);

      const result = await fetcher.fetchEventData(createPayload());

      expect(result.data).toBeNull();
      expect(result.error).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith("Booking not found for meeting webhook", {
        bookingUid: "booking-uid-abc",
      });
    });

    it("should return error in result when DB throws", async () => {
      const dbError = new Error("Connection pool timeout");
      mockBookingRepo.findBookingForMeetingWebhook.mockRejectedValueOnce(dbError);

      const result = await fetcher.fetchEventData(createPayload());

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe("Connection pool timeout");
    });

    it("should return { data: null } when bookingUid is empty", async () => {
      const payload = createPayload({ bookingUid: "" } as Partial<MeetingWebhookTaskPayload>);

      const result = await fetcher.fetchEventData(payload);

      expect(result.data).toBeNull();
      expect(result.error).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith("Missing bookingUid for meeting webhook");
    });

    it("should still return raw booking data if getCalEventResponses fails", async () => {
      mockGetCalEventResponses.mockImplementationOnce(() => {
        throw new Error("bookingFields parse error");
      });
      mockBookingRepo.findBookingForMeetingWebhook.mockResolvedValueOnce(mockBooking);

      const result = await fetcher.fetchEventData(createPayload());

      expect(result.data).not.toBeNull();
      // Raw responses preserved when getCalEventResponses fails
      const data = result.data as Record<string, unknown>;
      expect(data.responses).toEqual({ name: "Test User", email: "test@example.com" });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Failed to build calEventResponses for meeting webhook, using raw responses",
        { bookingUid: "booking-uid-abc" }
      );
    });
  });

  describe("getSubscriberContext", () => {
    it("should extract subscriber context from payload", () => {
      const payload = createPayload({
        userId: 10,
        eventTypeId: 1,
        teamId: 5,
        orgId: 20,
        oAuthClientId: "oauth-client-1",
      } as Partial<MeetingWebhookTaskPayload>);

      const context = fetcher.getSubscriberContext(payload);

      expect(context).toEqual({
        triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
        userId: 10,
        eventTypeId: 1,
        teamId: 5,
        orgId: 20,
        oAuthClientId: "oauth-client-1",
      });
    });

    it("should handle MEETING_ENDED trigger event", () => {
      const payload = createPayload({
        triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
      } as Partial<MeetingWebhookTaskPayload>);

      const context = fetcher.getSubscriberContext(payload);

      expect(context.triggerEvent).toBe(WebhookTriggerEvents.MEETING_ENDED);
    });

    it("should handle null/undefined optional fields", () => {
      const payload = createPayload({
        teamId: null,
        orgId: undefined,
        oAuthClientId: null,
      } as Partial<MeetingWebhookTaskPayload>);

      const context = fetcher.getSubscriberContext(payload);

      expect(context.teamId).toBeNull();
      expect(context.orgId).toBeUndefined();
      expect(context.oAuthClientId).toBeNull();
    });
  });
});
