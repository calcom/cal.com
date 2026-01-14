import {
  createBookingScenario,
  TestData,
  Timezones,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";

import { describe, vi, it, expect, beforeEach, afterEach } from "vitest";

import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";
import { BookingStatus } from "@calcom/prisma/enums";

vi.mock("@calcom/lib/constants", () => ({
  IS_PRODUCTION: true,
  WEBAPP_URL: "http://localhost:3000",
  RESERVED_SUBDOMAINS: ["auth", "docs"],
  SINGLE_ORG_SLUG: "",
}));

describe("Guest Availability Integration Tests", () => {
  const availableSlotsService = getAvailableSlotsService();

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should exclude timeslots when guest Cal.com user is busy during reschedule", async () => {
    vi.setSystemTime("2024-05-21T00:00:13Z");

    const plus1DateString = "2024-05-22";
    const plus2DateString = "2024-05-23";

    await createBookingScenario({
      eventTypes: [
        {
          id: 1,
          slotInterval: 60,
          length: 60,
          hosts: [
            {
              userId: 101,
              isFixed: true,
            },
          ],
        },
      ],
      users: [
        {
          ...TestData.users.example,
          email: "host@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          defaultScheduleId: 1,
        },
        {
          ...TestData.users.example,
          email: "guest@example.com",
          id: 102,
          schedules: [TestData.schedules.IstWorkHours],
          defaultScheduleId: 2,
        },
      ],
      bookings: [
        {
          uid: "BOOKING_TO_RESCHEDULE_UID",
          userId: 101,
          attendees: [
            {
              email: "guest@example.com",
            },
          ],
          eventTypeId: 1,
          status: BookingStatus.ACCEPTED,
          startTime: `${plus1DateString}T04:30:00.000Z`,
          endTime: `${plus1DateString}T05:30:00.000Z`,
        },
        {
          uid: "GUEST_BUSY_BOOKING_UID",
          userId: 102,
          attendees: [
            {
              email: "someone-else@example.com",
            },
          ],
          eventTypeId: 1,
          status: BookingStatus.ACCEPTED,
          // Guest has another booking at 05:30-06:30 (overlaps with 05:30 slot)
          startTime: `${plus2DateString}T05:30:00.000Z`,
          endTime: `${plus2DateString}T06:30:00.000Z`,
        },
      ],
    });

    const schedule = await availableSlotsService.getAvailableSlots({
      input: {
        eventTypeId: 1,
        eventTypeSlug: "",
        startTime: `${plus2DateString}T03:30:00.000Z`,
        endTime: `${plus2DateString}T12:29:59.999Z`,
        timeZone: Timezones["+5:30"],
        isTeamEvent: false,
        rescheduleUid: "BOOKING_TO_RESCHEDULE_UID",
      },
    });

    // With startTime at T03:30, slots are at :30 past the hour (04:30, 05:30, 06:30, etc.)
    const slots = schedule.slots[plus2DateString] || [];
    const slotTimes = slots.map((slot) => slot.time);

    // Guest is busy at 05:30-06:30, so 05:30 slot should be excluded
    expect(slotTimes).not.toContain(`${plus2DateString}T05:30:00.000Z`);
    // Other slots should still be available
    expect(slotTimes).toContain(`${plus2DateString}T04:30:00.000Z`);
    expect(slotTimes).toContain(`${plus2DateString}T06:30:00.000Z`);
  });

  it("should include all timeslots when guest is NOT a Cal.com user during reschedule", async () => {
    vi.setSystemTime("2024-05-21T00:00:13Z");

    const plus1DateString = "2024-05-22";
    const plus2DateString = "2024-05-23";

    await createBookingScenario({
      eventTypes: [
        {
          id: 1,
          slotInterval: 60,
          length: 60,
          hosts: [
            {
              userId: 101,
              isFixed: true,
            },
          ],
        },
      ],
      users: [
        {
          ...TestData.users.example,
          email: "host@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          defaultScheduleId: 1,
        },
        // Note: No user with email "external-guest@example.com" - they're not a Cal.com user
      ],
      bookings: [
        {
          uid: "BOOKING_TO_RESCHEDULE_UID",
          userId: 101,
          attendees: [
            {
              email: "external-guest@example.com", // NOT a Cal.com user
            },
          ],
          eventTypeId: 1,
          status: BookingStatus.ACCEPTED,
          startTime: `${plus1DateString}T04:30:00.000Z`,
          endTime: `${plus1DateString}T05:30:00.000Z`,
        },
      ],
    });

    const schedule = await availableSlotsService.getAvailableSlots({
      input: {
        eventTypeId: 1,
        eventTypeSlug: "",
        startTime: `${plus2DateString}T03:30:00.000Z`,
        endTime: `${plus2DateString}T12:29:59.999Z`,
        timeZone: Timezones["+5:30"],
        isTeamEvent: false,
        rescheduleUid: "BOOKING_TO_RESCHEDULE_UID",
      },
    });

    // Since guest is not a Cal.com user, all host's available slots should be returned
    // Expected slots for IstWorkHours with 1hr interval: 04:30, 05:30, 06:30, 07:30, 08:30, 09:30, 10:30, 11:30
    const slots = schedule.slots[plus2DateString] || [];
    const slotTimes = slots.map((slot) => slot.time);
    expect(slotTimes).toContain(`${plus2DateString}T04:30:00.000Z`);
    expect(slotTimes).toContain(`${plus2DateString}T05:30:00.000Z`);
    expect(slotTimes).toContain(`${plus2DateString}T06:30:00.000Z`);
    expect(slots.length).toBe(8); // All 8 slots should be available
  });

  it("should NOT exclude current booking slot when rescheduling (same slot should be available)", async () => {
    vi.setSystemTime("2024-05-21T00:00:13Z");

    const plus1DateString = "2024-05-22";

    await createBookingScenario({
      eventTypes: [
        {
          id: 1,
          slotInterval: 60,
          length: 60,
          hosts: [
            {
              userId: 101,
              isFixed: true,
            },
          ],
        },
      ],
      users: [
        {
          ...TestData.users.example,
          email: "host@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          defaultScheduleId: 1,
        },
        {
          ...TestData.users.example,
          email: "guest@example.com",
          id: 102,
          schedules: [TestData.schedules.IstWorkHours],
          defaultScheduleId: 2,
        },
      ],
      bookings: [
        {
          uid: "BOOKING_TO_RESCHEDULE_UID",
          userId: 101,
          attendees: [
            {
              email: "guest@example.com",
            },
          ],
          eventTypeId: 1,
          status: BookingStatus.ACCEPTED,
          // Current booking at 05:30-06:30 (a valid slot time)
          startTime: `${plus1DateString}T05:30:00.000Z`,
          endTime: `${plus1DateString}T06:30:00.000Z`,
        },
      ],
    });

    const schedule = await availableSlotsService.getAvailableSlots({
      input: {
        eventTypeId: 1,
        eventTypeSlug: "",
        startTime: `${plus1DateString}T03:30:00.000Z`,
        endTime: `${plus1DateString}T12:29:59.999Z`,
        timeZone: Timezones["+5:30"],
        isTeamEvent: false,
        rescheduleUid: "BOOKING_TO_RESCHEDULE_UID",
      },
    });

    // The slot at 05:30 is the current booking - it SHOULD be available for rescheduling
    // because we exclude the booking being rescheduled from busy times (both host and guest)
    const slots = schedule.slots[plus1DateString] || [];
    const slotTimes = slots.map((slot) => slot.time);

    // The current booking slot should still be available
    expect(slotTimes).toContain(`${plus1DateString}T05:30:00.000Z`);
    // All other slots should also be available
    expect(slotTimes).toContain(`${plus1DateString}T04:30:00.000Z`);
    expect(slotTimes).toContain(`${plus1DateString}T06:30:00.000Z`);
  });
});
