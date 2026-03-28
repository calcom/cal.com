import type { CalendarSubscriptionEventItem } from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionPort.interface";
import type { BookingRepository } from "@calcom/lib/server/repository/booking";
import type { SelectedCalendar } from "@calcom/prisma/client";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  type BookingFromSync,
  buildMetadataFromCalendarEvent,
  buildRescheduleBookingData,
  CalendarSyncService,
  extractBookingResponses,
  hasStartTimeChanged,
  mergeBookingResponsesWithEventData,
} from "../CalendarSyncService";

const { mockHandleCancelBooking, mockCreateBooking } = vi.hoisted(() => ({
  mockHandleCancelBooking: vi.fn().mockResolvedValue(undefined),
  mockCreateBooking: vi.fn().mockResolvedValue(undefined),
}));

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
    generate: vi.fn(() => "test-idempotency-key"),
  },
}));

vi.mock("@sentry/nextjs", () => ({
  metrics: {
    count: vi.fn(),
    distribution: vi.fn(),
  },
}));

const makeBooking = (overrides: Partial<BookingFromSync> = {}): BookingFromSync =>
  ({
    id: 1,
    uid: "booking-uid-123",
    userId: 42,
    userPrimaryEmail: "user@example.com",
    startTime: new Date("2024-01-15T10:00:00Z"),
    endTime: new Date("2024-01-15T11:00:00Z"),
    title: "Team Standup",
    description: "Daily standup meeting",
    location: "https://meet.google.com/abc",
    smsReminderNumber: null,
    responses: {
      name: "John Doe",
      email: "john@example.com",
      notes: "Daily standup meeting",
      location: {
        value: "https://meet.google.com/abc",
        label: "Google Meet",
        optionValue: "https://meet.google.com/abc",
      },
    },
    eventTypeId: 10,
    eventType: { id: 10, title: "Standup", length: 60 },
    ...overrides,
  }) as unknown as BookingFromSync;

const makeEvent = (
  overrides: Partial<CalendarSubscriptionEventItem> = {}
): CalendarSubscriptionEventItem => ({
  id: "gcal-event-1",
  iCalUID: "booking-uid-123@cal.com",
  start: new Date("2024-01-15T14:00:00Z"),
  end: new Date("2024-01-15T15:00:00Z"),
  busy: true,
  summary: "Team Standup",
  description: "Daily standup meeting",
  location: "https://meet.google.com/abc",
  status: "confirmed",
  isAllDay: false,
  timeZone: "America/New_York",
  recurringEventId: null,
  originalStartDate: null,
  createdAt: new Date("2024-01-10T00:00:00Z"),
  updatedAt: new Date("2024-01-15T09:00:00Z"),
  etag: '"etag-123"',
  kind: "calendar#event",
  ...overrides,
});

const mockSelectedCalendar: SelectedCalendar = {
  id: "sc-1",
  userId: 42,
  credentialId: 1,
  integration: "google_calendar",
  externalId: "user@gmail.com",
  eventTypeId: null,
  delegationCredentialId: null,
  domainWideDelegationCredentialId: null,
  googleChannelId: null,
  googleChannelKind: null,
  googleChannelResourceId: null,
  googleChannelResourceUri: null,
  googleChannelExpiration: null,
  error: null,
  lastErrorAt: null,
  watchAttempts: 0,
  maxAttempts: 3,
  unwatchAttempts: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  channelId: "channel-1",
  channelKind: "web_hook",
  channelResourceId: "resource-1",
  channelResourceUri: "https://example.com/webhook",
  channelExpiration: new Date(Date.now() + 86400000),
  syncSubscribedAt: new Date(),
  syncToken: "sync-token-1",
  syncedAt: new Date(),
  syncErrorAt: null,
  syncErrorCount: 0,
};

// ─── Helper function tests (pure, no mocks needed) ───────────────────────────

describe("buildRescheduleBookingData", () => {
  test("preserves original 60-min duration when event is moved", () => {
    const booking = makeBooking();
    const event = makeEvent({
      start: new Date("2024-01-15T14:00:00Z"),
      end: new Date("2024-01-15T15:00:00Z"),
    });

    const result = buildRescheduleBookingData(booking, event);

    expect(result.start).toBe("2024-01-15T14:00:00.000Z");
    expect(result.end).toBe("2024-01-15T15:00:00.000Z");
  });

  test("preserves original 30-min duration when event is stretched to 90min externally", () => {
    const booking = makeBooking({
      startTime: new Date("2024-01-15T10:00:00Z"),
      endTime: new Date("2024-01-15T10:30:00Z"),
    });
    const event = makeEvent({
      start: new Date("2024-01-15T14:00:00Z"),
      end: new Date("2024-01-15T15:30:00Z"), // 90min in external calendar
    });

    const result = buildRescheduleBookingData(booking, event);

    expect(result.start).toBe("2024-01-15T14:00:00.000Z");
    expect(result.end).toBe("2024-01-15T14:30:00.000Z"); // 30min preserved, NOT 15:30
  });

  test("preserves original 2-hour duration when event is shortened externally", () => {
    const booking = makeBooking({
      startTime: new Date("2024-01-15T10:00:00Z"),
      endTime: new Date("2024-01-15T12:00:00Z"),
    });
    const event = makeEvent({
      start: new Date("2024-01-15T14:00:00Z"),
      end: new Date("2024-01-15T14:30:00Z"), // shortened to 30min
    });

    const result = buildRescheduleBookingData(booking, event);

    expect(result.start).toBe("2024-01-15T14:00:00.000Z");
    expect(result.end).toBe("2024-01-15T16:00:00.000Z"); // 2h preserved
  });

  test("falls back to booking start when event start is null", () => {
    const booking = makeBooking();
    const event = makeEvent({ start: null });

    const result = buildRescheduleBookingData(booking, event);

    expect(result.start).toBe("2024-01-15T10:00:00.000Z");
    expect(result.end).toBe("2024-01-15T11:00:00.000Z");
  });

  test("uses event timezone, falls back to UTC", () => {
    const booking = makeBooking();

    const withTz = buildRescheduleBookingData(booking, makeEvent({ timeZone: "Europe/London" }));
    expect(withTz.timeZone).toBe("Europe/London");

    const withoutTz = buildRescheduleBookingData(booking, makeEvent({ timeZone: null }));
    expect(withoutTz.timeZone).toBe("UTC");
  });

  test("sets rescheduleUid to original booking uid", () => {
    const booking = makeBooking({ uid: "original-uid-abc" });
    const event = makeEvent();

    const result = buildRescheduleBookingData(booking, event);

    expect(result.rescheduleUid).toBe("original-uid-abc");
  });

  test("sets eventTypeId from booking", () => {
    const booking = makeBooking({ eventTypeId: 99 });
    const event = makeEvent();

    const result = buildRescheduleBookingData(booking, event);

    expect(result.eventTypeId).toBe(99);
  });

  test("handles cross-day rescheduling correctly", () => {
    const booking = makeBooking({
      startTime: new Date("2024-01-15T23:00:00Z"),
      endTime: new Date("2024-01-16T00:30:00Z"), // 90min crossing midnight
    });
    const event = makeEvent({
      start: new Date("2024-01-20T22:00:00Z"),
      end: new Date("2024-01-20T23:00:00Z"),
    });

    const result = buildRescheduleBookingData(booking, event);

    expect(result.start).toBe("2024-01-20T22:00:00.000Z");
    expect(result.end).toBe("2024-01-20T23:30:00.000Z"); // 90min preserved, crosses midnight
  });
});

describe("extractBookingResponses", () => {
  test("returns existing responses when present as object", () => {
    const booking = makeBooking({
      responses: { name: "Jane", email: "jane@test.com", custom: "value" },
    });

    const result = extractBookingResponses(booking);

    expect(result).toEqual({ name: "Jane", email: "jane@test.com", custom: "value" });
  });

  test("builds fallback responses when responses is null", () => {
    const booking = makeBooking({
      responses: null,
      title: "My Booking",
      userPrimaryEmail: "user@test.com",
      description: "Some notes",
      smsReminderNumber: "+5511999999999",
      location: "Zoom",
    });

    const result = extractBookingResponses(booking);

    expect(result).toEqual({
      name: "My Booking",
      email: "user@test.com",
      guests: [],
      notes: "Some notes",
      smsReminderNumber: "+5511999999999",
      location: {
        label: "Zoom",
        value: "Zoom",
        optionValue: "Zoom",
      },
    });
  });

  test("builds fallback responses when responses is an array (invalid shape)", () => {
    const booking = makeBooking({ responses: ["invalid"] as unknown as null });

    const result = extractBookingResponses(booking);

    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("email");
    expect(result).toHaveProperty("guests");
  });

  test("omits location from fallback when booking has no location", () => {
    const booking = makeBooking({ responses: null, location: null });

    const result = extractBookingResponses(booking);

    expect(result.location).toBeUndefined();
  });

  test("handles empty string location", () => {
    const booking = makeBooking({ responses: null, location: "" });

    const result = extractBookingResponses(booking);

    expect(result.location).toBeUndefined();
  });

  test("handles null userPrimaryEmail in fallback", () => {
    const booking = makeBooking({ responses: null, userPrimaryEmail: null });

    const result = extractBookingResponses(booking);

    expect(result.email).toBe("");
  });

  test("handles null description in fallback", () => {
    const booking = makeBooking({ responses: null, description: null });

    const result = extractBookingResponses(booking);

    expect(result.notes).toBe("");
  });
});

describe("mergeBookingResponsesWithEventData", () => {
  test("overrides title, notes, and location from event (notes from attendee comment)", () => {
    const booking = makeBooking({
      responses: { name: "John", email: "john@test.com", notes: "old notes" },
    });
    const event = makeEvent({
      summary: "New Title",
      description: "New notes",
      location: "New Location",
    });

    const result = mergeBookingResponsesWithEventData(booking, event);

    expect(result.name).toBe("John"); // preserved from booking
    expect(result.email).toBe("john@test.com"); // preserved from booking
    expect(result.title).toBe("New Title"); // from event
    expect(result.notes).toBe("New notes"); // from event (attendee RSVP comment)
    expect(result.location).toEqual({
      value: "New Location",
      label: "New Location",
      optionValue: "New Location",
    });
  });

  test("does not override when event fields are null/empty", () => {
    const booking = makeBooking({
      responses: { name: "John", notes: "Original notes", location: { value: "Original" } },
    });
    const event = makeEvent({
      summary: null,
      description: null,
      location: null,
    });

    const result = mergeBookingResponsesWithEventData(booking, event);

    expect(result.title).toBeUndefined();
    expect(result.notes).toBe("Original notes");
    expect(result.location).toEqual({ value: "Original" });
  });

  test("partially overrides — only summary changed", () => {
    const booking = makeBooking({
      responses: { name: "John", notes: "Keep this" },
    });
    const event = makeEvent({
      summary: "Changed Title",
      description: null,
      location: null,
    });

    const result = mergeBookingResponsesWithEventData(booking, event);

    expect(result.title).toBe("Changed Title");
    expect(result.notes).toBe("Keep this"); // not overridden
  });
});

describe("buildMetadataFromCalendarEvent", () => {
  test("serializes all event fields into calendarSubscriptionEvent", () => {
    const event = makeEvent();

    const result = buildMetadataFromCalendarEvent(event);

    expect(result).toHaveProperty("calendarSubscriptionEvent");
    const parsed = JSON.parse(result.calendarSubscriptionEvent);
    expect(parsed.summary).toBe("Team Standup");
    expect(parsed.description).toBe("Daily standup meeting");
    expect(parsed.location).toBe("https://meet.google.com/abc");
    expect(parsed.busy).toBe(true);
    expect(parsed.status).toBe("confirmed");
    expect(parsed.isAllDay).toBe(false);
    expect(parsed.timeZone).toBe("America/New_York");
    expect(parsed.etag).toBe('"etag-123"');
    expect(parsed.kind).toBe("calendar#event");
  });

  test("handles all-null optional fields", () => {
    const event = makeEvent({
      summary: null,
      description: null,
      location: null,
      busy: null,
      status: null,
      isAllDay: null,
      timeZone: null,
      recurringEventId: null,
      originalStartDate: null,
      createdAt: null,
      updatedAt: null,
      etag: null,
      kind: null,
    });

    const result = buildMetadataFromCalendarEvent(event);
    const parsed = JSON.parse(result.calendarSubscriptionEvent);

    Object.values(parsed).forEach((value) => {
      expect(value).toBeNull();
    });
  });

  test("serializes dates as ISO strings", () => {
    const event = makeEvent({
      originalStartDate: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-10T00:00:00Z"),
      updatedAt: new Date("2024-01-15T09:00:00Z"),
    });

    const result = buildMetadataFromCalendarEvent(event);
    const parsed = JSON.parse(result.calendarSubscriptionEvent);

    expect(parsed.originalStartDate).toBe("2024-01-15T10:00:00.000Z");
    expect(parsed.createdAt).toBe("2024-01-10T00:00:00.000Z");
    expect(parsed.updatedAt).toBe("2024-01-15T09:00:00.000Z");
  });
});

