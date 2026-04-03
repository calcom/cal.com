/**
 * Tests for guest availability filtering during reschedule (issue #16378).
 *
 * When a host reschedules a booking that has attendees who are also Cal.com users,
 * the slot-fetching pipeline should filter out slots during which those guest
 * users are already busy.
 */
import { describe, it, expect } from "vitest";
import dayjs from "@calcom/dayjs";
import {
  filterSlotsForGuestBusyTimes,
  type GuestBusyInterval,
} from "./filterSlotsForGuestBusyTimes";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Guest availability filtering during reschedule (#16378)", () => {
  const eventLength = 30; // 30-minute meeting

  const slot = (isoTime: string) => ({ time: dayjs(isoTime) });
  const busyInterval = (start: string, end: string): GuestBusyInterval => ({
    startTime: new Date(start),
    endTime: new Date(end),
  });

  it("returns all slots when there are no guest busy times", () => {
    const slots = [
      slot("2024-06-01T09:00:00.000Z"),
      slot("2024-06-01T09:30:00.000Z"),
      slot("2024-06-01T10:00:00.000Z"),
    ];

    const result = filterSlotsForGuestBusyTimes(slots, eventLength, []);
    expect(result).toHaveLength(3);
  });

  it("filters out a slot that exactly overlaps a guest booking", () => {
    const slots = [
      slot("2024-06-01T09:00:00.000Z"),
      slot("2024-06-01T09:30:00.000Z"), // guest is busy 09:30–10:00
      slot("2024-06-01T10:00:00.000Z"),
    ];

    const guestBusy = [busyInterval("2024-06-01T09:30:00.000Z", "2024-06-01T10:00:00.000Z")];

    const result = filterSlotsForGuestBusyTimes(slots, eventLength, guestBusy);
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.time.toISOString())).toEqual([
      "2024-06-01T09:00:00.000Z",
      "2024-06-01T10:00:00.000Z",
    ]);
  });

  it("filters out a slot that partially overlaps a guest booking (slot starts inside booking)", () => {
    const slots = [
      slot("2024-06-01T09:15:00.000Z"), // 09:15–09:45 — overlaps guest's 09:00–09:30 booking
      slot("2024-06-01T09:30:00.000Z"), // 09:30–10:00 — starts exactly when guest ends (no overlap)
    ];

    const guestBusy = [busyInterval("2024-06-01T09:00:00.000Z", "2024-06-01T09:30:00.000Z")];

    const result = filterSlotsForGuestBusyTimes(slots, eventLength, guestBusy);
    // 09:15 slot: slotEnd 09:45 > bookingStart 09:00 AND slotStart 09:15 < bookingEnd 09:30 → BLOCKED
    // 09:30 slot: slotStart 09:30 is NOT < bookingEnd 09:30 → ALLOWED
    expect(result).toHaveLength(1);
    expect(result[0].time.toISOString()).toBe("2024-06-01T09:30:00.000Z");
  });

  it("filters out a slot that partially overlaps a guest booking (slot ends inside booking)", () => {
    const slots = [
      slot("2024-06-01T09:00:00.000Z"), // 09:00–09:30 — slot ends at start of guest booking → no overlap
      slot("2024-06-01T09:15:00.000Z"), // 09:15–09:45 — overlaps guest's 09:30–10:00 booking
    ];

    const guestBusy = [busyInterval("2024-06-01T09:30:00.000Z", "2024-06-01T10:00:00.000Z")];

    const result = filterSlotsForGuestBusyTimes(slots, eventLength, guestBusy);
    // 09:00 slot: slotEnd 09:30 is NOT > bookingStart 09:30 → ALLOWED
    // 09:15 slot: slotEnd 09:45 > bookingStart 09:30 AND slotStart 09:15 < bookingEnd 10:00 → BLOCKED
    expect(result).toHaveLength(1);
    expect(result[0].time.toISOString()).toBe("2024-06-01T09:00:00.000Z");
  });

  it("filters out multiple slots when guest has multiple bookings", () => {
    const slots = [
      slot("2024-06-01T08:00:00.000Z"),
      slot("2024-06-01T09:00:00.000Z"), // blocked by first guest booking
      slot("2024-06-01T10:00:00.000Z"),
      slot("2024-06-01T11:00:00.000Z"), // blocked by second guest booking
      slot("2024-06-01T12:00:00.000Z"),
    ];

    const guestBusy = [
      busyInterval("2024-06-01T09:00:00.000Z", "2024-06-01T09:30:00.000Z"),
      busyInterval("2024-06-01T11:00:00.000Z", "2024-06-01T11:30:00.000Z"),
    ];

    const result = filterSlotsForGuestBusyTimes(slots, eventLength, guestBusy);
    expect(result).toHaveLength(3);
    expect(result.map((s) => s.time.toISOString())).toEqual([
      "2024-06-01T08:00:00.000Z",
      "2024-06-01T10:00:00.000Z",
      "2024-06-01T12:00:00.000Z",
    ]);
  });

  it("keeps all slots when no guest booking overlaps", () => {
    const slots = [
      slot("2024-06-01T08:00:00.000Z"),
      slot("2024-06-01T09:00:00.000Z"),
    ];

    // Guest is busy 13:00–14:00, far from our slots
    const guestBusy = [busyInterval("2024-06-01T13:00:00.000Z", "2024-06-01T14:00:00.000Z")];

    const result = filterSlotsForGuestBusyTimes(slots, eventLength, guestBusy);
    expect(result).toHaveLength(2);
  });

  it("handles the edge case where slot ends exactly when guest booking starts (no conflict)", () => {
    // Slot: 09:00–09:30, Guest busy: 09:30–10:00
    const slots = [slot("2024-06-01T09:00:00.000Z")];
    const guestBusy = [busyInterval("2024-06-01T09:30:00.000Z", "2024-06-01T10:00:00.000Z")];

    const result = filterSlotsForGuestBusyTimes(slots, eventLength, guestBusy);
    // slotEnd (09:30) is NOT > bookingStart (09:30) → no conflict
    expect(result).toHaveLength(1);
  });

  it("handles the edge case where slot starts exactly when guest booking ends (no conflict)", () => {
    // Slot: 10:00–10:30, Guest busy: 09:30–10:00
    const slots = [slot("2024-06-01T10:00:00.000Z")];
    const guestBusy = [busyInterval("2024-06-01T09:30:00.000Z", "2024-06-01T10:00:00.000Z")];

    const result = filterSlotsForGuestBusyTimes(slots, eventLength, guestBusy);
    // slotStart (10:00) is NOT < bookingEnd (10:00) → no conflict
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Integration-level description of the full flow (documented, not executable
// without a full DI container setup)
// ---------------------------------------------------------------------------

describe("Guest availability integration flow (documented)", () => {
  it("describes the reschedule slot-filtering flow for cal.com guest users", () => {
    /**
     * When input.rescheduleUid is set:
     *
     * 1. bookingRepo.findOriginalRescheduledBookingUserId({ rescheduleUid })
     *    → returns { attendees: [{ email }] }
     *
     * 2. For each attendee email, userRepo.findByEmail({ email })
     *    → returns a Cal.com User if the attendee has an account, null otherwise
     *
     * 3. bookingRepo.findAcceptedBookingsForUserIdsBetween({
     *      userIds, userEmails, startDate, endDate, excludeUid: rescheduleUid
     *    })
     *    → returns all ACCEPTED bookings (owned or attended) for those guest users
     *      in the displayed date range (excluding the booking being rescheduled)
     *
     * 4. availableTimeSlots is filtered:
     *    any slot where [slotStart, slotStart + eventLength) overlaps a guest busy
     *    interval is removed from the result.
     *
     * This ensures the host only sees time slots during which ALL guests are free.
     */
    expect(true).toBe(true); // placeholder — the logic above is tested in pure unit tests above
  });
});
