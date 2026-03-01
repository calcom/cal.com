import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/emails/email-manager", () => ({
  sendRescheduledSeatEmailAndSMS: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/features/bookings/lib/handleNewBooking/addVideoCallDataToEvent", () => ({
  addVideoCallDataToEvent: vi.fn((_refs, evt) => evt),
}));

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn().mockResolvedValue(vi.fn((key: string) => key)),
}));

vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    attendee: {
      delete: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
    bookingSeat: {
      update: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn((arr: unknown[]) => Promise.all(arr)),
  };
  return { default: mockPrisma };
});

vi.mock("../../../handleNewBooking/findBookingQuery", () => ({
  findBookingQuery: vi.fn().mockResolvedValue({
    uid: "new-booking-uid",
    title: "Test Meeting",
    startTime: new Date("2024-01-15T10:00:00Z"),
    endTime: new Date("2024-01-15T10:30:00Z"),
  }),
}));

vi.mock("../../lib/lastAttendeeDeleteBooking", () => ({
  default: vi.fn().mockResolvedValue(false),
}));

import attendeeRescheduleSeatedBooking from "./attendeeRescheduleSeatedBooking";

const makeRescheduleObject = (overrides = {}) => ({
  tAttendees: vi.fn((key: string) => key),
  bookingSeat: { id: 1, referenceUid: "seat-ref-1", attendee: { locale: "en" } },
  bookerEmail: "booker@test.com",
  evt: {
    title: "Test",
    startTime: "2024-01-16T10:00:00Z",
    endTime: "2024-01-16T10:30:00Z",
    attendees: [],
    organizer: { email: "host@test.com", name: "Host", timeZone: "UTC", language: { locale: "en" } },
    attendeeSeatId: undefined,
    uid: null,
  },
  eventType: { metadata: null },
  originalRescheduledBooking: {
    id: 1,
    uid: "orig-uid",
    attendees: [
      { id: 1, email: "booker@test.com", name: "Booker", timeZone: "UTC", locale: "en" },
      { id: 2, email: "other@test.com", name: "Other", timeZone: "UTC", locale: "en" },
    ],
    references: [],
  },
  ...overrides,
});

const makeSeatAttendee = () => ({
  id: 1,
  email: "booker@test.com",
  name: "Booker",
  timeZone: "UTC",
});

const makeEventManager = () => ({
  updateCalendarAttendees: vi.fn().mockResolvedValue(undefined),
  reschedule: vi.fn().mockResolvedValue({ results: [] }),
});

describe("attendeeRescheduleSeatedBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no newTimeSlotBooking exists", async () => {
    const result = await attendeeRescheduleSeatedBooking(
      makeRescheduleObject() as never,
      makeSeatAttendee() as never,
      null,
      { attendees: [] } as never,
      makeEventManager() as never
    );
    expect(result).toBeNull();
  });

  it("returns booking with seatReferenceUid when newTimeSlotBooking exists", async () => {
    const newTimeSlotBooking = {
      id: 2,
      uid: "new-uid",
      iCalUID: "ical-uid",
      attendees: [],
      references: [],
    };
    const result = await attendeeRescheduleSeatedBooking(
      makeRescheduleObject() as never,
      makeSeatAttendee() as never,
      newTimeSlotBooking as never,
      { attendees: [] } as never,
      makeEventManager() as never
    );
    expect(result).toHaveProperty("seatReferenceUid", "seat-ref-1");
  });

  it("sets attendeeSeatId on evt from bookingSeat referenceUid", async () => {
    const rescheduleObj = makeRescheduleObject();
    await attendeeRescheduleSeatedBooking(
      rescheduleObj as never,
      makeSeatAttendee() as never,
      null,
      { attendees: [] } as never,
      makeEventManager() as never
    );
    expect(rescheduleObj.evt.attendeeSeatId).toBe("seat-ref-1");
  });
});