// ─── Change detection ─────────────────────────────────────────────────────────

describe("hasStartTimeChanged", () => {
  test("returns true when event start differs from booking start", () => {
    const booking = makeBooking({ startTime: new Date("2024-01-15T10:00:00Z") });
    const event = makeEvent({ start: new Date("2024-01-15T14:00:00Z") });

    expect(hasStartTimeChanged(booking, event)).toBe(true);
  });

  test("returns false when event start equals booking start", () => {
    const booking = makeBooking({ startTime: new Date("2024-01-15T10:00:00Z") });
    const event = makeEvent({ start: new Date("2024-01-15T10:00:00Z") });

    expect(hasStartTimeChanged(booking, event)).toBe(false);
  });

  test("returns false when event start is null", () => {
    const booking = makeBooking({ startTime: new Date("2024-01-15T10:00:00Z") });
    const event = makeEvent({ start: null });

    expect(hasStartTimeChanged(booking, event)).toBe(false);
  });

  test("detects 1-second difference", () => {
    const booking = makeBooking({ startTime: new Date("2024-01-15T10:00:00Z") });
    const event = makeEvent({ start: new Date("2024-01-15T10:00:01Z") });

    expect(hasStartTimeChanged(booking, event)).toBe(true);
  });

  test("same timestamp in different timezone representations is equal", () => {
    const booking = makeBooking({ startTime: new Date("2024-01-15T10:00:00Z") });
    // Same instant, different representation
    const event = makeEvent({ start: new Date("2024-01-15T07:00:00-03:00") });

    expect(hasStartTimeChanged(booking, event)).toBe(false);
  });
});

describe("CalendarSyncService - skip reschedule when no time change", () => {
  let service: CalendarSyncService;
  let mockBookingRepository: BookingRepository;

  beforeEach(() => {
    mockBookingRepository = {
      findByUid: vi.fn(),
    } as unknown as BookingRepository;

    service = new CalendarSyncService({
      bookingRepository: mockBookingRepository,
    });

    vi.clearAllMocks();
  });

  test("skips reschedule when start time has not changed (e.g. RSVP update)", async () => {
    const booking = makeBooking({
      startTime: new Date("2024-01-15T10:00:00Z"),
      endTime: new Date("2024-01-15T11:00:00Z"),
    });
    const event = makeEvent({
      start: new Date("2024-01-15T10:00:00Z"),
      end: new Date("2024-01-15T11:00:00Z"),
      status: "confirmed",
    });

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);

    await service.rescheduleBooking(event, mockSelectedCalendar.userId);

    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  test("proceeds with reschedule when start time has changed", async () => {
    const booking = makeBooking({
      startTime: new Date("2024-01-15T10:00:00Z"),
      endTime: new Date("2024-01-15T11:00:00Z"),
    });
    const event = makeEvent({
      start: new Date("2024-01-15T14:00:00Z"),
      end: new Date("2024-01-15T15:00:00Z"),
    });

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);

    await service.rescheduleBooking(event, mockSelectedCalendar.userId);

    expect(mockCreateBooking).toHaveBeenCalled();
  });

  test("skips reschedule when event start is null", async () => {
    const booking = makeBooking();
    const event = makeEvent({ start: null });

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);

    await service.rescheduleBooking(event, mockSelectedCalendar.userId);

    expect(mockCreateBooking).not.toHaveBeenCalled();
  });
});

// ─── iCalUID parsing edge cases ───────────────────────────────────────────────

describe("iCalUID parsing", () => {
  let service: CalendarSyncService;
  let mockBookingRepository: BookingRepository;

  beforeEach(() => {
    mockBookingRepository = {
      findByUid: vi.fn(),
    } as unknown as BookingRepository;

    service = new CalendarSyncService({
      bookingRepository: mockBookingRepository,
    });

    vi.clearAllMocks();
  });

  test("iCalUID with multiple @ signs: only first part is used as bookingUid", async () => {
    const event = makeEvent({ iCalUID: "uid-part@extra@cal.com", status: "cancelled" });
    const booking = makeBooking({ uid: "uid-part" });

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);

    await service.cancelBooking(event, mockSelectedCalendar.userId);

    // split("@") → ["uid-part", "extra", "cal.com"], first element is "uid-part"
    expect(mockBookingRepository.findByUid).toHaveBeenCalledWith({
      bookingUid: "uid-part",
    });
    expect(mockHandleCancelBooking).toHaveBeenCalled();
  });

  test("iCalUID with UUID format works correctly", async () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const event = makeEvent({ iCalUID: `${uuid}@cal.com` });
    const booking = makeBooking({ uid: uuid });

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);

    await service.rescheduleBooking(event, mockSelectedCalendar.userId);

    expect(mockBookingRepository.findByUid).toHaveBeenCalledWith({
      bookingUid: uuid,
    });
  });

  test("iCalUID with no @ sign: entire string becomes bookingUid", async () => {
    const event = makeEvent({ iCalUID: "no-at-sign" });
    const booking = makeBooking({ uid: "no-at-sign" });

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);

    await service.rescheduleBooking(event, mockSelectedCalendar.userId);

    // split("@") → ["no-at-sign"], first element is "no-at-sign"
    expect(mockBookingRepository.findByUid).toHaveBeenCalledWith({
      bookingUid: "no-at-sign",
    });
  });

  test("iCalUID that is just '@' results in empty bookingUid and returns early", async () => {
    const event = makeEvent({ iCalUID: "@" });

    await service.cancelBooking(event, mockSelectedCalendar.userId);

    // split("@") → ["", ""], first element is "" which is falsy
    expect(mockBookingRepository.findByUid).not.toHaveBeenCalled();
  });

  test("undefined iCalUID returns early", async () => {
    const event = makeEvent({ iCalUID: undefined as unknown as null });

    await service.cancelBooking(event, mockSelectedCalendar.userId);

    expect(mockBookingRepository.findByUid).not.toHaveBeenCalled();
  });
});

// ─── Zero/negative duration edge cases ────────────────────────────────────────

describe("buildRescheduleBookingData - duration edge cases", () => {
  test("booking with zero duration: end equals start", () => {
    const booking = makeBooking({
      startTime: new Date("2024-01-15T10:00:00Z"),
      endTime: new Date("2024-01-15T10:00:00Z"), // zero duration
    });
    const event = makeEvent({
      start: new Date("2024-01-20T14:00:00Z"),
    });

    const result = buildRescheduleBookingData(booking, event);

    // 0ms duration preserved: end === start
    expect(result.start).toBe("2024-01-20T14:00:00.000Z");
    expect(result.end).toBe("2024-01-20T14:00:00.000Z");
  });

  test("booking with very short duration (1 minute)", () => {
    const booking = makeBooking({
      startTime: new Date("2024-01-15T10:00:00Z"),
      endTime: new Date("2024-01-15T10:01:00Z"),
    });
    const event = makeEvent({
      start: new Date("2024-01-20T14:00:00Z"),
    });

    const result = buildRescheduleBookingData(booking, event);

    expect(result.start).toBe("2024-01-20T14:00:00.000Z");
    expect(result.end).toBe("2024-01-20T14:01:00.000Z");
  });

  test("booking with very long duration (8 hours)", () => {
    const booking = makeBooking({
      startTime: new Date("2024-01-15T09:00:00Z"),
      endTime: new Date("2024-01-15T17:00:00Z"),
    });
    const event = makeEvent({
      start: new Date("2024-01-20T08:00:00Z"),
    });

    const result = buildRescheduleBookingData(booking, event);

    expect(result.start).toBe("2024-01-20T08:00:00.000Z");
    expect(result.end).toBe("2024-01-20T16:00:00.000Z"); // 8h preserved
  });
});

// ─── End-to-end data flow: event fields → createBooking ───────────────────────

describe("CalendarSyncService - booking data updated from external event", () => {
  let service: CalendarSyncService;
  let mockBookingRepository: BookingRepository;

  beforeEach(() => {
    mockBookingRepository = {
      findByUid: vi.fn(),
    } as unknown as BookingRepository;

    service = new CalendarSyncService({
      bookingRepository: mockBookingRepository,
    });

    vi.clearAllMocks();
  });

  test("summary from external event overrides title in responses", async () => {
    const booking = makeBooking({
      responses: { name: "John Doe", email: "john@test.com", notes: "Original" },
    });
    const event = makeEvent({ summary: "New Meeting Title" });

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.rescheduleBooking(event, mockSelectedCalendar.userId);

    const call = mockCreateBooking.mock.calls[0][0];
    expect(call.bookingData.responses.title).toBe("New Meeting Title");
    expect(call.bookingData.responses.name).toBe("John Doe"); // preserved
  });

  test("attendee comment from external event overrides notes in responses", async () => {
    const booking = makeBooking({
      responses: { name: "John Doe", email: "john@test.com", notes: "Original notes" },
    });
    const event = makeEvent({ description: "Updated meeting agenda" });

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.rescheduleBooking(event, mockSelectedCalendar.userId);

    const call = mockCreateBooking.mock.calls[0][0];
    expect(call.bookingData.responses.notes).toBe("Updated meeting agenda");
  });

  test("location from external event overrides location in responses", async () => {
    const booking = makeBooking({
      responses: {
        name: "John Doe",
        location: { value: "Old Room", label: "Old Room", optionValue: "Old Room" },
      },
    });
    const event = makeEvent({ location: "https://zoom.us/j/123" });

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.rescheduleBooking(event, mockSelectedCalendar.userId);

    const call = mockCreateBooking.mock.calls[0][0];
    expect(call.bookingData.responses.location).toEqual({
      value: "https://zoom.us/j/123",
      label: "https://zoom.us/j/123",
      optionValue: "https://zoom.us/j/123",
    });
  });

  test("null fields from external event do NOT override booking responses", async () => {
    const booking = makeBooking({
      responses: {
        name: "John Doe",
        email: "john@test.com",
        notes: "Keep these notes",
        location: { value: "Room A", label: "Room A", optionValue: "Room A" },
      },
    });
    const event = makeEvent({ summary: null, description: null, location: null });

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.rescheduleBooking(event, mockSelectedCalendar.userId);

    const call = mockCreateBooking.mock.calls[0][0];
    expect(call.bookingData.responses.notes).toBe("Keep these notes");
    expect(call.bookingData.responses.location).toEqual({
      value: "Room A",
      label: "Room A",
      optionValue: "Room A",
    });
    expect(call.bookingData.responses.title).toBeUndefined(); // no override
  });

  test("all fields updated simultaneously from external event", async () => {
    const booking = makeBooking({
      responses: {
        name: "John Doe",
        email: "john@test.com",
        notes: "Old notes",
        location: { value: "Old", label: "Old", optionValue: "Old" },
        guests: ["guest@test.com"],
      },
    });
    const event = makeEvent({
      summary: "Renamed Meeting",
      description: "New agenda for Q1",
      location: "Conference Room B",
    });

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.rescheduleBooking(event, mockSelectedCalendar.userId);

    const call = mockCreateBooking.mock.calls[0][0];
    const responses = call.bookingData.responses;

    // Overridden by event
    expect(responses.title).toBe("Renamed Meeting");
    expect(responses.notes).toBe("New agenda for Q1");
    expect(responses.location).toEqual({
      value: "Conference Room B",
      label: "Conference Room B",
      optionValue: "Conference Room B",
    });

    // Preserved from booking
    expect(responses.name).toBe("John Doe");
    expect(responses.email).toBe("john@test.com");
    expect(responses.guests).toEqual(["guest@test.com"]);
  });

  test("external event data is stored in metadata as calendarSubscriptionEvent", async () => {
    const booking = makeBooking();
    const event = makeEvent({
      summary: "Sync Test",
      description: "From Google",
      location: "Virtual",
      status: "confirmed",
      timeZone: "America/Sao_Paulo",
    });

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.rescheduleBooking(event, mockSelectedCalendar.userId);

    const call = mockCreateBooking.mock.calls[0][0];
    const raw = call.bookingData.metadata.calendarSubscriptionEvent;
    expect(typeof raw).toBe("string");

    const parsed = JSON.parse(raw);
    expect(parsed.summary).toBe("Sync Test");
    expect(parsed.description).toBe("From Google");
    expect(parsed.location).toBe("Virtual");
    expect(parsed.status).toBe("confirmed");
    expect(parsed.timeZone).toBe("America/Sao_Paulo");
  });

  test("booking without existing responses uses fallback with event overrides", async () => {
    const booking = makeBooking({
      responses: null,
      title: "Original Title",
      userPrimaryEmail: "user@company.com",
      description: "Original description",
      location: "Original Location",
    });
    const event = makeEvent({
      summary: "Calendar Title",
      description: "Calendar description",
      location: "Calendar Location",
    });

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.rescheduleBooking(event, mockSelectedCalendar.userId);

    const call = mockCreateBooking.mock.calls[0][0];
    const responses = call.bookingData.responses;

    // Fallback fields from booking
    expect(responses.name).toBe("Original Title");
    expect(responses.email).toBe("user@company.com");
    expect(responses.guests).toEqual([]);

    // Overridden by event
    expect(responses.title).toBe("Calendar Title");
    expect(responses.notes).toBe("Calendar description");
    expect(responses.location).toEqual({
      value: "Calendar Location",
      label: "Calendar Location",
      optionValue: "Calendar Location",
    });
  });
});

