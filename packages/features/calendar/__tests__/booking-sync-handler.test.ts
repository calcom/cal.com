import { BookingStatus } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { CalendarSyncEvent } from "../services/calendar-sync-service";
import { DefaultBookingSyncHandler, extractBookingUid } from "../services/booking-sync-handler";

// ---------------------------------------------------------------------------
// Logger spy
// ---------------------------------------------------------------------------

const logSpies = vi.hoisted(() => ({
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => logSpies,
  },
}));

// ---------------------------------------------------------------------------
// Dynamic import mocks
// ---------------------------------------------------------------------------

const mockHandleCancelBooking = vi.fn().mockResolvedValue(undefined);
const mockCreateBooking = vi.fn().mockResolvedValue(undefined);

vi.mock("@calcom/features/bookings/lib/handleCancelBooking", () => ({
  default: mockHandleCancelBooking,
}));

vi.mock("@calcom/features/bookings/di/RegularBookingService.container", () => ({
  getRegularBookingService: () => ({
    createBooking: mockCreateBooking,
  }),
}));

vi.mock("@calcom/lib/idempotencyKey/idempotencyKeyService", () => ({
  IdempotencyKeyService: {
    generate: vi.fn().mockReturnValue("mock-idempotency-key"),
  },
}));

// ---------------------------------------------------------------------------
// BookingRepository mock factory
// ---------------------------------------------------------------------------

function createMockBookingRepository() {
  return {
    findByUid: vi.fn(),
    findLatestBookingInRescheduleChain: vi.fn(),
    findByRecurringEventIdAndStartTime: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
  };
}

type MockBookingRepository = ReturnType<typeof createMockBookingRepository>;

// ---------------------------------------------------------------------------
// Test booking factory
// ---------------------------------------------------------------------------

