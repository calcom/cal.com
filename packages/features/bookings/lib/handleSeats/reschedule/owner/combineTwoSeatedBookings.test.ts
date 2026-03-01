import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/emails/email-manager", () => ({
  sendRescheduledEmailsAndSMS: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    attendee: {
      update: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    booking: {
      findUnique: vi.fn().mockResolvedValue({
        attendees: [{ name: "A1", email: "a1@test.com", locale: "en" }],
        references: [],
      }),
      update: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn((arr: unknown[]) => Promise.all(arr)),
  };
  return { default: mockPrisma };
});

vi.mock("../../../handleNewBooking/addVideoCallDataToEvent", () => ({
  addVideoCallDataToEvent: vi.fn((_refs, evt) => evt),
}));

vi.mock("../../../handleNewBooking/findBookingQuery", () => ({
  findBookingQuery: vi.fn().mockResolvedValue({ uid: "found-uid", title: "Found Booking" }),
}));

import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import combineTwoSeatedBookings from "./combineTwoSeatedBookings";

const makeRescheduleObject = (overrides = {}) => ({
  eventType: { seatsPerTimeSlot: 10, metadata: null, description: "Test" },
  tAttendees: vi.fn((key: string) => key),
  attendeeLanguage: "en",
  rescheduleUid: "reschedule-uid",
  noEmail: false,
  isConfirmedByDefault: true,
  additionalNotes: "some notes",
  rescheduleReason: "time change",
  evt: {
    title: "Test",
    startTime: "2024-01-16T10:00:00Z",
    endTime: "2024-01-16T10:30:00Z",
    attendees: [],
    organizer: { email: "host@test.com", name: "Host", timeZone: "UTC" },
    bookerUrl: "https://cal.com",
  },
  ...overrides,
});

const makeSeatedBooking = (attendees = [{ id: 1, email: "a1@test.com", bookingSeat: { id: 10 } }]) => ({
  id: 1,
  uid: "seated-uid",
  attendees,
});

const makeNewTimeSlotBooking = (attendees = [{ id: 2, email: "a2@test.com", bookingSeat: { id: 20 } }]) => ({
  id: 2,
  uid: "new-uid",
  attendees,
  references: [],
});

const makeEventManager = () => ({
  reschedule: vi.fn().mockResolvedValue({
    results: [{ type: "google_calendar", success: true, updatedEvent: { iCalUID: "ical-uid" } }],
  }),
});

const makeLogger = () => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
});

describe("combineTwoSeatedBookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws 409 when not enough seats available", async () => {
    const rescheduleObj = makeRescheduleObject({
      eventType: { seatsPerTimeSlot: 1, metadata: null, description: "Test" },
    });
    const seatedBooking = makeSeatedBooking([
      { id: 1, email: "new-attendee@test.com", bookingSeat: { id: 10 } },
    ]);
    const newTimeSlotBooking = makeNewTimeSlotBooking([
      { id: 2, email: "a2@test.com", bookingSeat: { id: 20 } },
    ]);

    await expect(
      combineTwoSeatedBookings(
        rescheduleObj as never,
        seatedBooking as never,
        newTimeSlotBooking as never,
        makeEventManager() as never,
        makeLogger() as never
      )
    ).rejects.toThrow(HttpError);
  });

  it("cancels the old booking after combining", async () => {
    await combineTwoSeatedBookings(
      makeRescheduleObject() as never,
      makeSeatedBooking() as never,
      makeNewTimeSlotBooking() as never,
      makeEventManager() as never,
      makeLogger() as never
    );

    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { status: "CANCELLED" },
      })
    );
  });

  it("returns the found booking object", async () => {
    const result = await combineTwoSeatedBookings(
      makeRescheduleObject() as never,
      makeSeatedBooking() as never,
      makeNewTimeSlotBooking() as never,
      makeEventManager() as never,
      makeLogger() as never
    );

    expect(result).toHaveProperty("uid", "found-uid");
  });
});