// ─── Service-level integration tests ──────────────────────────────────────────

describe("CalendarSyncService - error isolation", () => {
  let service: CalendarSyncService;
  let mockBookingRepository: BookingRepository;

  beforeEach(() => {
    mockBookingRepository = {
      findByUid: vi.fn(),
    } as unknown as BookingRepository;

    service = new CalendarSyncService({
      bookingRepository: mockBookingRepository,
    });

    vi.clearAllMocks();
  });

  test("handleEvents: failure in one event does not block others", async () => {
    const cancelEvent = makeEvent({ iCalUID: "cancel-uid@cal.com", status: "cancelled" });
    const rescheduleEvent = makeEvent({
      iCalUID: "reschedule-uid@cal.com",
      status: "confirmed",
      start: new Date("2024-01-20T14:00:00Z"),
    });

    const cancelBooking = makeBooking({ uid: "cancel-uid" });
    const rescheduleBooking = makeBooking({ uid: "reschedule-uid" });

    mockBookingRepository.findByUid = vi
      .fn()
      .mockImplementation(({ bookingUid }: { bookingUid: string }) => {
        if (bookingUid === "cancel-uid") return Promise.resolve(cancelBooking);
        if (bookingUid === "reschedule-uid") return Promise.resolve(rescheduleBooking);
        return Promise.resolve(null);
      });

    // Cancel fails, but reschedule should still work
    mockHandleCancelBooking.mockRejectedValue(new Error("Cancel service down"));

    await service.handleEvents(mockSelectedCalendar, [cancelEvent, rescheduleEvent]);

    expect(mockHandleCancelBooking).toHaveBeenCalled();
    expect(mockCreateBooking).toHaveBeenCalled();
  });

  test("handleEvents: DB error on one event does not block others", async () => {
    const event1 = makeEvent({ iCalUID: "uid-1@cal.com", status: "confirmed" });
    const event2 = makeEvent({ iCalUID: "uid-2@cal.com", status: "confirmed" });

    let callCount = 0;
    mockBookingRepository.findByUid = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error("DB timeout"));
      return Promise.resolve(makeBooking({ uid: "uid-2" }));
    });

    await service.handleEvents(mockSelectedCalendar, [event1, event2]);

    expect(mockBookingRepository.findByUid).toHaveBeenCalledTimes(2);
    expect(mockCreateBooking).toHaveBeenCalledTimes(1);
  });

  test("cancelBooking: passes correct data to handleCancelBooking", async () => {
    const booking = makeBooking({
      uid: "my-booking-uid",
      userId: 99,
      userPrimaryEmail: "admin@company.com",
    });
    const event = makeEvent({ iCalUID: "my-booking-uid@cal.com", status: "cancelled" });

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);

    await service.cancelBooking(event, 99);

    expect(mockHandleCancelBooking).toHaveBeenCalledWith({
      userId: 99,
      actionSource: "SYSTEM",
      bookingData: {
        uid: "my-booking-uid",
        cancellationReason: "Cancelled on user's calendar",
        cancelledBy: "admin@company.com",
        skipCalendarSyncTaskCancellation: true,
      },
    });
  });

  test("rescheduleBooking: passes correct bookingMeta flags", async () => {
    const booking = makeBooking();
    const event = makeEvent({
      start: new Date("2024-01-20T14:00:00Z"),
      end: new Date("2024-01-20T15:00:00Z"),
    });

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);

    await service.rescheduleBooking(event, mockSelectedCalendar.userId);

    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingMeta: {
          skipCalendarSyncTaskCreation: true,
          skipAvailabilityCheck: true,
          skipEventLimitsCheck: true,
          skipBookingTimeOutOfBoundsCheck: true,
        },
      })
    );
  });

  test("rescheduleBooking: skips booking without eventTypeId", async () => {
    const booking = makeBooking({ eventTypeId: null });
    const event = makeEvent();

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);

    await service.rescheduleBooking(event, mockSelectedCalendar.userId);

    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  test("cancelBooking: skips when calendar owner is not the booking host", async () => {
    const booking = makeBooking({ uid: "booking-uid-123", userId: 99 });
    const event = makeEvent({ iCalUID: "booking-uid-123@cal.com", status: "cancelled" });

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);

    // calendarUserId (42) !== booking.userId (99) → skip
    await service.cancelBooking(event, mockSelectedCalendar.userId);

    expect(mockHandleCancelBooking).not.toHaveBeenCalled();
  });

  test("rescheduleBooking: skips when calendar owner is not the booking host", async () => {
    const booking = makeBooking({ uid: "booking-uid-123", userId: 99 });
    const event = makeEvent({
      iCalUID: "booking-uid-123@cal.com",
      start: new Date("2024-01-20T14:00:00Z"),
    });

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);

    // calendarUserId (42) !== booking.userId (99) → skip
    await service.rescheduleBooking(event, mockSelectedCalendar.userId);

    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  test("cancelBooking: skips booking without userId", async () => {
    const booking = makeBooking({ userId: null });
    const event = makeEvent({ iCalUID: "booking-uid-123@cal.com", status: "cancelled" });

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);

    await service.cancelBooking(event, mockSelectedCalendar.userId);

    expect(mockHandleCancelBooking).not.toHaveBeenCalled();
  });

  test("cancelBooking: skips booking without userPrimaryEmail", async () => {
    const booking = makeBooking({ userPrimaryEmail: null });
    const event = makeEvent({ iCalUID: "booking-uid-123@cal.com", status: "cancelled" });

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);

    await service.cancelBooking(event, mockSelectedCalendar.userId);

    expect(mockHandleCancelBooking).not.toHaveBeenCalled();
  });

  test("handleEvents: correctly routes cancelled vs non-cancelled events", async () => {
    const cancelledEvent = makeEvent({ iCalUID: "uid-a@cal.com", status: "cancelled" });
    const confirmedEvent = makeEvent({ iCalUID: "uid-b@cal.com", status: "confirmed" });

    const bookingA = makeBooking({ uid: "uid-a" });
    const bookingB = makeBooking({ uid: "uid-b" });

    mockBookingRepository.findByUid = vi
      .fn()
      .mockImplementation(({ bookingUid }: { bookingUid: string }) => {
        if (bookingUid === "uid-a") return Promise.resolve(bookingA);
        if (bookingUid === "uid-b") return Promise.resolve(bookingB);
        return Promise.resolve(null);
      });

    await service.handleEvents(mockSelectedCalendar, [cancelledEvent, confirmedEvent]);

    // "cancelled" → cancelBooking, "confirmed" → rescheduleBooking
    expect(mockHandleCancelBooking).toHaveBeenCalledTimes(1);
    expect(mockCreateBooking).toHaveBeenCalledTimes(1);
  });

  test("handleEvents: non-cancelled statuses (tentative, confirmed) all route to reschedule", async () => {
    const tentativeEvent = makeEvent({ iCalUID: "uid-t@cal.com", status: "tentative" });
    const bookingT = makeBooking({ uid: "uid-t" });

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(bookingT);

    await service.handleEvents(mockSelectedCalendar, [tentativeEvent]);

    expect(mockHandleCancelBooking).not.toHaveBeenCalled();
    expect(mockCreateBooking).toHaveBeenCalledTimes(1);
  });
});

// ─── End-to-end recurring booking scenarios via handleEvents ─────────────────

/**
 * 4-week weekly recurring series: booking-1 … booking-4.
 * All share the same iCalUID (from booking-1) which is how Google Calendar works.
 */
const RECURRING_EVENT_ID = "rec-evt-id-abc";

const recurringBookings = [
  makeBooking({
    id: 1,
    uid: "booking-1-uid",
    recurringEventId: RECURRING_EVENT_ID,
    startTime: new Date("2024-01-05T10:00:00Z"),
    endTime: new Date("2024-01-05T11:00:00Z"),
  }),
  makeBooking({
    id: 2,
    uid: "booking-2-uid",
    recurringEventId: RECURRING_EVENT_ID,
    startTime: new Date("2024-01-12T10:00:00Z"),
    endTime: new Date("2024-01-12T11:00:00Z"),
  }),
  makeBooking({
    id: 3,
    uid: "booking-3-uid",
    recurringEventId: RECURRING_EVENT_ID,
    startTime: new Date("2024-01-19T10:00:00Z"),
    endTime: new Date("2024-01-19T11:00:00Z"),
  }),
  makeBooking({
    id: 4,
    uid: "booking-4-uid",
    recurringEventId: RECURRING_EVENT_ID,
    startTime: new Date("2024-01-26T10:00:00Z"),
    endTime: new Date("2024-01-26T11:00:00Z"),
  }),
];

describe("Scenario 1: reschedule a single recurring instance", () => {
  let service: CalendarSyncService;
  let mockBookingRepository: BookingRepository;

  beforeEach(() => {
    mockBookingRepository = {
      findByUid: vi.fn(),
      findLatestBookingInRescheduleChain: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      findByRecurringEventIdAndStartTime: vi.fn().mockResolvedValue(null),
    } as unknown as BookingRepository;

    service = new CalendarSyncService({ bookingRepository: mockBookingRepository });
    vi.clearAllMocks();
  });

  test("should reschedule only the moved instance, leaving others untouched", async () => {
    // Google sends webhook for instance 3 moved from Jan 19 10:00 → Jan 19 14:00
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-1-uid@cal.com",
        start: new Date("2024-01-19T14:00:00Z"),
        end: new Date("2024-01-19T15:00:00Z"),
        originalStartDate: new Date("2024-01-19T10:00:00Z"),
        recurringEventId: "gcal-rec-id",
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi
      .fn()
      .mockResolvedValueOnce(recurringBookings[0]) // iCalUID → booking-1
      .mockResolvedValueOnce(recurringBookings[2]); // resolved → booking-3

    mockBookingRepository.findByRecurringEventIdAndStartTime = vi
      .fn()
      .mockResolvedValue({ id: 3, uid: "booking-3-uid" });

    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockBookingRepository.findByRecurringEventIdAndStartTime).toHaveBeenCalledWith({
      recurringEventId: RECURRING_EVENT_ID,
      startTime: new Date("2024-01-19T10:00:00Z"),
    });

    expect(mockCreateBooking).toHaveBeenCalledTimes(1);
    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          rescheduleUid: "booking-3-uid",
          start: "2024-01-19T14:00:00.000Z",
          end: "2024-01-19T15:00:00.000Z",
        }),
      })
    );
    expect(mockHandleCancelBooking).not.toHaveBeenCalled();
  });

  test("should follow the reschedule chain when the resolved instance was already rescheduled", async () => {
    const booking3Rescheduled = makeBooking({
      id: 3,
      uid: "booking-3-uid",
      recurringEventId: RECURRING_EVENT_ID,
      startTime: new Date("2024-01-19T10:00:00Z"),
      rescheduled: true,
    });
    const booking3Prime = makeBooking({
      id: 30,
      uid: "booking-3-prime-uid",
      recurringEventId: RECURRING_EVENT_ID,
      startTime: new Date("2024-01-19T12:00:00Z"),
    });

    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-1-uid@cal.com",
        start: new Date("2024-01-19T16:00:00Z"),
        end: new Date("2024-01-19T17:00:00Z"),
        originalStartDate: new Date("2024-01-19T10:00:00Z"),
        recurringEventId: "gcal-rec-id",
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi
      .fn()
      .mockResolvedValueOnce(recurringBookings[0])
      .mockResolvedValueOnce(booking3Rescheduled);
    mockBookingRepository.findByRecurringEventIdAndStartTime = vi
      .fn()
      .mockResolvedValue({ id: 3, uid: "booking-3-uid" });
    mockBookingRepository.findLatestBookingInRescheduleChain = vi.fn().mockResolvedValue(booking3Prime);

    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockBookingRepository.findLatestBookingInRescheduleChain).toHaveBeenCalledWith({
      bookingUid: "booking-3-uid",
    });
    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          rescheduleUid: "booking-3-prime-uid",
          start: "2024-01-19T16:00:00.000Z",
        }),
      })
    );
  });
});

