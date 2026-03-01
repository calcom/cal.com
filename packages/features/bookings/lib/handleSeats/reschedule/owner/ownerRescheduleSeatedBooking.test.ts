import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./combineTwoSeatedBookings", () => ({
  default: vi.fn().mockResolvedValue({ uid: "combined-uid", title: "Combined" }),
}));

vi.mock("./moveSeatedBookingToNewTimeSlot", () => ({
  default: vi.fn().mockResolvedValue({ uid: "moved-uid", title: "Moved" }),
}));

import combineTwoSeatedBookings from "./combineTwoSeatedBookings";
import moveSeatedBookingToNewTimeSlot from "./moveSeatedBookingToNewTimeSlot";
import ownerRescheduleSeatedBooking from "./ownerRescheduleSeatedBooking";

const makeRescheduleObject = (overrides = {}) => ({
  originalRescheduledBooking: {
    attendees: [
      { name: "A1", email: "a1@test.com", timeZone: "UTC", locale: "en" },
      { name: "A2", email: "a2@test.com", timeZone: "UTC", locale: "en" },
    ],
  },
  tAttendees: vi.fn((key: string) => key),
  evt: {
    title: "Test",
    startTime: "2024-01-16T10:00:00Z",
    endTime: "2024-01-16T10:30:00Z",
    attendees: [],
    organizer: { email: "host@test.com", name: "Host", timeZone: "UTC" },
  },
  ...overrides,
});

const makeSeatedBooking = () => ({
  id: 1,
  uid: "seated-uid",
  attendees: [],
});

const makeEventManager = () => ({
  reschedule: vi.fn().mockResolvedValue({ results: [] }),
  updateCalendarAttendees: vi.fn().mockResolvedValue(undefined),
});

const makeLogger = () => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
});

describe("ownerRescheduleSeatedBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls moveSeatedBookingToNewTimeSlot when no newTimeSlotBooking", async () => {
    const result = await ownerRescheduleSeatedBooking(
      makeRescheduleObject() as never,
      null,
      makeSeatedBooking() as never,
      null,
      makeEventManager() as never,
      makeLogger() as never
    );
    expect(moveSeatedBookingToNewTimeSlot).toHaveBeenCalled();
    expect(result).toEqual({ uid: "moved-uid", title: "Moved" });
  });

  it("calls combineTwoSeatedBookings when newTimeSlotBooking exists", async () => {
    const newTimeSlotBooking = { id: 2, uid: "new-uid", attendees: [], references: [] };
    const result = await ownerRescheduleSeatedBooking(
      makeRescheduleObject() as never,
      newTimeSlotBooking as never,
      makeSeatedBooking() as never,
      null,
      makeEventManager() as never,
      makeLogger() as never
    );
    expect(combineTwoSeatedBookings).toHaveBeenCalled();
    expect(result).toEqual({ uid: "combined-uid", title: "Combined" });
  });

  it("maps original attendees to evt.attendees with language", async () => {
    const rescheduleObj = makeRescheduleObject();
    await ownerRescheduleSeatedBooking(
      rescheduleObj as never,
      null,
      makeSeatedBooking() as never,
      null,
      makeEventManager() as never,
      makeLogger() as never
    );
    expect(rescheduleObj.evt.attendees).toHaveLength(2);
    expect(rescheduleObj.evt.attendees[0]).toHaveProperty("language");
  });

  it("handles empty attendees on original booking", async () => {
    const rescheduleObj = makeRescheduleObject({
      originalRescheduledBooking: { attendees: [] },
    });
    await ownerRescheduleSeatedBooking(
      rescheduleObj as never,
      null,
      makeSeatedBooking() as never,
      null,
      makeEventManager() as never,
      makeLogger() as never
    );
    expect(rescheduleObj.evt.attendees).toHaveLength(0);
  });
});
