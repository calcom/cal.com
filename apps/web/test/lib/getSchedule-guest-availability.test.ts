import CalendarManagerMock from "../../../../tests/libs/__mocks__/CalendarManager";

import {
  getDate,
  getGoogleCalendarCredential,
  createBookingScenario,
  createOrganization,
  getOrganizer,
  getScenarioData,
  Timezones,
  TestData,
  createCredentials,
  mockCrmApp,
} from "../utils/bookingScenario/bookingScenario";

import { describe, vi, test, beforeEach } from "vitest";

import dayjs from "@calcom/dayjs";
import { getAvailableSlotsService } from "@calcom/lib/di/containers/available-slots";
import { SchedulingType, BookingStatus } from "@calcom/prisma/enums";

import { expect, expectedSlotsForSchedule } from "./getSchedule/expects";
import { setupAndTeardown } from "./getSchedule/setupAndTeardown";
import { timeTravelToTheBeginningOfToday } from "./getSchedule/utils";

vi.mock("@calcom/lib/constants", () => ({
  IS_PRODUCTION: true,
  WEBAPP_URL: "http://localhost:3000",
  RESERVED_SUBDOMAINS: ["auth", "docs"],
  SINGLE_ORG_SLUG: "",
}));

describe("getSchedule - Guest Availability Feature", () => {
  const availableSlotsService = getAvailableSlotsService();
  setupAndTeardown();

  // eslint-disable-next-line playwright/expect-expect
  test("Reschedule: should exclude timeslots when guest Cal.com user is busy", async () => {
    vi.setSystemTime("2024-05-21T00:00:13Z");

    const plus1DateString = "2024-05-22";
    const plus2DateString = "2024-05-23";

    // Create a scenario with a host user and a guest user who is also a Cal.com user
    await createBookingScenario({
      eventTypes: [
        {
          id: 1,
          slotInterval: 60,
          length: 60,
          offsetStart: 30,
          hosts: [
            {
              userId: 101, // Host user
              isFixed: false,
            },
          ],
          schedulingType: "ROUND_ROBIN",
        },
      ],
      users: [
        {
          ...TestData.users.example,
          email: "host@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours], // 9 AM - 6 PM IST
          defaultScheduleId: 1,
        },
        {
          ...TestData.users.example,
          email: "guest@example.com",
          id: 102,
          schedules: [TestData.schedules.IstWorkHours], // 9 AM - 6 PM IST
          defaultScheduleId: 2,
        },
      ],
      bookings: [
        // Original booking that will be rescheduled
        {
          uid: "BOOKING_TO_RESCHEDULE_UID",
          userId: 101, // Host user
          attendees: [
            {
              email: "guest@example.com", // Guest is a Cal.com user
            },
          ],
          eventTypeId: 1,
          status: "ACCEPTED",
          startTime: `${plus1DateString}T04:00:00.000Z`, // 9:30 AM IST
          endTime: `${plus1DateString}T05:00:00.000Z`, // 10:30 AM IST
        },
        // Guest user has another booking that should make them unavailable
        {
          uid: "GUEST_BUSY_BOOKING_UID",
          userId: 102, // Guest user
          attendees: [
            {
              email: "someone-else@example.com",
            },
          ],
          eventTypeId: 1,
          status: "ACCEPTED",
          startTime: `${plus2DateString}T05:00:00.000Z`, // 10:30 AM IST
          endTime: `${plus2DateString}T06:00:00.000Z`, // 11:30 AM IST
        },
      ],
    });

    const schedule = await availableSlotsService.getAvailableSlots({
      input: {
        eventTypeId: 1,
        eventTypeSlug: "",
        startTime: `${plus2DateString}T03:30:00.000Z`, // 9:00 AM IST
        endTime: `${plus2DateString}T12:29:59.999Z`, // 6:00 PM IST
        timeZone: Timezones["+5:30"],
        isTeamEvent: false,
        rescheduleUid: "BOOKING_TO_RESCHEDULE_UID",
      },
    });

    // The slot at 10:30 AM IST (05:00:00.000Z) should be excluded 
    // because the guest user is busy at that time
    expect(schedule).toHaveTimeSlots(
      [
        // `05:00:00.000Z`, // 10:30 AM IST - Should be excluded (guest busy)
        `07:00:00.000Z`, // 12:30 PM IST - Available
        `08:30:00.000Z`, // 2:00 PM IST - Available
        `10:00:00.000Z`, // 3:30 PM IST - Available
        `11:30:00.000Z`, // 5:00 PM IST - Available
      ],
      {
        dateString: plus2DateString,
      }
    );
  });

  // eslint-disable-next-line playwright/expect-expect
  test("Reschedule: should include all timeslots when guest is not a Cal.com user", async () => {
    vi.setSystemTime("2024-05-21T00:00:13Z");

    const plus1DateString = "2024-05-22";
    const plus2DateString = "2024-05-23";

    // Create a scenario with a host user and a guest user who is NOT a Cal.com user
    await createBookingScenario({
      eventTypes: [
        {
          id: 1,
          slotInterval: 60,
          length: 60,
          offsetStart: 30,
          hosts: [
            {
              userId: 101, // Host user
              isFixed: false,
            },
          ],
          schedulingType: "ROUND_ROBIN",
        },
      ],
      users: [
        {
          ...TestData.users.example,
          email: "host@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours], // 9 AM - 6 PM IST
          defaultScheduleId: 1,
        },
        // Note: No user with email "external-guest@example.com" - they're not a Cal.com user
      ],
      bookings: [
        // Original booking that will be rescheduled
        {
          uid: "BOOKING_TO_RESCHEDULE_UID",
          userId: 101, // Host user
          attendees: [
            {
              email: "external-guest@example.com", // Guest is NOT a Cal.com user
            },
          ],
          eventTypeId: 1,
          status: "ACCEPTED",
          startTime: `${plus1DateString}T04:00:00.000Z`, // 9:30 AM IST
          endTime: `${plus1DateString}T05:00:00.000Z`, // 10:30 AM IST
        },
      ],
    });

    const schedule = await availableSlotsService.getAvailableSlots({
      input: {
        eventTypeId: 1,
        eventTypeSlug: "",
        startTime: `${plus2DateString}T03:30:00.000Z`, // 9:00 AM IST
        endTime: `${plus2DateString}T12:29:59.999Z`, // 6:00 PM IST
        timeZone: Timezones["+5:30"],
        isTeamEvent: false,
        rescheduleUid: "BOOKING_TO_RESCHEDULE_UID",
      },
    });

    // All slots should be available since the guest is not a Cal.com user
    // and we don't check their availability
    // With offsetStart: 30, slots should be at :00 and :30 minutes
    expect(schedule).toHaveTimeSlots(
      [
        `05:00:00.000Z`, // 10:30 AM IST - Available (guest not checked)
        `06:30:00.000Z`, // 12:00 PM IST - Available
        `08:00:00.000Z`, // 1:30 PM IST - Available
        `09:30:00.000Z`, // 3:00 PM IST - Available
        `11:00:00.000Z`, // 4:30 PM IST - Available
      ],
      {
        dateString: plus2DateString,
      }
    );
  });

  // eslint-disable-next-line playwright/expect-expect
  test("Reschedule: should handle multiple Cal.com guest users correctly", async () => {
    vi.setSystemTime("2024-05-21T00:00:13Z");

    const plus1DateString = "2024-05-22";
    const plus2DateString = "2024-05-23";

    // Create a scenario with a host user and multiple guest users who are Cal.com users
    await createBookingScenario({
      eventTypes: [
        {
          id: 1,
          slotInterval: 60,
          length: 60,
          offsetStart: 30,
          hosts: [
            {
              userId: 101, // Host user
              isFixed: false,
            },
          ],
          schedulingType: "ROUND_ROBIN",
        },
      ],
      users: [
        {
          ...TestData.users.example,
          email: "host@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours], // 9 AM - 6 PM IST
          defaultScheduleId: 1,
        },
        {
          ...TestData.users.example,
          email: "guest1@example.com",
          id: 102,
          schedules: [TestData.schedules.IstWorkHours], // 9 AM - 6 PM IST
          defaultScheduleId: 2,
        },
        {
          ...TestData.users.example,
          email: "guest2@example.com",
          id: 103,
          schedules: [TestData.schedules.IstWorkHours], // 9 AM - 6 PM IST
          defaultScheduleId: 3,
        },
      ],
      bookings: [
        // Original booking that will be rescheduled
        {
          uid: "BOOKING_TO_RESCHEDULE_UID",
          userId: 101, // Host user
          attendees: [
            {
              email: "guest1@example.com", // Guest 1 is a Cal.com user
            },
            {
              email: "guest2@example.com", // Guest 2 is a Cal.com user
            },
          ],
          eventTypeId: 1,
          status: "ACCEPTED",
          startTime: `${plus1DateString}T04:00:00.000Z`, // 9:30 AM IST
          endTime: `${plus1DateString}T05:00:00.000Z`, // 10:30 AM IST
        },
        // Guest 1 has another booking
        {
          uid: "GUEST1_BUSY_BOOKING_UID",
          userId: 102, // Guest 1 user
          attendees: [
            {
              email: "someone-else@example.com",
            },
          ],
          eventTypeId: 1,
          status: "ACCEPTED",
          startTime: `${plus2DateString}T05:00:00.000Z`, // 10:30 AM IST
          endTime: `${plus2DateString}T06:00:00.000Z`, // 11:30 AM IST
        },
        // Guest 2 has another booking at a different time
        {
          uid: "GUEST2_BUSY_BOOKING_UID",
          userId: 103, // Guest 2 user
          attendees: [
            {
              email: "someone-else@example.com",
            },
          ],
          eventTypeId: 1,
          status: "ACCEPTED",
          startTime: `${plus2DateString}T07:00:00.000Z`, // 12:30 PM IST
          endTime: `${plus2DateString}T08:00:00.000Z`, // 1:30 PM IST
        },
      ],
    });

    const schedule = await availableSlotsService.getAvailableSlots({
      input: {
        eventTypeId: 1,
        eventTypeSlug: "",
        startTime: `${plus2DateString}T03:30:00.000Z`, // 9:00 AM IST
        endTime: `${plus2DateString}T12:29:59.999Z`, // 6:00 PM IST
        timeZone: Timezones["+5:30"],
        isTeamEvent: false,
        rescheduleUid: "BOOKING_TO_RESCHEDULE_UID",
      },
    });

    // Both 10:30 AM IST and 1:30 PM IST should be excluded
    // because guest1 and guest2 are busy at those times respectively
    // Guest1 busy: 10:30-11:30 AM IST (05:00-06:00 GMT) - excludes 05:00:00.000Z
    // Guest2 busy: 12:30-1:30 PM IST (07:00-08:00 GMT) - excludes 08:00:00.000Z  
    expect(schedule).toHaveTimeSlots(
      [
        // `05:00:00.000Z`, // 10:30 AM IST - Should be excluded (guest1 busy)
        // `07:00:00.000Z`, // 12:30 PM IST - Should be excluded (guest2 busy)
        `09:00:00.000Z`, // 2:30 PM IST - Available
        `10:30:00.000Z`, // 4:00 PM IST - Available
      ],
      {
        dateString: plus2DateString,
      }
    );
  });

  // eslint-disable-next-line playwright/expect-expect
  test("Reschedule: should not check guest availability for collective events", async () => {
    vi.setSystemTime("2024-05-21T00:00:13Z");

    const plus1DateString = "2024-05-22";
    const plus2DateString = "2024-05-23";

    // Create a scenario with COLLECTIVE scheduling type
    await createBookingScenario({
      eventTypes: [
        {
          id: 1,
          slotInterval: 60,
          length: 60,
          offsetStart: 30,
          hosts: [
            {
              userId: 101, // Host user
              isFixed: false,
            },
          ],
          schedulingType: "COLLECTIVE", // This should bypass guest availability check
        },
      ],
      users: [
        {
          ...TestData.users.example,
          email: "host@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours], // 9 AM - 6 PM IST
          defaultScheduleId: 1,
        },
        {
          ...TestData.users.example,
          email: "guest@example.com",
          id: 102,
          schedules: [TestData.schedules.IstWorkHours], // 9 AM - 6 PM IST
          defaultScheduleId: 2,
        },
      ],
      bookings: [
        // Original booking that will be rescheduled
        {
          uid: "BOOKING_TO_RESCHEDULE_UID",
          userId: 101, // Host user
          attendees: [
            {
              email: "guest@example.com", // Guest is a Cal.com user
            },
          ],
          eventTypeId: 1,
          status: "ACCEPTED",
          startTime: `${plus1DateString}T04:00:00.000Z`, // 9:30 AM IST
          endTime: `${plus1DateString}T05:00:00.000Z`, // 10:30 AM IST
        },
        // Guest user has another booking that would normally make them unavailable
        {
          uid: "GUEST_BUSY_BOOKING_UID",
          userId: 102, // Guest user
          attendees: [
            {
              email: "someone-else@example.com",
            },
          ],
          eventTypeId: 1,
          status: "ACCEPTED",
          startTime: `${plus2DateString}T05:00:00.000Z`, // 10:30 AM IST
          endTime: `${plus2DateString}T06:00:00.000Z`, // 11:30 AM IST
        },
      ],
    });

    const schedule = await availableSlotsService.getAvailableSlots({
      input: {
        eventTypeId: 1,
        eventTypeSlug: "",
        startTime: `${plus2DateString}T03:30:00.000Z`, // 9:00 AM IST
        endTime: `${plus2DateString}T12:29:59.999Z`, // 6:00 PM IST
        timeZone: Timezones["+5:30"],
        isTeamEvent: false,
        rescheduleUid: "BOOKING_TO_RESCHEDULE_UID",
      },
    });

    // All slots should be available since we don't check guest availability for collective events
    // With offsetStart: 30, slots should be at :00 and :30 minutes
    expect(schedule).toHaveTimeSlots(
      [
        `05:00:00.000Z`, // 10:30 AM IST - Available (guest check bypassed)
        `06:30:00.000Z`, // 12:00 PM IST - Available
        `08:00:00.000Z`, // 1:30 PM IST - Available
        `09:30:00.000Z`, // 3:00 PM IST - Available
        `11:00:00.000Z`, // 4:30 PM IST - Available
      ],
      {
        dateString: plus2DateString,
      }
    );
  });
});