describe("Scenario 2: change only location or description (no time change)", () => {
  let service: CalendarSyncService;
  let mockBookingRepository: BookingRepository;

  beforeEach(() => {
    mockBookingRepository = {
      findByUid: vi.fn(),
      findLatestBookingInRescheduleChain: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      findByRecurringEventIdAndStartTime: vi.fn().mockResolvedValue(null),
    } as unknown as BookingRepository;

    service = new CalendarSyncService({ bookingRepository: mockBookingRepository });
    vi.clearAllMocks();
  });

  test("should update description without rescheduling for a non-recurring event", async () => {
    const singleBooking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: singleBooking.startTime,
        end: singleBooking.endTime,
        description: "New agenda items added",
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(singleBooking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).not.toHaveBeenCalled();
    expect(mockHandleCancelBooking).not.toHaveBeenCalled();
    expect(mockBookingRepository.update).toHaveBeenCalledWith({
      where: { uid: "booking-uid-123" },
      data: { description: "New agenda items added" },
    });
  });

  test("should update location without rescheduling for a non-recurring event", async () => {
    const singleBooking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: singleBooking.startTime,
        end: singleBooking.endTime,
        location: "Zoom Meeting",
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(singleBooking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).not.toHaveBeenCalled();
    expect(mockBookingRepository.update).toHaveBeenCalledWith({
      where: { uid: "booking-uid-123" },
      data: { location: "Zoom Meeting" },
    });
  });

  test("should update title, description, and location together", async () => {
    const singleBooking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: singleBooking.startTime,
        end: singleBooking.endTime,
        summary: "Renamed Meeting",
        description: "Updated notes",
        location: "Office Room 5",
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(singleBooking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).not.toHaveBeenCalled();
    expect(mockBookingRepository.update).toHaveBeenCalledWith({
      where: { uid: "booking-uid-123" },
      data: { title: "Renamed Meeting", description: "Updated notes", location: "Office Room 5" },
    });
  });

  test("should update description on a recurring instance with time mismatch (unmodified instance)", async () => {
    // DB has 09:30, Google reports 10:00, but originalStartDate === start → unmodified
    const booking2WithSkew = makeBooking({
      id: 2,
      uid: "booking-2-uid",
      recurringEventId: RECURRING_EVENT_ID,
      startTime: new Date("2024-01-12T09:30:00Z"),
      description: "Old notes",
    });

    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-2-uid@cal.com",
        start: new Date("2024-01-12T10:00:00Z"),
        end: new Date("2024-01-12T11:00:00Z"),
        originalStartDate: new Date("2024-01-12T10:00:00Z"),
        recurringEventId: "gcal-rec-id",
        description: "Updated notes from GCal",
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking2WithSkew);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).not.toHaveBeenCalled();
    expect(mockBookingRepository.update).toHaveBeenCalledWith({
      where: { uid: "booking-2-uid" },
      data: expect.objectContaining({ description: "Updated notes from GCal" }),
    });
  });

  test("should skip update when no fields actually changed", async () => {
    const singleBooking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: singleBooking.startTime,
        end: singleBooking.endTime,
        summary: singleBooking.title,
        description: singleBooking.description,
        location: singleBooking.location,
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(singleBooking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).not.toHaveBeenCalled();
    expect(mockBookingRepository.update).not.toHaveBeenCalled();
  });

  test("should update location on recurring instance where location changed and DB time matches", async () => {
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-1-uid@cal.com",
        start: recurringBookings[0].startTime,
        end: recurringBookings[0].endTime,
        originalStartDate: recurringBookings[0].startTime,
        recurringEventId: "gcal-rec-id",
        location: "New Conference Room",
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(recurringBookings[0]);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).not.toHaveBeenCalled();
    expect(mockBookingRepository.update).toHaveBeenCalledWith({
      where: { uid: "booking-1-uid" },
      data: { location: "New Conference Room" },
    });
  });
});

describe("Scenario 3: cancel a single recurring instance", () => {
  let service: CalendarSyncService;
  let mockBookingRepository: BookingRepository;

  beforeEach(() => {
    mockBookingRepository = {
      findByUid: vi.fn(),
      findLatestBookingInRescheduleChain: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      findByRecurringEventIdAndStartTime: vi.fn().mockResolvedValue(null),
    } as unknown as BookingRepository;

    service = new CalendarSyncService({ bookingRepository: mockBookingRepository });
    vi.clearAllMocks();
  });

  test("should cancel only the targeted instance using originalStartDate", async () => {
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-1-uid@cal.com",
        status: "cancelled",
        start: new Date("2024-01-12T10:00:00Z"),
        originalStartDate: new Date("2024-01-12T10:00:00Z"),
      }),
    ];

    mockBookingRepository.findByUid = vi
      .fn()
      .mockResolvedValueOnce(recurringBookings[0])
      .mockResolvedValueOnce(recurringBookings[1]);
    mockBookingRepository.findByRecurringEventIdAndStartTime = vi
      .fn()
      .mockResolvedValue({ id: 2, uid: "booking-2-uid" });

    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockHandleCancelBooking).toHaveBeenCalledTimes(1);
    expect(mockHandleCancelBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({ uid: "booking-2-uid" }),
      })
    );
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  test("should follow reschedule chain when cancelling a previously rescheduled recurring instance", async () => {
    const booking2Rescheduled = makeBooking({
      id: 2,
      uid: "booking-2-uid",
      recurringEventId: RECURRING_EVENT_ID,
      startTime: new Date("2024-01-12T10:00:00Z"),
      rescheduled: true,
    });
    const booking2Prime = makeBooking({
      id: 20,
      uid: "booking-2-prime-uid",
      recurringEventId: RECURRING_EVENT_ID,
      startTime: new Date("2024-01-12T14:00:00Z"),
    });

    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-1-uid@cal.com",
        status: "cancelled",
        originalStartDate: new Date("2024-01-12T10:00:00Z"),
      }),
    ];

    mockBookingRepository.findByUid = vi
      .fn()
      .mockResolvedValueOnce(recurringBookings[0])
      .mockResolvedValueOnce(booking2Rescheduled);
    mockBookingRepository.findByRecurringEventIdAndStartTime = vi
      .fn()
      .mockResolvedValue({ id: 2, uid: "booking-2-uid" });
    mockBookingRepository.findLatestBookingInRescheduleChain = vi.fn().mockResolvedValue(booking2Prime);

    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockBookingRepository.findLatestBookingInRescheduleChain).toHaveBeenCalledWith({
      bookingUid: "booking-2-uid",
    });
    expect(mockHandleCancelBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({ uid: "booking-2-prime-uid" }),
      })
    );
  });

  test("should cancel booking-1 when it IS the correct instance (time matches)", async () => {
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-1-uid@cal.com",
        status: "cancelled",
        start: new Date("2024-01-05T10:00:00Z"),
        originalStartDate: new Date("2024-01-05T10:00:00Z"),
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(recurringBookings[0]);
    mockBookingRepository.findByRecurringEventIdAndStartTime = vi
      .fn()
      .mockResolvedValue({ id: 1, uid: "booking-1-uid" });

    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockHandleCancelBooking).toHaveBeenCalledTimes(1);
    expect(mockHandleCancelBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({ uid: "booking-1-uid" }),
      })
    );
  });

  test("should cancel a non-recurring single event", async () => {
    const singleBooking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({ iCalUID: "booking-uid-123@cal.com", status: "cancelled" }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(singleBooking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockHandleCancelBooking).toHaveBeenCalledTimes(1);
    expect(mockHandleCancelBooking).toHaveBeenCalledWith({
      userId: 42,
      actionSource: "SYSTEM",
      bookingData: {
        uid: "booking-uid-123",
        cancellationReason: "Cancelled on user's calendar",
        cancelledBy: "user@example.com",
        skipCalendarSyncTaskCancellation: true,
      },
    });
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });
});

describe("Scenario 4: cancel all remaining recurring instances (this and following)", () => {
  let service: CalendarSyncService;
  let mockBookingRepository: BookingRepository;

  beforeEach(() => {
    mockBookingRepository = {
      findByUid: vi.fn(),
      findLatestBookingInRescheduleChain: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      findByRecurringEventIdAndStartTime: vi.fn().mockResolvedValue(null),
    } as unknown as BookingRepository;

    service = new CalendarSyncService({ bookingRepository: mockBookingRepository });
    vi.clearAllMocks();
  });

  test("should cancel instances 2, 3, and 4 when user deletes 'this and following events'", async () => {
    // Google sends 3 cancelled events for instances 2-4
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        id: "gcal-2",
        iCalUID: "booking-1-uid@cal.com",
        status: "cancelled",
        start: new Date("2024-01-12T10:00:00Z"),
        originalStartDate: new Date("2024-01-12T10:00:00Z"),
      }),
      makeEvent({
        id: "gcal-3",
        iCalUID: "booking-1-uid@cal.com",
        status: "cancelled",
        start: new Date("2024-01-19T10:00:00Z"),
        originalStartDate: new Date("2024-01-19T10:00:00Z"),
      }),
      makeEvent({
        id: "gcal-4",
        iCalUID: "booking-1-uid@cal.com",
        status: "cancelled",
        start: new Date("2024-01-26T10:00:00Z"),
        originalStartDate: new Date("2024-01-26T10:00:00Z"),
      }),
    ];

    // Use mockImplementation so concurrent Promise.all calls resolve correctly
    mockBookingRepository.findByUid = vi
      .fn()
      .mockImplementation(({ bookingUid }: { bookingUid: string }) => {
        const map: Record<string, ReturnType<typeof makeBooking>> = {
          "booking-1-uid": recurringBookings[0],
          "booking-2-uid": recurringBookings[1],
          "booking-3-uid": recurringBookings[2],
          "booking-4-uid": recurringBookings[3],
        };
        return Promise.resolve(map[bookingUid] ?? null);
      });

    mockBookingRepository.findByRecurringEventIdAndStartTime = vi
      .fn()
      .mockImplementation(({ startTime }: { startTime: Date }) => {
        const map: Record<string, { id: number; uid: string }> = {
          "2024-01-12T10:00:00.000Z": { id: 2, uid: "booking-2-uid" },
          "2024-01-19T10:00:00.000Z": { id: 3, uid: "booking-3-uid" },
          "2024-01-26T10:00:00.000Z": { id: 4, uid: "booking-4-uid" },
        };
        return Promise.resolve(map[startTime.toISOString()] ?? null);
      });

    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockHandleCancelBooking).toHaveBeenCalledTimes(3);
    expect(mockHandleCancelBooking).toHaveBeenCalledWith(
      expect.objectContaining({ bookingData: expect.objectContaining({ uid: "booking-2-uid" }) })
    );
    expect(mockHandleCancelBooking).toHaveBeenCalledWith(
      expect.objectContaining({ bookingData: expect.objectContaining({ uid: "booking-3-uid" }) })
    );
    expect(mockHandleCancelBooking).toHaveBeenCalledWith(
      expect.objectContaining({ bookingData: expect.objectContaining({ uid: "booking-4-uid" }) })
    );
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });
});