function makeBooking(overrides: Record<string, unknown> = {}) {
  return {
    uid: "booking-123",
    status: BookingStatus.ACCEPTED,
    userId: 1,
    userPrimaryEmail: "host@example.com",
    recurringEventId: null,
    rescheduled: false,
    startTime: new Date("2026-04-01T10:00:00Z"),
    endTime: new Date("2026-04-01T11:00:00Z"),
    eventTypeId: 42,
    title: "Test Meeting",
    description: "A test meeting",
    location: "https://cal.com/video/test",
    responses: {},
    smsReminderNumber: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// CalendarSyncEvent factory
// ---------------------------------------------------------------------------

function makeSyncEvent(overrides: Partial<CalendarSyncEvent> = {}): CalendarSyncEvent {
  return {
    iCalUID: "booking-123@cal.com",
    status: "confirmed",
    start: new Date("2026-04-01T14:00:00Z"),
    end: new Date("2026-04-01T15:00:00Z"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DefaultBookingSyncHandler", () => {
  let handler: DefaultBookingSyncHandler;
  let repo: MockBookingRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = createMockBookingRepository();
    handler = new DefaultBookingSyncHandler(repo as never);
  });

  // =========================================================================
  // extractBookingUid
  // =========================================================================

  describe("extractBookingUid", () => {
    test("extracts uid before @ sign", () => {
      expect(extractBookingUid("booking-123@cal.com")).toBe("booking-123");
    });

    test("returns null for empty string", () => {
      expect(extractBookingUid("")).toBeNull();
    });

    test("returns null for string starting with @", () => {
      expect(extractBookingUid("@cal.com")).toBeNull();
    });

    test("uses part before first @ when multiple @ signs", () => {
      expect(extractBookingUid("uid@domain@extra")).toBe("uid");
    });

    test("returns the whole string when no @ sign", () => {
      expect(extractBookingUid("plain-uid")).toBe("plain-uid");
    });
  });

  // =========================================================================
  // cancelByICalUID -- basic scenarios
  // =========================================================================

  describe("cancelByICalUID", () => {
    test("cancels a valid booking via handleCancelBooking and returns cancelled", async () => {
      const booking = makeBooking();
      repo.findByUid.mockResolvedValue(booking);

      const result = await handler.cancelByICalUID(makeSyncEvent({ status: "cancelled" }), 1);

      expect(result).toBe("cancelled");
      expect(repo.findByUid).toHaveBeenCalledWith({ bookingUid: "booking-123" });
      expect(mockHandleCancelBooking).toHaveBeenCalledWith({
        userId: 1,
        actionSource: "SYSTEM",
        bookingData: {
          uid: "booking-123",
          cancellationReason: "Cancelled on user's calendar",
          cancelledBy: "host@example.com",
          skipCalendarSyncTaskCancellation: true,
        },
      });
    });

    test("returns skipped when iCalUID has no booking UID (empty before @)", async () => {
      const result = await handler.cancelByICalUID(makeSyncEvent({ iCalUID: "@cal.com" }), 1);

      expect(result).toBe("skipped");
      expect(repo.findByUid).not.toHaveBeenCalled();
      expect(mockHandleCancelBooking).not.toHaveBeenCalled();
    });

    test("returns skipped when booking is not found", async () => {
      repo.findByUid.mockResolvedValue(null);

      const result = await handler.cancelByICalUID(makeSyncEvent({ iCalUID: "nonexistent@cal.com" }), 1);

      expect(result).toBe("skipped");
      expect(mockHandleCancelBooking).not.toHaveBeenCalled();
    });

    test("returns skipped when booking is already cancelled", async () => {
      repo.findByUid.mockResolvedValue(makeBooking({ status: BookingStatus.CANCELLED }));

      const result = await handler.cancelByICalUID(makeSyncEvent(), 1);

      expect(result).toBe("skipped");
      expect(mockHandleCancelBooking).not.toHaveBeenCalled();
    });

    test("returns skipped when calendarUserId does not match booking host", async () => {
      repo.findByUid.mockResolvedValue(makeBooking({ userId: 99 }));

      const result = await handler.cancelByICalUID(makeSyncEvent(), 1);

      expect(result).toBe("skipped");
      expect(mockHandleCancelBooking).not.toHaveBeenCalled();
    });

    test("returns skipped when booking is missing userPrimaryEmail", async () => {
      repo.findByUid.mockResolvedValue(makeBooking({ userPrimaryEmail: null }));

      const result = await handler.cancelByICalUID(makeSyncEvent(), 1);

      expect(result).toBe("skipped");
      expect(mockHandleCancelBooking).not.toHaveBeenCalled();
    });

    test("follows reschedule chain and cancels the latest booking", async () => {
      const originalBooking = makeBooking({ rescheduled: true });
      const latestBooking = makeBooking({
        uid: "booking-456",
        startTime: new Date("2026-04-02T10:00:00Z"),
        endTime: new Date("2026-04-02T11:00:00Z"),
      });

      repo.findByUid.mockResolvedValue(originalBooking);
      repo.findLatestBookingInRescheduleChain.mockResolvedValue(latestBooking);

      await handler.cancelByICalUID(makeSyncEvent(), 1);

      expect(repo.findLatestBookingInRescheduleChain).toHaveBeenCalledWith({ bookingUid: "booking-123" });
      expect(mockHandleCancelBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingData: expect.objectContaining({
            uid: "booking-456",
          }),
        })
      );
    });

    test("re-checks cancellation after reschedule chain resolution", async () => {
      const originalBooking = makeBooking({ rescheduled: true });
      const latestBooking = makeBooking({
        uid: "booking-456",
        status: BookingStatus.CANCELLED,
      });

      repo.findByUid.mockResolvedValue(originalBooking);
      repo.findLatestBookingInRescheduleChain.mockResolvedValue(latestBooking);

      await handler.cancelByICalUID(makeSyncEvent(), 1);

      expect(mockHandleCancelBooking).not.toHaveBeenCalled();
    });

    test("re-checks userId after reschedule chain resolution", async () => {
      const originalBooking = makeBooking({ rescheduled: true });
      const latestBooking = makeBooking({
        uid: "booking-456",
        userId: 99, // different host
      });

      repo.findByUid.mockResolvedValue(originalBooking);
      repo.findLatestBookingInRescheduleChain.mockResolvedValue(latestBooking);

      await handler.cancelByICalUID(makeSyncEvent(), 1);

      expect(mockHandleCancelBooking).not.toHaveBeenCalled();
    });

    test("re-checks userPrimaryEmail after reschedule chain resolution", async () => {
      const originalBooking = makeBooking({ rescheduled: true });
      const latestBooking = makeBooking({
        uid: "booking-456",
        userPrimaryEmail: null,
      });

      repo.findByUid.mockResolvedValue(originalBooking);
      repo.findLatestBookingInRescheduleChain.mockResolvedValue(latestBooking);

      await handler.cancelByICalUID(makeSyncEvent(), 1);

      expect(mockHandleCancelBooking).not.toHaveBeenCalled();
    });

    test("passes skipCalendarSyncTaskCancellation to prevent infinite loops", async () => {
      repo.findByUid.mockResolvedValue(makeBooking());

      await handler.cancelByICalUID(makeSyncEvent(), 1);

      expect(mockHandleCancelBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingData: expect.objectContaining({
            skipCalendarSyncTaskCancellation: true,
          }),
        })
      );
    });

    // --- Recurring event instance resolution ---

    test("resolves correct recurring instance using originalStartTime", async () => {
      const booking1 = makeBooking({
        recurringEventId: "rec-series-1",
        startTime: new Date("2026-04-01T10:00:00Z"),
      });
      const booking2 = makeBooking({
        uid: "booking-456",
        recurringEventId: "rec-series-1",
        startTime: new Date("2026-04-08T10:00:00Z"),
      });

      repo.findByUid
        .mockResolvedValueOnce(booking1)
        .mockResolvedValueOnce(booking2);

      repo.findByRecurringEventIdAndStartTime.mockResolvedValue({
        id: 2,
        uid: "booking-456",
      });

      await handler.cancelByICalUID(
        makeSyncEvent({
          originalStartTime: new Date("2026-04-08T10:00:00Z"),
          start: new Date("2026-04-08T10:00:00Z"),
        }),
        1
      );

      expect(repo.findByRecurringEventIdAndStartTime).toHaveBeenCalledWith({
        recurringEventId: "rec-series-1",
        startTime: new Date("2026-04-08T10:00:00Z"),
      });
      expect(mockHandleCancelBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingData: expect.objectContaining({
            uid: "booking-456",
          }),
        })
      );
    });

    test("falls back to event.start when originalStartTime is null for recurring cancel", async () => {
      const booking = makeBooking({
        recurringEventId: "rec-series-1",
        startTime: new Date("2026-04-01T10:00:00Z"),
      });

      repo.findByUid.mockResolvedValue(booking);
      repo.findByRecurringEventIdAndStartTime.mockResolvedValue(null);

      await handler.cancelByICalUID(
        makeSyncEvent({
          start: new Date("2026-04-01T10:00:00Z"),
          originalStartTime: null,
        }),
        1
      );

      expect(repo.findByRecurringEventIdAndStartTime).toHaveBeenCalledWith({
        recurringEventId: "rec-series-1",
        startTime: new Date("2026-04-01T10:00:00Z"),
      });
      expect(mockHandleCancelBooking).toHaveBeenCalled();
    });

    test("returns skipped when recurring instance cannot be resolved and times differ", async () => {
      const booking = makeBooking({
        recurringEventId: "rec-series-1",
        startTime: new Date("2026-04-01T10:00:00Z"),
      });

      repo.findByUid.mockResolvedValue(booking);
      repo.findByRecurringEventIdAndStartTime.mockResolvedValue(null);

      const result = await handler.cancelByICalUID(
        makeSyncEvent({
          start: new Date("2026-04-08T10:00:00Z"),
          originalStartTime: new Date("2026-04-08T10:00:00Z"),
        }),
        1
      );

      expect(result).toBe("skipped");
      expect(mockHandleCancelBooking).not.toHaveBeenCalled();
      expect(logSpies.debug).toHaveBeenCalledWith(
        "resolveBooking: skipping, could not resolve correct recurring instance",
        expect.objectContaining({
          bookingUid: "booking-123",
          recurringEventId: "rec-series-1",
        })
      );
    });

    test("does not attempt recurring resolution for non-recurring bookings", async () => {
      repo.findByUid.mockResolvedValue(makeBooking({ recurringEventId: null }));

      await handler.cancelByICalUID(makeSyncEvent(), 1);

      expect(repo.findByRecurringEventIdAndStartTime).not.toHaveBeenCalled();
      expect(mockHandleCancelBooking).toHaveBeenCalled();
    });

    test("follows reschedule chain even when original booking is CANCELLED (rescheduled=true)", async () => {
      // This is the key scenario: when a booking is rescheduled via Cal.com,
      // the original has status=CANCELLED and rescheduled=true. The code must
      // follow the chain to the active booking instead of returning early.
      const originalBooking = makeBooking({
        status: BookingStatus.CANCELLED,
        rescheduled: true,
      });
      const latestBooking = makeBooking({
        uid: "booking-456",
        status: BookingStatus.ACCEPTED,
      });

      repo.findByUid.mockResolvedValue(originalBooking);
      repo.findLatestBookingInRescheduleChain.mockResolvedValue(latestBooking);

      await handler.cancelByICalUID(makeSyncEvent(), 1);

      expect(repo.findLatestBookingInRescheduleChain).toHaveBeenCalledWith({ bookingUid: "booking-123" });
      expect(mockHandleCancelBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingData: expect.objectContaining({
            uid: "booking-456",
          }),
        })
      );
    });
  });

  // =========================================================================
  // rescheduleByICalUID -- basic scenarios
  // =========================================================================

  describe("rescheduleByICalUID", () => {
    test("reschedules a valid booking via regularBookingService.createBooking", async () => {
      const booking = makeBooking();
      repo.findByUid.mockResolvedValue(booking);

      const result = await handler.rescheduleByICalUID(makeSyncEvent(), 1);

      expect(result).toBe("rescheduled");
      expect(repo.findByUid).toHaveBeenCalledWith({ bookingUid: "booking-123" });
      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingData: expect.objectContaining({
            eventTypeId: 42,
            rescheduleUid: "booking-123",
          }),
          bookingMeta: {
            skipCalendarSyncTaskCreation: true,
            skipAvailabilityCheck: true,
            skipEventLimitsCheck: true,
            skipBookingTimeOutOfBoundsCheck: true,
          },
        })
      );
    });

    test("returns skipped when iCalUID has no booking UID", async () => {
      const result = await handler.rescheduleByICalUID(makeSyncEvent({ iCalUID: "@cal.com" }), 1);

      expect(result).toBe("skipped");
      expect(repo.findByUid).not.toHaveBeenCalled();
      expect(mockCreateBooking).not.toHaveBeenCalled();
    });

    test("returns skipped when booking is not found", async () => {
      repo.findByUid.mockResolvedValue(null);

      const result = await handler.rescheduleByICalUID(makeSyncEvent({ iCalUID: "nonexistent@cal.com" }), 1);

      expect(result).toBe("skipped");
      expect(mockCreateBooking).not.toHaveBeenCalled();
    });

    test("returns skipped when booking is already cancelled", async () => {
      repo.findByUid.mockResolvedValue(makeBooking({ status: BookingStatus.CANCELLED }));

      const result = await handler.rescheduleByICalUID(makeSyncEvent(), 1);

      expect(result).toBe("skipped");
      expect(mockCreateBooking).not.toHaveBeenCalled();
    });

    test("returns skipped when calendarUserId does not match booking host", async () => {
      repo.findByUid.mockResolvedValue(makeBooking({ userId: 99 }));

      const result = await handler.rescheduleByICalUID(makeSyncEvent(), 1);

      expect(result).toBe("skipped");
      expect(mockCreateBooking).not.toHaveBeenCalled();
    });

    test("returns skipped when booking is missing eventTypeId", async () => {
      repo.findByUid.mockResolvedValue(makeBooking({ eventTypeId: null }));

      const result = await handler.rescheduleByICalUID(makeSyncEvent(), 1);

      expect(result).toBe("skipped");
      expect(mockCreateBooking).not.toHaveBeenCalled();
    });

    test("follows reschedule chain even when original booking is CANCELLED (rescheduled=true)", async () => {
      // When a booking is rescheduled via Cal.com, the original has
      // status=CANCELLED and rescheduled=true. Must follow the chain.
      const originalBooking = makeBooking({
        status: BookingStatus.CANCELLED,
        rescheduled: true,
      });
      const latestBooking = makeBooking({
        uid: "booking-456",
        status: BookingStatus.ACCEPTED,
        startTime: new Date("2026-04-02T10:00:00Z"),
        endTime: new Date("2026-04-02T11:00:00Z"),
      });

      repo.findByUid.mockResolvedValue(originalBooking);
      repo.findLatestBookingInRescheduleChain.mockResolvedValue(latestBooking);

      const result = await handler.rescheduleByICalUID(makeSyncEvent(), 1);

      expect(result).toBe("rescheduled");
      expect(repo.findLatestBookingInRescheduleChain).toHaveBeenCalledWith({ bookingUid: "booking-123" });
      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingData: expect.objectContaining({
            rescheduleUid: "booking-456",
          }),
        })
      );
    });

    test("follows reschedule chain and reschedules from the latest booking", async () => {
      const originalBooking = makeBooking({ rescheduled: true });
      const latestBooking = makeBooking({
        uid: "booking-456",
        startTime: new Date("2026-04-02T10:00:00Z"),
        endTime: new Date("2026-04-02T11:00:00Z"),
      });

      repo.findByUid.mockResolvedValue(originalBooking);
      repo.findLatestBookingInRescheduleChain.mockResolvedValue(latestBooking);

      await handler.rescheduleByICalUID(makeSyncEvent(), 1);

      expect(repo.findLatestBookingInRescheduleChain).toHaveBeenCalledWith({ bookingUid: "booking-123" });
      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingData: expect.objectContaining({
            rescheduleUid: "booking-456",
          }),
        })
      );
    });

    test("re-checks cancellation after reschedule chain resolution", async () => {
      const originalBooking = makeBooking({ rescheduled: true });
      const latestBooking = makeBooking({
        uid: "booking-456",
        status: BookingStatus.CANCELLED,
      });

      repo.findByUid.mockResolvedValue(originalBooking);
      repo.findLatestBookingInRescheduleChain.mockResolvedValue(latestBooking);

      const result = await handler.rescheduleByICalUID(makeSyncEvent(), 1);

      expect(repo.findLatestBookingInRescheduleChain).toHaveBeenCalledWith({ bookingUid: "booking-123" });
      expect(mockCreateBooking).not.toHaveBeenCalled();
      expect(result).toBe("skipped");
    });

    test("re-checks userId after reschedule chain resolution", async () => {
      const originalBooking = makeBooking({ rescheduled: true });
      const latestBooking = makeBooking({
        uid: "booking-456",
        userId: 99, // different host
      });

      repo.findByUid.mockResolvedValue(originalBooking);
      repo.findLatestBookingInRescheduleChain.mockResolvedValue(latestBooking);

      const result = await handler.rescheduleByICalUID(makeSyncEvent(), 1);

      expect(mockCreateBooking).not.toHaveBeenCalled();
      expect(result).toBe("skipped");
    });

    test("re-checks eventTypeId after reschedule chain resolution", async () => {
      const originalBooking = makeBooking({ rescheduled: true });
      const latestBooking = makeBooking({
        uid: "booking-456",
        eventTypeId: null,
      });

      repo.findByUid.mockResolvedValue(originalBooking);
      repo.findLatestBookingInRescheduleChain.mockResolvedValue(latestBooking);

      const result = await handler.rescheduleByICalUID(makeSyncEvent(), 1);

      expect(mockCreateBooking).not.toHaveBeenCalled();
      expect(result).toBe("skipped");
    });

    // --- Duration preservation ---

    test("preserves original booking duration when rescheduling", async () => {
      const booking = makeBooking({
        startTime: new Date("2026-04-01T10:00:00Z"),
        endTime: new Date("2026-04-01T11:30:00Z"),
      });
      repo.findByUid.mockResolvedValue(booking);

      await handler.rescheduleByICalUID(
        makeSyncEvent({
          start: new Date("2026-04-01T14:00:00Z"),
          end: new Date("2026-04-01T16:00:00Z"),
        }),
        1
      );

      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingData: expect.objectContaining({
            start: "2026-04-01T14:00:00.000Z",
            end: "2026-04-01T15:30:00.000Z",
          }),
        })
      );
    });

    // --- Time change detection ---

    test("returns field_update when start time matches and fields changed", async () => {
      const existingStart = new Date("2026-04-01T10:00:00Z");
      repo.findByUid.mockResolvedValue(makeBooking({ startTime: existingStart, title: "Old" }));

      const result = await handler.rescheduleByICalUID(
        makeSyncEvent({ start: existingStart, title: "New" }),
        1
      );

      expect(result).toBe("field_update");
      expect(mockCreateBooking).not.toHaveBeenCalled();
    });

    test("returns skipped when start time matches and no fields changed", async () => {
      const existingStart = new Date("2026-04-01T10:00:00Z");
      repo.findByUid.mockResolvedValue(makeBooking({ startTime: existingStart }));

      const result = await handler.rescheduleByICalUID(
        makeSyncEvent({ start: existingStart }),
        1
      );

      expect(result).toBe("skipped");
      expect(mockCreateBooking).not.toHaveBeenCalled();
    });

    test("returns rescheduled when start time differs", async () => {
      repo.findByUid.mockResolvedValue(makeBooking());

      const result = await handler.rescheduleByICalUID(
        makeSyncEvent({ start: new Date("2026-04-01T14:00:00Z") }),
        1
      );

      expect(result).toBe("rescheduled");
      expect(mockCreateBooking).toHaveBeenCalled();
    });

    // --- Idempotency key ---

    test("passes idempotency key in reschedule booking data", async () => {
      repo.findByUid.mockResolvedValue(makeBooking());

      await handler.rescheduleByICalUID(makeSyncEvent(), 1);

      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingData: expect.objectContaining({
            idempotencyKey: "mock-idempotency-key",
          }),
        })
      );
    });

    // --- Metadata ---

    test("passes calendar event metadata in reschedule booking data", async () => {
      repo.findByUid.mockResolvedValue(makeBooking());

      await handler.rescheduleByICalUID(
        makeSyncEvent({
          timeZone: "America/New_York",
          recurringEventId: "rec-1",
          originalStartTime: new Date("2026-04-01T10:00:00Z"),
        }),
        1
      );

      const call = mockCreateBooking.mock.calls[0][0];
      const meta = call.bookingData.metadata;
      expect(meta).toHaveProperty("calendarSubscriptionEvent");
      const parsed = JSON.parse(meta.calendarSubscriptionEvent);
      expect(parsed.timeZone).toBe("America/New_York");
      expect(parsed.recurringEventId).toBe("rec-1");
    });

    // --- Timezone passthrough ---

    test("passes event timezone to reschedule booking data", async () => {
      repo.findByUid.mockResolvedValue(makeBooking());

      await handler.rescheduleByICalUID(
        makeSyncEvent({ timeZone: "Europe/London" }),
        1
      );

      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingData: expect.objectContaining({
            timeZone: "Europe/London",
          }),
        })
      );
    });

    test("defaults to UTC when event has no timezone", async () => {
      repo.findByUid.mockResolvedValue(makeBooking());

      await handler.rescheduleByICalUID(
        makeSyncEvent({ timeZone: undefined }),
        1
      );

      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingData: expect.objectContaining({
            timeZone: "UTC",
          }),
        })
      );
    });

    // --- Response merging ---

    test("merges booking responses with event data overrides", async () => {
      repo.findByUid.mockResolvedValue(
        makeBooking({
          responses: { name: "Original Name", email: "user@example.com" },
        })
      );

      await handler.rescheduleByICalUID(
        makeSyncEvent({ title: "Updated Title", description: "Updated desc" }),
        1
      );

      const call = mockCreateBooking.mock.calls[0][0];
      const responses = call.bookingData.responses;
      expect(responses.name).toBe("Original Name");
      expect(responses.email).toBe("user@example.com");
      expect(responses.title).toBe("Updated Title");
      expect(responses.notes).toBe("Updated desc");
    });

    test("builds fallback responses from booking fields when responses is empty", async () => {
      repo.findByUid.mockResolvedValue(
        makeBooking({
          responses: null,
          title: "Meeting",
          description: "notes here",
          userPrimaryEmail: "host@example.com",
          location: "Zoom",
        })
      );

      await handler.rescheduleByICalUID(makeSyncEvent(), 1);

      const call = mockCreateBooking.mock.calls[0][0];
      const responses = call.bookingData.responses;
      expect(responses.name).toBe("Meeting");
      expect(responses.email).toBe("host@example.com");
      expect(responses.notes).toBe("notes here");
    });
  });

  // =========================================================================
  // rescheduleByICalUID -- recurring event scenarios
  // =========================================================================

  describe("rescheduleByICalUID -- recurring events", () => {
    test("resolves correct recurring instance using originalStartTime", async () => {
      const booking1 = makeBooking({
        recurringEventId: "rec-series-1",
        startTime: new Date("2026-04-01T10:00:00Z"),
      });
      const booking2 = makeBooking({
        uid: "booking-456",
        recurringEventId: "rec-series-1",
        startTime: new Date("2026-04-08T10:00:00Z"),
        endTime: new Date("2026-04-08T11:00:00Z"),
      });

      repo.findByUid
        .mockResolvedValueOnce(booking1)
        .mockResolvedValueOnce(booking2);

      repo.findByRecurringEventIdAndStartTime.mockResolvedValue({
        id: 2,
        uid: "booking-456",
      });

      await handler.rescheduleByICalUID(
        makeSyncEvent({
          start: new Date("2026-04-09T10:00:00Z"),
          originalStartTime: new Date("2026-04-08T10:00:00Z"),
        }),
        1
      );

      expect(repo.findByRecurringEventIdAndStartTime).toHaveBeenCalledWith({
        recurringEventId: "rec-series-1",
        startTime: new Date("2026-04-08T10:00:00Z"),
      });
      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingData: expect.objectContaining({
            rescheduleUid: "booking-456",
          }),
        })
      );
    });

    test("skips unmodified recurring instance (originalStartTime === start)", async () => {
      const sameTime = new Date("2026-04-09T10:00:00Z");
      // booking-123 is the first instance (from iCalUID)
      const booking1 = makeBooking({
        recurringEventId: "rec-series-1",
        startTime: new Date("2026-04-01T10:00:00Z"),
        endTime: new Date("2026-04-01T11:00:00Z"),
      });
      // Instance resolution finds a different booking, but its DB startTime was
      // updated independently (e.g., previously rescheduled), so it differs from event.start.
      // originalStartTime === start tells us the instance hasn't actually moved.
      const resolvedInstance = makeBooking({
        uid: "booking-instance-2",
        recurringEventId: "rec-series-1",
        startTime: new Date("2026-04-08T10:00:00Z"),
        endTime: new Date("2026-04-08T11:00:00Z"),
      });

      repo.findByUid.mockResolvedValueOnce(booking1).mockResolvedValueOnce(resolvedInstance);
      repo.findByRecurringEventIdAndStartTime.mockResolvedValue({
        id: 2,
        uid: "booking-instance-2",
      });

      await handler.rescheduleByICalUID(
        makeSyncEvent({
          start: sameTime,
          originalStartTime: sameTime,
        }),
        1
      );

      expect(mockCreateBooking).not.toHaveBeenCalled();
      expect(logSpies.debug).toHaveBeenCalledWith(
        "rescheduleByICalUID: skipping unmodified recurring instance",
        expect.objectContaining({
          recurringEventId: "rec-series-1",
        })
      );
    });

    test("recurring series collision check prevents false reschedule", async () => {
      const booking1 = makeBooking({
        recurringEventId: "rec-series-1",
        startTime: new Date("2026-04-01T10:00:00Z"),
        endTime: new Date("2026-04-01T11:00:00Z"),
      });

      repo.findByUid.mockResolvedValue(booking1);

      repo.findByRecurringEventIdAndStartTime.mockResolvedValue({
        id: 3,
        uid: "booking-789",
      });

      await handler.rescheduleByICalUID(
        makeSyncEvent({
          start: new Date("2026-04-08T10:00:00Z"),
          originalStartTime: undefined,
        }),
        1
      );

      expect(mockCreateBooking).not.toHaveBeenCalled();
      expect(logSpies.debug).toHaveBeenCalledWith(
        "rescheduleByICalUID: event matches different booking in same recurring series",
        expect.objectContaining({
          bookingUid: "booking-123",
          matchedBookingUid: "booking-789",
        })
      );
    });

    test("proceeds with reschedule when no collision found in series", async () => {
      const booking = makeBooking({
        recurringEventId: "rec-series-1",
        startTime: new Date("2026-04-01T10:00:00Z"),
        endTime: new Date("2026-04-01T11:00:00Z"),
      });

      repo.findByUid.mockResolvedValue(booking);
      repo.findByRecurringEventIdAndStartTime.mockResolvedValue(null);

      await handler.rescheduleByICalUID(
        makeSyncEvent({
          start: new Date("2026-04-15T10:00:00Z"),
          originalStartTime: undefined,
        }),
        1
      );

      expect(mockCreateBooking).toHaveBeenCalled();
    });

    test("skips reschedule when recurring instance cannot be resolved and times differ", async () => {
      // booking-123 is at 2026-04-01, but the event refers to an instance at 2026-04-15
      // that doesn't exist in the DB. The safety guard should bail out.
      const booking = makeBooking({
        recurringEventId: "rec-series-1",
        startTime: new Date("2026-04-01T10:00:00Z"),
        endTime: new Date("2026-04-01T11:00:00Z"),
      });

      repo.findByUid.mockResolvedValue(booking);
      // Instance resolution returns null — the instance at 2026-04-15 doesn't exist
      repo.findByRecurringEventIdAndStartTime.mockResolvedValue(null);

      const result = await handler.rescheduleByICalUID(
        makeSyncEvent({
          start: new Date("2026-04-16T10:00:00Z"),
          originalStartTime: new Date("2026-04-15T10:00:00Z"),
        }),
        1
      );

      expect(result).toBe("skipped");
      expect(mockCreateBooking).not.toHaveBeenCalled();
      expect(logSpies.debug).toHaveBeenCalledWith(
        "resolveBooking: skipping, could not resolve correct recurring instance",
        expect.objectContaining({
          bookingUid: "booking-123",
          recurringEventId: "rec-series-1",
        })
      );
    });

    test("does not attempt recurring resolution for non-recurring bookings", async () => {
      repo.findByUid.mockResolvedValue(makeBooking({ recurringEventId: null }));

      await handler.rescheduleByICalUID(makeSyncEvent(), 1);

      expect(repo.findByRecurringEventIdAndStartTime).not.toHaveBeenCalled();
      expect(mockCreateBooking).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // rescheduleByICalUID -- field sync
  // =========================================================================

  describe("rescheduleByICalUID -- field sync", () => {
    test("updates title when time has not changed and title differs", async () => {
      const existingStart = new Date("2026-04-01T10:00:00Z");
      repo.findByUid.mockResolvedValue(
        makeBooking({ startTime: existingStart, title: "Old Title" })
      );

      await handler.rescheduleByICalUID(
        makeSyncEvent({ start: existingStart, title: "New Title" }),
        1
      );

      expect(mockCreateBooking).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith({
        where: { uid: "booking-123" },
        data: { title: "New Title" },
      });
    });

    test("updates description when time has not changed and description differs", async () => {
      const existingStart = new Date("2026-04-01T10:00:00Z");
      repo.findByUid.mockResolvedValue(
        makeBooking({ startTime: existingStart, description: "Old desc" })
      );

      await handler.rescheduleByICalUID(
        makeSyncEvent({ start: existingStart, description: "New desc" }),
        1
      );

      expect(mockCreateBooking).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith({
        where: { uid: "booking-123" },
        data: { description: "New desc" },
      });
    });

    test("updates location when time has not changed and location differs", async () => {
      const existingStart = new Date("2026-04-01T10:00:00Z");
      repo.findByUid.mockResolvedValue(
        makeBooking({ startTime: existingStart, location: "Old location" })
      );

      await handler.rescheduleByICalUID(
        makeSyncEvent({ start: existingStart, location: "New location" }),
        1
      );

      expect(mockCreateBooking).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith({
        where: { uid: "booking-123" },
        data: { location: "New location" },
      });
    });

    test("updates multiple fields at once", async () => {
      const existingStart = new Date("2026-04-01T10:00:00Z");
      repo.findByUid.mockResolvedValue(
        makeBooking({
          startTime: existingStart,
          title: "Old",
          description: "Old desc",
          location: "Old loc",
        })
      );

      await handler.rescheduleByICalUID(
        makeSyncEvent({
          start: existingStart,
          title: "New",
          description: "New desc",
          location: "New loc",
        }),
        1
      );

      expect(repo.update).toHaveBeenCalledWith({
        where: { uid: "booking-123" },
        data: { title: "New", description: "New desc", location: "New loc" },
      });
    });

    test("does not call update when no fields changed", async () => {
      const existingStart = new Date("2026-04-01T10:00:00Z");
      repo.findByUid.mockResolvedValue(
        makeBooking({
          startTime: existingStart,
          title: "Same Title",
          description: "Same desc",
          location: "Same loc",
        })
      );

      await handler.rescheduleByICalUID(
        makeSyncEvent({
          start: existingStart,
          title: "Same Title",
          description: "Same desc",
          location: "Same loc",
        }),
        1
      );

      expect(repo.update).not.toHaveBeenCalled();
      expect(mockCreateBooking).not.toHaveBeenCalled();
    });

    test("handles update error gracefully without throwing", async () => {
      const existingStart = new Date("2026-04-01T10:00:00Z");
      repo.findByUid.mockResolvedValue(
        makeBooking({ startTime: existingStart, title: "Old" })
      );
      repo.update.mockRejectedValue(new Error("DB error"));

      await handler.rescheduleByICalUID(
        makeSyncEvent({ start: existingStart, title: "New" }),
        1
      );

      expect(logSpies.error).toHaveBeenCalledWith(
        "updateBookingFields: failed to update booking fields",
        expect.objectContaining({ error: "DB error" })
      );
    });

    test("syncs field changes on unmodified recurring instance", async () => {
      const sameTime = new Date("2026-04-08T10:00:00Z");
      // booking-123 is the first instance (from iCalUID), at a different time
      const booking1 = makeBooking({
        recurringEventId: "rec-series-1",
        startTime: new Date("2026-04-01T10:00:00Z"),
        title: "Old Title",
      });
      // Instance resolution finds the correct instance at sameTime
      const resolvedInstance = makeBooking({
        uid: "booking-instance-2",
        recurringEventId: "rec-series-1",
        startTime: sameTime,
        endTime: new Date("2026-04-08T11:00:00Z"),
        title: "Old Title",
      });

      repo.findByUid.mockResolvedValueOnce(booking1).mockResolvedValueOnce(resolvedInstance);
      repo.findByRecurringEventIdAndStartTime.mockResolvedValue({
        id: 2,
        uid: "booking-instance-2",
      });

      await handler.rescheduleByICalUID(
        makeSyncEvent({
          start: sameTime,
          originalStartTime: sameTime,
          title: "Updated Title",
        }),
        1
      );

      expect(mockCreateBooking).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: "Updated Title" }),
        })
      );
    });
  });
});