describe("Scenario 5: reschedule a single non-recurring event", () => {
  let service: CalendarSyncService;
  let mockBookingRepository: BookingRepository;

  beforeEach(() => {
    mockBookingRepository = {
      findByUid: vi.fn(),
      findLatestBookingInRescheduleChain: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      findByRecurringEventIdAndStartTime: vi.fn().mockResolvedValue(null),
    } as unknown as BookingRepository;

    service = new CalendarSyncService({ bookingRepository: mockBookingRepository });
    vi.clearAllMocks();
  });

  test("should reschedule the booking to the new time", async () => {
    const singleBooking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T14:00:00Z"),
        end: new Date("2024-01-15T15:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(singleBooking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledTimes(1);
    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          rescheduleUid: "booking-uid-123",
          start: "2024-01-15T14:00:00.000Z",
          end: "2024-01-15T15:00:00.000Z",
        }),
        bookingMeta: expect.objectContaining({
          skipCalendarSyncTaskCreation: true,
          skipAvailabilityCheck: true,
          skipEventLimitsCheck: true,
          skipBookingTimeOutOfBoundsCheck: true,
        }),
      })
    );
    expect(mockHandleCancelBooking).not.toHaveBeenCalled();
  });

  test("should preserve original duration even if Google shows different end time", async () => {
    const singleBooking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T14:00:00Z"),
        end: new Date("2024-01-15T15:30:00Z"), // 90 min
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(singleBooking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          start: "2024-01-15T14:00:00.000Z",
          end: "2024-01-15T15:00:00.000Z", // 60 min preserved
        }),
      })
    );
  });

  test("should follow reschedule chain for a previously rescheduled booking", async () => {
    const rescheduledBooking = makeBooking({ recurringEventId: undefined, rescheduled: true });
    const latestBooking = makeBooking({
      id: 10,
      uid: "booking-latest-uid",
      recurringEventId: undefined,
      startTime: new Date("2024-01-15T12:00:00Z"),
      endTime: new Date("2024-01-15T13:00:00Z"),
    });

    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T16:00:00Z"),
        end: new Date("2024-01-15T17:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(rescheduledBooking);
    mockBookingRepository.findLatestBookingInRescheduleChain = vi.fn().mockResolvedValue(latestBooking);

    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockBookingRepository.findLatestBookingInRescheduleChain).toHaveBeenCalledWith({
      bookingUid: "booking-uid-123",
    });
    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          rescheduleUid: "booking-latest-uid",
          start: "2024-01-15T16:00:00.000Z",
        }),
      })
    );
  });

  test("should reschedule with updated summary, attendee comment, and location", async () => {
    const singleBooking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T14:00:00Z"),
        end: new Date("2024-01-15T15:00:00Z"),
        summary: "Renamed Event",
        description: "New notes",
        location: "Room 42",
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(singleBooking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          responses: expect.objectContaining({
            title: "Renamed Event",
            notes: "New notes",
            location: { value: "Room 42", label: "Room 42", optionValue: "Room 42" },
          }),
        }),
      })
    );
  });
});

describe("Single booking edge cases", () => {
  let service: CalendarSyncService;
  let mockBookingRepository: BookingRepository;

  beforeEach(() => {
    mockBookingRepository = {
      findByUid: vi.fn(),
      findLatestBookingInRescheduleChain: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      findByRecurringEventIdAndStartTime: vi.fn().mockResolvedValue(null),
    } as unknown as BookingRepository;

    service = new CalendarSyncService({ bookingRepository: mockBookingRepository });
    vi.clearAllMocks();
  });

  test("should reschedule outside availability window (skipAvailabilityCheck is passed)", async () => {
    // A host drags their event to 3 AM — outside any normal availability schedule.
    // The service must still reschedule because it passes skipAvailabilityCheck: true.
    const booking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-16T03:00:00Z"),
        end: new Date("2024-01-16T04:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledTimes(1);
    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          start: "2024-01-16T03:00:00.000Z",
          end: "2024-01-16T04:00:00.000Z",
        }),
        bookingMeta: expect.objectContaining({
          skipAvailabilityCheck: true,
          skipBookingTimeOutOfBoundsCheck: true,
        }),
      })
    );
  });

  test("should reschedule far in the future beyond normal booking window (skipBookingTimeOutOfBoundsCheck)", async () => {
    const booking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2025-06-15T10:00:00Z"),
        end: new Date("2025-06-15T11:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledTimes(1);
    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingMeta: expect.objectContaining({
          skipBookingTimeOutOfBoundsCheck: true,
        }),
      })
    );
  });

  test("should preserve original 30-min duration when Google shows 2-hour event (event type length mismatch)", async () => {
    const shortBooking = makeBooking({
      recurringEventId: undefined,
      startTime: new Date("2024-01-15T10:00:00Z"),
      endTime: new Date("2024-01-15T10:30:00Z"), // 30 min
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T14:00:00Z"),
        end: new Date("2024-01-15T16:00:00Z"), // 2 hours in Google
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(shortBooking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          start: "2024-01-15T14:00:00.000Z",
          end: "2024-01-15T14:30:00.000Z", // 30 min preserved, NOT 2 hours
        }),
      })
    );
  });

  test("should preserve original 2-hour duration when Google shortens to 15 min", async () => {
    const longBooking = makeBooking({
      recurringEventId: undefined,
      startTime: new Date("2024-01-15T10:00:00Z"),
      endTime: new Date("2024-01-15T12:00:00Z"), // 2 hours
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T14:00:00Z"),
        end: new Date("2024-01-15T14:15:00Z"), // 15 min in Google
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(longBooking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          start: "2024-01-15T14:00:00.000Z",
          end: "2024-01-15T16:00:00.000Z", // 2h preserved
        }),
      })
    );
  });

  test("should skip reschedule when event.start is null (no time info)", async () => {
    const booking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: null,
        end: null,
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    // hasStartTimeChanged returns false when event.start is null → updateBookingFields only
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  test("should pass skipEventLimitsCheck to bypass daily/weekly booking limits", async () => {
    const booking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T14:00:00Z"),
        end: new Date("2024-01-15T15:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingMeta: expect.objectContaining({
          skipEventLimitsCheck: true,
        }),
      })
    );
  });

  test("should pass skipCalendarSyncTaskCreation to prevent infinite sync loop", async () => {
    const booking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T14:00:00Z"),
        end: new Date("2024-01-15T15:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingMeta: expect.objectContaining({
          skipCalendarSyncTaskCreation: true,
        }),
      })
    );
  });

  test("should reschedule across days correctly (Monday → Friday)", async () => {
    const booking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-19T10:00:00Z"), // Friday
        end: new Date("2024-01-19T11:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          start: "2024-01-19T10:00:00.000Z",
          end: "2024-01-19T11:00:00.000Z",
          rescheduleUid: "booking-uid-123",
        }),
      })
    );
  });

  test("should reschedule when event crosses midnight (preserving original duration)", async () => {
    const crossMidnightBooking = makeBooking({
      recurringEventId: undefined,
      startTime: new Date("2024-01-15T23:00:00Z"),
      endTime: new Date("2024-01-16T00:30:00Z"), // 90 min crossing midnight
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-20T22:00:00Z"),
        end: new Date("2024-01-20T23:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(crossMidnightBooking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          start: "2024-01-20T22:00:00.000Z",
          end: "2024-01-20T23:30:00.000Z", // 90 min preserved, crosses midnight
        }),
      })
    );
  });

  test("should use event timezone in reschedule data", async () => {
    const booking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T14:00:00Z"),
        end: new Date("2024-01-15T15:00:00Z"),
        timeZone: "Europe/London",
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          timeZone: "Europe/London",
        }),
      })
    );
  });

  test("should fall back to UTC when event has no timezone", async () => {
    const booking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T14:00:00Z"),
        end: new Date("2024-01-15T15:00:00Z"),
        timeZone: null,
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          timeZone: "UTC",
        }),
      })
    );
  });

  test("should include idempotency key in reschedule data", async () => {
    const booking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T14:00:00Z"),
        end: new Date("2024-01-15T15:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          idempotencyKey: "test-idempotency-key",
        }),
      })
    );
  });

  test("should include calendarSubscriptionEvent metadata on reschedule", async () => {
    const booking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T14:00:00Z"),
        end: new Date("2024-01-15T15:00:00Z"),
        summary: "Team Meeting",
        description: "Sync up",
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          metadata: expect.objectContaining({
            calendarSubscriptionEvent: expect.any(String),
          }),
        }),
      })
    );

    const metadata = mockCreateBooking.mock.calls[0][0].bookingData.metadata;
    const parsed = JSON.parse(metadata.calendarSubscriptionEvent);
    expect(parsed.summary).toBe("Team Meeting");
    expect(parsed.description).toBe("Sync up");
  });

  test("should merge booking responses with event data on reschedule", async () => {
    const booking = makeBooking({
      recurringEventId: undefined,
      responses: {
        name: "Jane Doe",
        email: "jane@example.com",
        notes: "Old notes",
        guests: ["guest@example.com"],
      },
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T14:00:00Z"),
        end: new Date("2024-01-15T15:00:00Z"),
        summary: "Updated Title",
        description: "New notes from calendar",
        location: "Room 101",
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          responses: expect.objectContaining({
            name: "Jane Doe",
            email: "jane@example.com",
            guests: ["guest@example.com"],
            title: "Updated Title",
            notes: "New notes from calendar",
            location: { value: "Room 101", label: "Room 101", optionValue: "Room 101" },
          }),
        }),
      })
    );
  });

  test("should preserve booking responses when event has no summary/description/location", async () => {
    const booking = makeBooking({
      recurringEventId: undefined,
      responses: {
        name: "Jane Doe",
        email: "jane@example.com",
        notes: "Keep these notes",
        location: { value: "Original Room", label: "Original Room", optionValue: "Original Room" },
      },
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T14:00:00Z"),
        end: new Date("2024-01-15T15:00:00Z"),
        summary: null,
        description: null,
        location: null,
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          responses: expect.objectContaining({
            name: "Jane Doe",
            notes: "Keep these notes",
            location: { value: "Original Room", label: "Original Room", optionValue: "Original Room" },
          }),
        }),
      })
    );
    // Should NOT have title override since summary is null
    const responses = mockCreateBooking.mock.calls[0][0].bookingData.responses;
    expect(responses.title).toBeUndefined();
  });

  test("should build fallback responses when booking has null responses", async () => {
    const booking = makeBooking({
      recurringEventId: undefined,
      responses: null,
      title: "My Booking",
      userPrimaryEmail: "user@test.com",
      description: "Some notes",
      location: "Zoom",
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T14:00:00Z"),
        end: new Date("2024-01-15T15:00:00Z"),
        summary: null,
        description: null,
        location: null,
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          responses: expect.objectContaining({
            name: "My Booking",
            email: "user@test.com",
            guests: [],
            notes: "Some notes",
          }),
        }),
      })
    );
  });

  test("should use original booking when reschedule chain returns null", async () => {
    const rescheduledBooking = makeBooking({
      recurringEventId: undefined,
      rescheduled: true,
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T14:00:00Z"),
        end: new Date("2024-01-15T15:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(rescheduledBooking);
    mockBookingRepository.findLatestBookingInRescheduleChain = vi.fn().mockResolvedValue(null);

    await service.handleEvents(mockSelectedCalendar, events);

    // Falls back to original booking since chain returned null
    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          rescheduleUid: "booking-uid-123",
        }),
      })
    );
  });

  test("should skip when iCalUID has no @ separator (malformed)", async () => {
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "malformed-icaluid-no-at-sign",
        start: new Date("2024-01-15T14:00:00Z"),
        status: "confirmed",
      }),
    ];

    await service.handleEvents(mockSelectedCalendar, events);

    // Filtered out by @cal.com check in handleEvents
    expect(mockBookingRepository.findByUid).not.toHaveBeenCalled();
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  test("should update only description when attendee comment changed (no time change)", async () => {
    const booking = makeBooking({
      recurringEventId: undefined,
      startTime: new Date("2024-01-15T10:00:00Z"),
      description: "Old description",
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T10:00:00Z"), // same time
        end: new Date("2024-01-15T11:00:00Z"),
        summary: "Team Standup", // same title
        description: "Updated description",
        location: "https://meet.google.com/abc", // same location
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).not.toHaveBeenCalled();
    expect(mockBookingRepository.update).toHaveBeenCalledWith({
      where: { uid: "booking-uid-123" },
      data: { description: "Updated description" },
    });
  });

  test("should update only location when only location changed (no time change)", async () => {
    const booking = makeBooking({
      recurringEventId: undefined,
      startTime: new Date("2024-01-15T10:00:00Z"),
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T10:00:00Z"),
        end: new Date("2024-01-15T11:00:00Z"),
        summary: "Team Standup",
        description: "Daily standup meeting",
        location: "https://zoom.us/j/123",
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).not.toHaveBeenCalled();
    expect(mockBookingRepository.update).toHaveBeenCalledWith({
      where: { uid: "booking-uid-123" },
      data: { location: "https://zoom.us/j/123" },
    });
  });

  test("should update only title when only summary changed (no time change)", async () => {
    const booking = makeBooking({
      recurringEventId: undefined,
      startTime: new Date("2024-01-15T10:00:00Z"),
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T10:00:00Z"),
        end: new Date("2024-01-15T11:00:00Z"),
        summary: "Renamed Standup",
        description: "Daily standup meeting",
        location: "https://meet.google.com/abc",
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).not.toHaveBeenCalled();
    expect(mockBookingRepository.update).toHaveBeenCalledWith({
      where: { uid: "booking-uid-123" },
      data: { title: "Renamed Standup" },
    });
  });

  test("should update multiple fields at once when several changed (no time change)", async () => {
    const booking = makeBooking({
      recurringEventId: undefined,
      startTime: new Date("2024-01-15T10:00:00Z"),
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T10:00:00Z"),
        end: new Date("2024-01-15T11:00:00Z"),
        summary: "New Title",
        description: "New Description",
        location: "New Room",
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).not.toHaveBeenCalled();
    expect(mockBookingRepository.update).toHaveBeenCalledWith({
      where: { uid: "booking-uid-123" },
      data: {
        title: "New Title",
        description: "New Description",
        location: "New Room",
      },
    });
  });

  test("should NOT update fields when nothing changed (no time change, same metadata)", async () => {
    const booking = makeBooking({
      recurringEventId: undefined,
      startTime: new Date("2024-01-15T10:00:00Z"),
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T10:00:00Z"),
        end: new Date("2024-01-15T11:00:00Z"),
        summary: "Team Standup",
        description: "Daily standup meeting",
        location: "https://meet.google.com/abc",
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).not.toHaveBeenCalled();
    expect(mockBookingRepository.update).not.toHaveBeenCalled();
  });

  test("should set eventTypeId from booking on reschedule", async () => {
    const booking = makeBooking({ recurringEventId: undefined, eventTypeId: 77 });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T14:00:00Z"),
        end: new Date("2024-01-15T15:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          eventTypeId: 77,
        }),
      })
    );
  });

  test("should not reschedule or cancel when createBooking throws (error isolation)", async () => {
    const booking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T14:00:00Z"),
        end: new Date("2024-01-15T15:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    mockCreateBooking.mockRejectedValueOnce(new Error("Booking service error"));

    await expect(service.handleEvents(mockSelectedCalendar, events)).resolves.not.toThrow();
    expect(mockHandleCancelBooking).not.toHaveBeenCalled();
  });

  test("should cancel a single booking and skip skipCalendarSyncTaskCancellation is passed", async () => {
    const booking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        status: "cancelled",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockHandleCancelBooking).toHaveBeenCalledTimes(1);
    expect(mockHandleCancelBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        actionSource: "SYSTEM",
        bookingData: expect.objectContaining({
          uid: "booking-uid-123",
          cancellationReason: "Cancelled on user's calendar",
          cancelledBy: "user@example.com",
          skipCalendarSyncTaskCancellation: true,
        }),
      })
    );
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  test("should follow reschedule chain when cancelling a previously rescheduled booking", async () => {
    const rescheduledBooking = makeBooking({
      recurringEventId: undefined,
      rescheduled: true,
    });
    const latestBooking = makeBooking({
      id: 20,
      uid: "booking-latest-cancel",
      recurringEventId: undefined,
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        status: "cancelled",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(rescheduledBooking);
    mockBookingRepository.findLatestBookingInRescheduleChain = vi.fn().mockResolvedValue(latestBooking);

    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockHandleCancelBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          uid: "booking-latest-cancel",
        }),
      })
    );
  });

  test("should reschedule on a weekend when host moves event to Saturday", async () => {
    const booking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-20T10:00:00Z"), // Saturday
        end: new Date("2024-01-20T11:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    // Allowed because skipAvailabilityCheck is true
    expect(mockCreateBooking).toHaveBeenCalledTimes(1);
    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          start: "2024-01-20T10:00:00.000Z",
        }),
      })
    );
  });

  test("should handle reschedule to a past time (host control)", async () => {
    const booking = makeBooking({
      recurringEventId: undefined,
      startTime: new Date("2024-01-15T10:00:00Z"),
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-10T10:00:00Z"), // moved to past
        end: new Date("2024-01-10T11:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    // Allowed because skipBookingTimeOutOfBoundsCheck is true
    expect(mockCreateBooking).toHaveBeenCalledTimes(1);
    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          start: "2024-01-10T10:00:00.000Z",
        }),
      })
    );
  });

  test("should reschedule an all-day event (midnight-to-midnight) preserving original duration", async () => {
    const booking = makeBooking({
      recurringEventId: undefined,
      startTime: new Date("2024-01-15T10:00:00Z"),
      endTime: new Date("2024-01-15T11:00:00Z"), // 60 min
    });
    // Google sends date-only for all-day events, which JS parses as midnight UTC
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-20T00:00:00Z"), // midnight (all-day)
        end: new Date("2024-01-21T00:00:00Z"), // next midnight (24h)
        isAllDay: true,
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    // Duration preserved from original booking (60 min), not from Google's 24h
    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          start: "2024-01-20T00:00:00.000Z",
          end: "2024-01-20T01:00:00.000Z", // 60 min, not 24h
        }),
      })
    );
  });

  test("should skip reschedule when booking is already cancelled in DB", async () => {
    const cancelledBooking = makeBooking({
      recurringEventId: undefined,
      status: "CANCELLED",
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-16T14:00:00Z"),
        end: new Date("2024-01-16T15:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(cancelledBooking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  test("should skip cancel when booking is already cancelled in DB", async () => {
    const cancelledBooking = makeBooking({
      recurringEventId: undefined,
      status: "CANCELLED",
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        status: "cancelled",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(cancelledBooking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockHandleCancelBooking).not.toHaveBeenCalled();
  });

  test("should still cancel an active recurring instance even when booking-1 (iCalUID anchor) is cancelled", async () => {
    // booking-1 is the iCalUID anchor and is cancelled; booking-3 is active.
    // The guard must run AFTER instance resolution so booking-3 is still cancelled.
    const booking1 = makeBooking({
      uid: "booking-uid-123",
      recurringEventId: "recurring-abc",
      status: "CANCELLED",
      startTime: new Date("2024-01-15T10:00:00Z"),
    });
    const booking3 = makeBooking({
      uid: "booking-uid-789",
      recurringEventId: "recurring-abc",
      status: "ACCEPTED",
      startTime: new Date("2024-01-29T10:00:00Z"),
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        status: "cancelled",
        originalStartDate: new Date("2024-01-29T10:00:00Z"),
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockImplementation(({ bookingUid }) => {
      if (bookingUid === "booking-uid-123") return Promise.resolve(booking1);
      if (bookingUid === "booking-uid-789") return Promise.resolve(booking3);
      return Promise.resolve(null);
    });
    mockBookingRepository.findByRecurringEventIdAndStartTime = vi
      .fn()
      .mockResolvedValue({ uid: "booking-uid-789" });
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockHandleCancelBooking).toHaveBeenCalledTimes(1);
  });

  test("should still reschedule an active recurring instance even when booking-1 (iCalUID anchor) is cancelled", async () => {
    const booking1 = makeBooking({
      uid: "booking-uid-123",
      recurringEventId: "recurring-abc",
      status: "CANCELLED",
      startTime: new Date("2024-01-15T10:00:00Z"),
    });
    const booking3 = makeBooking({
      uid: "booking-uid-789",
      recurringEventId: "recurring-abc",
      status: "ACCEPTED",
      startTime: new Date("2024-01-29T10:00:00Z"),
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-30T10:00:00Z"),
        end: new Date("2024-01-30T11:00:00Z"),
        status: "confirmed",
        originalStartDate: new Date("2024-01-29T10:00:00Z"),
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockImplementation(({ bookingUid }) => {
      if (bookingUid === "booking-uid-123") return Promise.resolve(booking1);
      if (bookingUid === "booking-uid-789") return Promise.resolve(booking3);
      return Promise.resolve(null);
    });
    mockBookingRepository.findByRecurringEventIdAndStartTime = vi
      .fn()
      .mockResolvedValue({ uid: "booking-uid-789" });
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledTimes(1);
  });

  test("should process duplicate iCalUIDs individually — no deduplication logic", async () => {
    // When two events reference the same iCalUID, each is processed independently.
    // We process sequentially to avoid vitest dynamic import concurrency issues,
    // but the business logic is validated: each event triggers a reschedule.
    const booking = makeBooking({ recurringEventId: undefined });

    const event1: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-16T14:00:00Z"),
        end: new Date("2024-01-16T15:00:00Z"),
        status: "confirmed",
      }),
    ];
    const event2: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-17T14:00:00Z"),
        end: new Date("2024-01-17T15:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);

    await service.handleEvents(mockSelectedCalendar, event1);
    expect(mockCreateBooking).toHaveBeenCalledTimes(1);

    mockCreateBooking.mockClear();
    await service.handleEvents(mockSelectedCalendar, event2);
    expect(mockCreateBooking).toHaveBeenCalledTimes(1);
  });

  test("should follow a deep reschedule chain A→B→C→D on reschedule", async () => {
    const bookingA = makeBooking({
      recurringEventId: undefined,
      rescheduled: true,
    });
    // findLatestBookingInRescheduleChain resolves the entire chain
    const bookingD = makeBooking({
      id: 40,
      uid: "booking-D",
      recurringEventId: undefined,
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-20T14:00:00Z"),
        end: new Date("2024-01-20T15:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(bookingA);
    mockBookingRepository.findLatestBookingInRescheduleChain = vi.fn().mockResolvedValue(bookingD);

    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          rescheduleUid: "booking-D",
        }),
      })
    );
  });

  test("should follow a deep reschedule chain A→B→C→D on cancel", async () => {
    const bookingA = makeBooking({
      recurringEventId: undefined,
      rescheduled: true,
    });
    const bookingD = makeBooking({
      id: 40,
      uid: "booking-D",
      recurringEventId: undefined,
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        status: "cancelled",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(bookingA);
    mockBookingRepository.findLatestBookingInRescheduleChain = vi.fn().mockResolvedValue(bookingD);

    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockHandleCancelBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          uid: "booking-D",
        }),
      })
    );
  });

  test("should handle DST spring-forward: event at 2:30 AM becomes 3:30 AM", async () => {
    // Simulates DST spring-forward where 2:30 AM doesn't exist, Google shifts to 3:30 AM
    const booking = makeBooking({
      recurringEventId: undefined,
      startTime: new Date("2024-03-10T07:30:00Z"), // 2:30 AM EST = 7:30 UTC
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-03-10T07:30:00Z"), // 3:30 AM EDT = 7:30 UTC (same instant)
        end: new Date("2024-03-10T08:30:00Z"),
        timeZone: "America/New_York",
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    // Same UTC instant — no reschedule triggered
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  test("should detect DST fall-back time shift as a reschedule", async () => {
    // During fall-back, 1:30 AM EST becomes 1:30 AM EDT (different UTC instants)
    const booking = makeBooking({
      recurringEventId: undefined,
      startTime: new Date("2024-11-03T05:30:00Z"), // 1:30 AM EDT = 5:30 UTC
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-11-03T06:30:00Z"), // 1:30 AM EST = 6:30 UTC (1h later)
        end: new Date("2024-11-03T07:30:00Z"),
        timeZone: "America/New_York",
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    // Different UTC instant → reschedule
    expect(mockCreateBooking).toHaveBeenCalledTimes(1);
    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          start: "2024-11-03T06:30:00.000Z",
          timeZone: "America/New_York",
        }),
      })
    );
  });

  test("should handle recurring booking where booking 1 (iCalUID anchor) was itself rescheduled", async () => {
    // Booking 1 in a recurring series was rescheduled to booking 1'.
    // Google still references booking 1's iCalUID for all instances.
    const booking1 = makeBooking({
      id: 1,
      uid: "booking-1",
      recurringEventId: "recurring-abc",
      rescheduled: true,
      startTime: new Date("2024-01-15T10:00:00Z"),
    });
    const booking1Prime = makeBooking({
      id: 10,
      uid: "booking-1-prime",
      recurringEventId: "recurring-abc",
      startTime: new Date("2024-01-15T14:00:00Z"),
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-1@cal.com",
        originalStartDate: new Date("2024-01-15T10:00:00Z"),
        start: new Date("2024-01-15T16:00:00Z"), // moved again
        end: new Date("2024-01-15T17:00:00Z"),
        status: "confirmed",
      }),
    ];

    // findByUid returns the original booking 1
    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking1);
    // Instance resolution finds booking 1 by originalStartDate
    mockBookingRepository.findByRecurringEventIdAndStartTime = vi
      .fn()
      .mockResolvedValue({ uid: "booking-1", startTime: new Date("2024-01-15T10:00:00Z") });
    // Reschedule chain resolves booking 1 → booking 1'
    mockBookingRepository.findLatestBookingInRescheduleChain = vi.fn().mockResolvedValue(booking1Prime);

    await service.handleEvents(mockSelectedCalendar, events);

    // Should reschedule from booking 1' (the latest in chain)
    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          rescheduleUid: "booking-1-prime",
          start: "2024-01-15T16:00:00.000Z",
        }),
      })
    );
  });

  test("should handle updateBookingFields error without crashing the batch", async () => {
    const booking = makeBooking({
      recurringEventId: undefined,
      startTime: new Date("2024-01-15T10:00:00Z"),
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T10:00:00Z"), // same time → field update path
        end: new Date("2024-01-15T11:00:00Z"),
        summary: "Updated Title",
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    mockBookingRepository.update = vi.fn().mockRejectedValue(new Error("DB write error"));

    await expect(service.handleEvents(mockSelectedCalendar, events)).resolves.not.toThrow();
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  test("should record isAllDay flag in calendarSubscriptionEvent metadata", async () => {
    const booking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-20T00:00:00Z"),
        end: new Date("2024-01-21T00:00:00Z"),
        isAllDay: true,
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    const metadata = mockCreateBooking.mock.calls[0][0].bookingData.metadata;
    const parsed = JSON.parse(metadata.calendarSubscriptionEvent);
    expect(parsed.isAllDay).toBe(true);
  });

  test("should handle cancel + reschedule of same iCalUID in one batch", async () => {
    const booking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        status: "cancelled",
      }),
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-16T14:00:00Z"),
        end: new Date("2024-01-16T15:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    // Both are processed concurrently — cancel and reschedule both fire
    expect(mockHandleCancelBooking).toHaveBeenCalledTimes(1);
    expect(mockCreateBooking).toHaveBeenCalledTimes(1);
  });

  test("should handle event with empty string iCalUID", async () => {
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "",
        start: new Date("2024-01-15T14:00:00Z"),
        status: "confirmed",
      }),
    ];

    await service.handleEvents(mockSelectedCalendar, events);

    // Empty iCalUID doesn't end with @cal.com → filtered out
    expect(mockBookingRepository.findByUid).not.toHaveBeenCalled();
  });

  test("should handle event with null iCalUID", async () => {
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: null,
        start: new Date("2024-01-15T14:00:00Z"),
        status: "confirmed",
      }),
    ];

    await service.handleEvents(mockSelectedCalendar, events);

    // null iCalUID → filtered out by the .filter() in handleEvents
    expect(mockBookingRepository.findByUid).not.toHaveBeenCalled();
  });

  test("should handle booking with null userId (skip reschedule due to host check)", async () => {
    const noUserBooking = makeBooking({
      recurringEventId: undefined,
      userId: null,
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-16T14:00:00Z"),
        end: new Date("2024-01-16T15:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(noUserBooking);
    await service.handleEvents(mockSelectedCalendar, events);

    // booking.userId (null) !== calendarUserId (1) → skipped
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });
});

describe("Scenario 6: reschedule all remaining recurring instances (this and following)", () => {
  let service: CalendarSyncService;
  let mockBookingRepository: BookingRepository;

  beforeEach(() => {
    mockBookingRepository = {
      findByUid: vi.fn(),
      findLatestBookingInRescheduleChain: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      findByRecurringEventIdAndStartTime: vi.fn().mockResolvedValue(null),
    } as unknown as BookingRepository;

    service = new CalendarSyncService({ bookingRepository: mockBookingRepository });
    vi.clearAllMocks();
  });

  test("should reschedule instances 2, 3, and 4 when user moves 'this and following events'", async () => {
    // Process events sequentially to avoid dynamic import concurrency issues
    const eventConfigs = [
      {
        id: "gcal-2",
        originalStartDate: new Date("2024-01-12T10:00:00Z"),
        start: new Date("2024-01-12T14:00:00Z"),
        end: new Date("2024-01-12T15:00:00Z"),
        expectedUid: "booking-2-uid",
        expectedStart: "2024-01-12T14:00:00.000Z",
      },
      {
        id: "gcal-3",
        originalStartDate: new Date("2024-01-19T10:00:00Z"),
        start: new Date("2024-01-19T14:00:00Z"),
        end: new Date("2024-01-19T15:00:00Z"),
        expectedUid: "booking-3-uid",
        expectedStart: "2024-01-19T14:00:00.000Z",
      },
      {
        id: "gcal-4",
        originalStartDate: new Date("2024-01-26T10:00:00Z"),
        start: new Date("2024-01-26T14:00:00Z"),
        end: new Date("2024-01-26T15:00:00Z"),
        expectedUid: "booking-4-uid",
        expectedStart: "2024-01-26T14:00:00.000Z",
      },
    ];

    mockBookingRepository.findByUid = vi
      .fn()
      .mockImplementation(({ bookingUid }: { bookingUid: string }) => {
        const map: Record<string, ReturnType<typeof makeBooking>> = {
          "booking-1-uid": recurringBookings[0],
          "booking-2-uid": recurringBookings[1],
          "booking-3-uid": recurringBookings[2],
          "booking-4-uid": recurringBookings[3],
        };
        return Promise.resolve(map[bookingUid] ?? null);
      });

    mockBookingRepository.findByRecurringEventIdAndStartTime = vi
      .fn()
      .mockImplementation(({ startTime }: { startTime: Date }) => {
        const map: Record<string, { id: number; uid: string }> = {
          "2024-01-12T10:00:00.000Z": { id: 2, uid: "booking-2-uid" },
          "2024-01-19T10:00:00.000Z": { id: 3, uid: "booking-3-uid" },
          "2024-01-26T10:00:00.000Z": { id: 4, uid: "booking-4-uid" },
        };
        return Promise.resolve(map[startTime.toISOString()] ?? null);
      });

    // Process each instance sequentially (simulating how Google sends them)
    for (const cfg of eventConfigs) {
      const event = makeEvent({
        id: cfg.id,
        iCalUID: "booking-1-uid@cal.com",
        start: cfg.start,
        end: cfg.end,
        originalStartDate: cfg.originalStartDate,
        recurringEventId: "gcal-rec-id",
        status: "confirmed",
      });
      await service.handleEvents(mockSelectedCalendar, [event]);
    }

    expect(mockCreateBooking).toHaveBeenCalledTimes(3);
    for (const cfg of eventConfigs) {
      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingData: expect.objectContaining({
            rescheduleUid: cfg.expectedUid,
            start: cfg.expectedStart,
          }),
        })
      );
    }
    expect(mockHandleCancelBooking).not.toHaveBeenCalled();
  });
});

describe("Scenario 7: originalStartTime doesn't match any booking", () => {
  let service: CalendarSyncService;
  let mockBookingRepository: BookingRepository;

  beforeEach(() => {
    mockBookingRepository = {
      findByUid: vi.fn(),
      findLatestBookingInRescheduleChain: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      findByRecurringEventIdAndStartTime: vi.fn().mockResolvedValue(null),
    } as unknown as BookingRepository;

    service = new CalendarSyncService({ bookingRepository: mockBookingRepository });
    vi.clearAllMocks();
  });

  test("cancel path: should skip cancellation to avoid cancelling the wrong instance", async () => {
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-1-uid@cal.com",
        status: "cancelled",
        start: new Date("2024-02-02T10:00:00Z"), // no booking at this time
        originalStartDate: new Date("2024-02-02T10:00:00Z"),
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(recurringBookings[0]);
    mockBookingRepository.findByRecurringEventIdAndStartTime = vi.fn().mockResolvedValue(null);

    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockHandleCancelBooking).not.toHaveBeenCalled();
  });

  test("reschedule path: should skip reschedule when unresolvable instance hasn't moved (originalStartDate === start)", async () => {
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-1-uid@cal.com",
        start: new Date("2024-02-02T10:00:00Z"),
        end: new Date("2024-02-02T11:00:00Z"),
        originalStartDate: new Date("2024-02-02T10:00:00Z"),
        recurringEventId: "gcal-rec-id",
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(recurringBookings[0]);
    mockBookingRepository.findByRecurringEventIdAndStartTime = vi.fn().mockResolvedValue(null);

    await service.handleEvents(mockSelectedCalendar, events);

    // originalStartDate === start → unmodified, skip reschedule
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  test("reschedule path: should proceed when originalStartDate resolves and instance was moved", async () => {
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-1-uid@cal.com",
        start: new Date("2024-01-12T16:00:00Z"),
        end: new Date("2024-01-12T17:00:00Z"),
        originalStartDate: new Date("2024-01-12T10:00:00Z"),
        recurringEventId: "gcal-rec-id",
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi
      .fn()
      .mockResolvedValueOnce(recurringBookings[0])
      .mockResolvedValueOnce(recurringBookings[1]);
    mockBookingRepository.findByRecurringEventIdAndStartTime = vi
      .fn()
      .mockResolvedValue({ id: 2, uid: "booking-2-uid" });

    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          rescheduleUid: "booking-2-uid",
          start: "2024-01-12T16:00:00.000Z",
        }),
      })
    );
  });
});

describe("Scenario 8: originalStartTime is absent", () => {
  let service: CalendarSyncService;
  let mockBookingRepository: BookingRepository;

  beforeEach(() => {
    mockBookingRepository = {
      findByUid: vi.fn(),
      findLatestBookingInRescheduleChain: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      findByRecurringEventIdAndStartTime: vi.fn().mockResolvedValue(null),
    } as unknown as BookingRepository;

    service = new CalendarSyncService({ bookingRepository: mockBookingRepository });
    vi.clearAllMocks();
  });

  test("cancel path: should fall back to event.start for instance resolution", async () => {
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-1-uid@cal.com",
        status: "cancelled",
        start: new Date("2024-01-19T10:00:00Z"),
        originalStartDate: null,
      }),
    ];

    mockBookingRepository.findByUid = vi
      .fn()
      .mockResolvedValueOnce(recurringBookings[0])
      .mockResolvedValueOnce(recurringBookings[2]);
    mockBookingRepository.findByRecurringEventIdAndStartTime = vi
      .fn()
      .mockResolvedValue({ id: 3, uid: "booking-3-uid" });

    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockBookingRepository.findByRecurringEventIdAndStartTime).toHaveBeenCalledWith({
      recurringEventId: RECURRING_EVENT_ID,
      startTime: new Date("2024-01-19T10:00:00Z"),
    });
    expect(mockHandleCancelBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({ uid: "booking-3-uid" }),
      })
    );
  });

  test("cancel path: should bail out when event.start doesn't match and resolution fails", async () => {
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-1-uid@cal.com",
        status: "cancelled",
        start: new Date("2024-02-09T10:00:00Z"), // no booking at this time
        originalStartDate: null,
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(recurringBookings[0]);
    mockBookingRepository.findByRecurringEventIdAndStartTime = vi.fn().mockResolvedValue(null);

    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockHandleCancelBooking).not.toHaveBeenCalled();
  });

  test("reschedule path: should skip when another booking in series exists at event.start (fallback check)", async () => {
    // Recurring booking, no originalStartDate, different start from booking-1
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-1-uid@cal.com",
        start: new Date("2024-01-12T10:00:00Z"),
        end: new Date("2024-01-12T11:00:00Z"),
        originalStartDate: null,
        recurringEventId: null,
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(recurringBookings[0]);
    // Another booking exists at the event time
    mockBookingRepository.findByRecurringEventIdAndStartTime = vi
      .fn()
      .mockResolvedValue({ id: 2, uid: "booking-2-uid" });

    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  test("reschedule path: should allow reschedule when no other booking at event time", async () => {
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-1-uid@cal.com",
        start: new Date("2024-01-05T18:00:00Z"),
        end: new Date("2024-01-05T19:00:00Z"),
        originalStartDate: null,
        recurringEventId: null,
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(recurringBookings[0]);
    mockBookingRepository.findByRecurringEventIdAndStartTime = vi.fn().mockResolvedValue(null);

    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          rescheduleUid: "booking-1-uid",
          start: "2024-01-05T18:00:00.000Z",
        }),
      })
    );
  });
});

describe("Additional edge cases", () => {
  let service: CalendarSyncService;
  let mockBookingRepository: BookingRepository;

  beforeEach(() => {
    mockBookingRepository = {
      findByUid: vi.fn(),
      findLatestBookingInRescheduleChain: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      findByRecurringEventIdAndStartTime: vi.fn().mockResolvedValue(null),
    } as unknown as BookingRepository;

    service = new CalendarSyncService({ bookingRepository: mockBookingRepository });
    vi.clearAllMocks();
  });

  test("should handle mixed cancel + reschedule events in the same batch", async () => {
    const bookingA = makeBooking({ id: 10, uid: "booking-a-uid", recurringEventId: undefined });
    const bookingB = makeBooking({
      id: 11,
      uid: "booking-b-uid",
      recurringEventId: undefined,
      startTime: new Date("2024-01-06T09:00:00Z"),
      endTime: new Date("2024-01-06T10:00:00Z"),
    });

    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({ id: "cancel-evt", iCalUID: "booking-a-uid@cal.com", status: "cancelled" }),
      makeEvent({
        id: "reschedule-evt",
        iCalUID: "booking-b-uid@cal.com",
        start: new Date("2024-01-06T15:00:00Z"),
        end: new Date("2024-01-06T16:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi
      .fn()
      .mockImplementation(({ bookingUid }: { bookingUid: string }) => {
        if (bookingUid === "booking-a-uid") return Promise.resolve(bookingA);
        if (bookingUid === "booking-b-uid") return Promise.resolve(bookingB);
        return Promise.resolve(null);
      });

    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockHandleCancelBooking).toHaveBeenCalledTimes(1);
    expect(mockHandleCancelBooking).toHaveBeenCalledWith(
      expect.objectContaining({ bookingData: expect.objectContaining({ uid: "booking-a-uid" }) })
    );
    expect(mockCreateBooking).toHaveBeenCalledTimes(1);
    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({
          rescheduleUid: "booking-b-uid",
          start: "2024-01-06T15:00:00.000Z",
        }),
      })
    );
  });

  test("should filter out non-Cal.com events from the batch", async () => {
    const singleBooking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "external-event@gmail.com",
        status: "confirmed",
        start: new Date("2024-01-15T14:00:00Z"),
      }),
      makeEvent({ iCalUID: "booking-uid-123@cal.com", status: "cancelled" }),
      makeEvent({ iCalUID: "another@outlook.com", status: "cancelled" }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(singleBooking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockBookingRepository.findByUid).toHaveBeenCalledTimes(1);
    expect(mockHandleCancelBooking).toHaveBeenCalledTimes(1);
  });

  test("should handle case-insensitive iCalUID matching (@CAL.COM)", async () => {
    const singleBooking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@CAL.COM",
        start: new Date("2024-01-15T14:00:00Z"),
        end: new Date("2024-01-15T15:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(singleBooking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).toHaveBeenCalledTimes(1);
  });

  test("should skip when booking is not found in database", async () => {
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "nonexistent@cal.com",
        start: new Date("2024-01-15T14:00:00Z"),
        status: "confirmed",
      }),
      makeEvent({ iCalUID: "also-missing@cal.com", status: "cancelled" }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(null);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).not.toHaveBeenCalled();
    expect(mockHandleCancelBooking).not.toHaveBeenCalled();
  });

  test("should skip reschedule when booking has no eventTypeId", async () => {
    const bookingNoEventType = makeBooking({
      recurringEventId: undefined,
      eventTypeId: null,
      eventType: null,
    });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T14:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(bookingNoEventType);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  test("should skip cancellation when booking is missing user data", async () => {
    const bookingNoEmail = makeBooking({ recurringEventId: undefined, userPrimaryEmail: null });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({ iCalUID: "booking-uid-123@cal.com", status: "cancelled" }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(bookingNoEmail);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockHandleCancelBooking).not.toHaveBeenCalled();
  });

  test("should handle errors gracefully without failing the entire batch", async () => {
    const bookingA = makeBooking({ id: 10, uid: "booking-a-uid", recurringEventId: undefined });
    const bookingB = makeBooking({
      id: 11,
      uid: "booking-b-uid",
      recurringEventId: undefined,
      startTime: new Date("2024-01-06T09:00:00Z"),
      endTime: new Date("2024-01-06T10:00:00Z"),
    });

    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({ id: "fail-evt", iCalUID: "booking-a-uid@cal.com", status: "cancelled" }),
      makeEvent({
        id: "ok-evt",
        iCalUID: "booking-b-uid@cal.com",
        start: new Date("2024-01-06T15:00:00Z"),
        end: new Date("2024-01-06T16:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi
      .fn()
      .mockImplementation(({ bookingUid }: { bookingUid: string }) => {
        if (bookingUid === "booking-a-uid") return Promise.resolve(bookingA);
        if (bookingUid === "booking-b-uid") return Promise.resolve(bookingB);
        return Promise.resolve(null);
      });
    mockHandleCancelBooking.mockRejectedValueOnce(new Error("Network error"));

    await expect(service.handleEvents(mockSelectedCalendar, events)).resolves.not.toThrow();

    expect(mockHandleCancelBooking).toHaveBeenCalledTimes(1);
    expect(mockCreateBooking).toHaveBeenCalledTimes(1);
  });

  test("should process empty event list without errors", async () => {
    await expect(service.handleEvents(mockSelectedCalendar, [])).resolves.not.toThrow();

    expect(mockBookingRepository.findByUid).not.toHaveBeenCalled();
    expect(mockHandleCancelBooking).not.toHaveBeenCalled();
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  test("should skip reschedule for unmodified recurring instance even without DB time skew", async () => {
    // DB and Google agree on time, originalStartDate === start → not moved
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-1-uid@cal.com",
        start: new Date("2024-01-05T10:00:00Z"),
        end: new Date("2024-01-05T11:00:00Z"),
        originalStartDate: new Date("2024-01-05T10:00:00Z"),
        recurringEventId: "gcal-rec-id",
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(recurringBookings[0]);
    await service.handleEvents(mockSelectedCalendar, events);

    // hasStartTimeChanged = false (times match), updateBookingFields called with no changes → no-op
    expect(mockCreateBooking).not.toHaveBeenCalled();
    expect(mockBookingRepository.update).not.toHaveBeenCalled();
  });

  test("should skip when calendar owner is not the booking host (reschedule)", async () => {
    const otherUsersBooking = makeBooking({ userId: 999, recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        start: new Date("2024-01-15T14:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(otherUsersBooking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockCreateBooking).not.toHaveBeenCalled();
    expect(mockHandleCancelBooking).not.toHaveBeenCalled();
  });

  test("should skip when calendar owner is not the booking host (cancel)", async () => {
    const otherUsersBooking = makeBooking({ userId: 999, recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({ iCalUID: "booking-uid-123@cal.com", status: "cancelled" }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(otherUsersBooking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockHandleCancelBooking).not.toHaveBeenCalled();
  });

  test("should never reschedule a cancelled event", async () => {
    const booking = makeBooking({ recurringEventId: undefined });
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-uid-123@cal.com",
        status: "cancelled",
        start: new Date("2024-01-15T14:00:00Z"),
        end: new Date("2024-01-15T15:00:00Z"),
      }),
    ];

    mockBookingRepository.findByUid = vi.fn().mockResolvedValue(booking);
    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockHandleCancelBooking).toHaveBeenCalledTimes(1);
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  test("should never reschedule a cancelled recurring instance", async () => {
    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({
        iCalUID: "booking-1-uid@cal.com",
        status: "cancelled",
        start: new Date("2024-01-12T10:00:00Z"),
        originalStartDate: new Date("2024-01-12T10:00:00Z"),
        recurringEventId: "gcal-rec-id",
      }),
    ];

    mockBookingRepository.findByUid = vi
      .fn()
      .mockImplementation(({ bookingUid }: { bookingUid: string }) => {
        if (bookingUid === "booking-1-uid") return Promise.resolve(recurringBookings[0]);
        if (bookingUid === "booking-2-uid") return Promise.resolve(recurringBookings[1]);
        return Promise.resolve(null);
      });
    mockBookingRepository.findByRecurringEventIdAndStartTime = vi
      .fn()
      .mockResolvedValue({ id: 2, uid: "booking-2-uid" });

    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockHandleCancelBooking).toHaveBeenCalledTimes(1);
    expect(mockHandleCancelBooking).toHaveBeenCalledWith(
      expect.objectContaining({ bookingData: expect.objectContaining({ uid: "booking-2-uid" }) })
    );
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  test("should cancel all events in batch without rescheduling any", async () => {
    const bookingA = makeBooking({ id: 10, uid: "booking-a-uid", recurringEventId: undefined });
    const bookingB = makeBooking({ id: 11, uid: "booking-b-uid", recurringEventId: undefined });

    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({ iCalUID: "booking-a-uid@cal.com", status: "cancelled" }),
      makeEvent({ iCalUID: "booking-b-uid@cal.com", status: "cancelled" }),
    ];

    mockBookingRepository.findByUid = vi
      .fn()
      .mockImplementation(({ bookingUid }: { bookingUid: string }) => {
        if (bookingUid === "booking-a-uid") return Promise.resolve(bookingA);
        if (bookingUid === "booking-b-uid") return Promise.resolve(bookingB);
        return Promise.resolve(null);
      });

    await service.handleEvents(mockSelectedCalendar, events);

    expect(mockHandleCancelBooking).toHaveBeenCalledTimes(2);
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  test("should only cancel cancelled events and only reschedule non-cancelled events in mixed batch", async () => {
    const cancelBooking = makeBooking({ id: 10, uid: "cancel-uid", recurringEventId: undefined });
    const rescheduleBooking = makeBooking({
      id: 11,
      uid: "reschedule-uid",
      recurringEventId: undefined,
      startTime: new Date("2024-01-06T09:00:00Z"),
      endTime: new Date("2024-01-06T10:00:00Z"),
    });

    const events: CalendarSubscriptionEventItem[] = [
      makeEvent({ iCalUID: "cancel-uid@cal.com", status: "cancelled" }),
      makeEvent({
        iCalUID: "reschedule-uid@cal.com",
        start: new Date("2024-01-06T15:00:00Z"),
        end: new Date("2024-01-06T16:00:00Z"),
        status: "confirmed",
      }),
    ];

    mockBookingRepository.findByUid = vi
      .fn()
      .mockImplementation(({ bookingUid }: { bookingUid: string }) => {
        if (bookingUid === "cancel-uid") return Promise.resolve(cancelBooking);
        if (bookingUid === "reschedule-uid") return Promise.resolve(rescheduleBooking);
        return Promise.resolve(null);
      });

    await service.handleEvents(mockSelectedCalendar, events);

    // Cancelled event must be cancelled, NOT rescheduled
    expect(mockHandleCancelBooking).toHaveBeenCalledTimes(1);
    expect(mockHandleCancelBooking).toHaveBeenCalledWith(
      expect.objectContaining({ bookingData: expect.objectContaining({ uid: "cancel-uid" }) })
    );

    // Non-cancelled event must be rescheduled, NOT cancelled
    expect(mockCreateBooking).toHaveBeenCalledTimes(1);
    expect(mockCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingData: expect.objectContaining({ rescheduleUid: "reschedule-uid" }),
      })
    );
  });
});
