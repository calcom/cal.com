import CalendarManagerMock from "../../../../tests/libs/__mocks__/CalendarManager";
import prismock from "../../../../tests/libs/__mocks__/prisma";

import { diff } from "jest-diff";
import { describe, expect, vi, beforeEach, afterEach, test } from "vitest";

import dayjs from "@calcom/dayjs";
import type { BookingStatus } from "@calcom/prisma/enums";
import type { Slot } from "@calcom/trpc/server/routers/viewer/slots/types";
import { getAvailableSlots as getSchedule } from "@calcom/trpc/server/routers/viewer/slots/util";

import {
  getDate,
  getGoogleCalendarCredential,
  createBookingScenario,
  createOrganization,
  getOrganizer,
  getScenarioData,
} from "../utils/bookingScenario/bookingScenario";

vi.mock("@calcom/lib/constants", () => ({
  IS_PRODUCTION: true,
  WEBAPP_URL: "http://localhost:3000",
  RESERVED_SUBDOMAINS: ["auth", "docs"],
}));

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveTimeSlots(expectedSlots: string[], date: { dateString: string }): R;
    }
  }
}

expect.extend({
  toHaveTimeSlots(
    schedule: { slots: Record<string, Slot[]> },
    expectedSlots: string[],
    { dateString }: { dateString: string }
  ) {
    if (!schedule.slots[`${dateString}`]) {
      return {
        pass: false,
        message: () => `has no timeslots for ${dateString}`,
      };
    }
    if (
      !schedule.slots[`${dateString}`]
        .map((slot) => slot.time)
        .every((actualSlotTime, index) => {
          return `${dateString}T${expectedSlots[index]}` === actualSlotTime;
        })
    ) {
      return {
        pass: false,
        message: () =>
          `has incorrect timeslots for ${dateString}.\n\r ${diff(
            expectedSlots.map((expectedSlot) => `${dateString}T${expectedSlot}`),
            schedule.slots[`${dateString}`].map((slot) => slot.time)
          )}`,
      };
    }
    return {
      pass: true,
      message: () => "has correct timeslots ",
    };
  },
});

const Timezones = {
  "+5:30": "Asia/Kolkata",
  "+6:00": "Asia/Dhaka",
};

const TestData = {
  selectedCalendars: {
    google: {
      integration: "google_calendar",
      externalId: "john@example.com",
    },
  },
  credentials: {
    google: getGoogleCalendarCredential(),
  },
  schedules: {
    IstWorkHours: {
      id: 1,
      name: "9:30AM to 6PM in India - 4:00AM to 12:30PM in GMT",
      availability: [
        {
          userId: null,
          eventTypeId: null,
          days: [0, 1, 2, 3, 4, 5, 6],
          startTime: new Date("1970-01-01T09:30:00.000Z"),
          endTime: new Date("1970-01-01T18:00:00.000Z"),
          date: null,
        },
      ],
      timeZone: Timezones["+5:30"],
    },
    IstWorkHoursWithDateOverride: (dateString: string) => ({
      id: 1,
      name: "9:30AM to 6PM in India - 4:00AM to 12:30PM in GMT but with a Date Override for 2PM to 6PM IST(in GST time it is 8:30AM to 12:30PM)",
      availability: [
        {
          userId: null,
          eventTypeId: null,
          days: [0, 1, 2, 3, 4, 5, 6],
          startTime: new Date("1970-01-01T09:30:00.000Z"),
          endTime: new Date("1970-01-01T18:00:00.000Z"),
          date: null,
        },
        {
          userId: null,
          eventTypeId: null,
          days: [0, 1, 2, 3, 4, 5, 6],
          startTime: new Date("1970-01-01T14:00:00.000Z"),
          endTime: new Date("1970-01-01T18:00:00.000Z"),
          date: dateString,
        },
      ],
      timeZone: Timezones["+5:30"],
    }),
  },
  users: {
    example: {
      name: "Example",
      username: "example",
      defaultScheduleId: 1,
      email: "example@example.com",
      timeZone: Timezones["+5:30"],
    },
  },
  apps: {
    googleCalendar: {
      slug: "google-calendar",
      dirName: "whatever",
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      keys: {
        expiry_date: Infinity,
        client_id: "client_id",
        client_secret: "client_secret",
        redirect_uris: ["http://localhost:3000/auth/callback"],
      },
    },
  },
};

const cleanup = async () => {
  await prismock.eventType.deleteMany();
  await prismock.user.deleteMany();
  await prismock.schedule.deleteMany();
  await prismock.selectedCalendar.deleteMany();
  await prismock.credential.deleteMany();
  await prismock.booking.deleteMany();
  await prismock.app.deleteMany();
};

beforeEach(async () => {
  await cleanup();
});

afterEach(async () => {
  await cleanup();
});

describe("getSchedule", () => {
  describe("Calendar event", () => {
    test("correctly identifies unavailable slots from calendar", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

      CalendarManagerMock.getBusyCalendarTimes.mockResolvedValue([
        {
          start: `${plus2DateString}T04:45:00.000Z`,
          end: `${plus2DateString}T23:00:00.000Z`,
        },
      ]);

      const scenarioData = {
        eventTypes: [
          {
            id: 1,
            slotInterval: 45,
            length: 45,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
          },
        ],
        apps: [TestData.apps.googleCalendar],
      };
      // An event with one accepted booking
      await createBookingScenario(scenarioData);

      const scheduleForDayWithAGoogleCalendarBooking = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
        },
      });

      // As per Google Calendar Availability, only 4PM(4-4:45PM) GMT slot would be available
      expect(scheduleForDayWithAGoogleCalendarBooking).toHaveTimeSlots([`04:00:00.000Z`], {
        dateString: plus2DateString,
      });
    });
  });

  describe("User Event", () => {
    test("correctly identifies unavailable slots from Cal Bookings in different status", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
      const { dateString: plus3DateString } = getDate({ dateIncrement: 3 });

      // An event with one accepted booking
      await createBookingScenario({
        // An event with length 30 minutes, slotInterval 45 minutes, and minimumBookingNotice 1440 minutes (24 hours)
        eventTypes: [
          {
            id: 1,
            // If `slotInterval` is set, it supersedes `length`
            slotInterval: 45,
            length: 45,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
          },
        ],
        bookings: [
          // That event has one accepted booking from 4:00 to 4:15 in GMT on Day + 3 which is 9:30 to 9:45 in IST
          {
            eventTypeId: 1,
            userId: 101,
            status: "ACCEPTED",
            // Booking Time is stored in GMT in DB. So, provide entry in GMT only.
            startTime: `${plus3DateString}T04:00:00.000Z`,
            endTime: `${plus3DateString}T04:15:00.000Z`,
          },
          {
            eventTypeId: 1,
            userId: 101,
            status: "REJECTED",
            // Booking Time is stored in GMT in DB. So, provide entry in GMT only.
            startTime: `${plus2DateString}T04:00:00.000Z`,
            endTime: `${plus2DateString}T04:15:00.000Z`,
          },
          {
            eventTypeId: 1,
            userId: 101,
            status: "CANCELLED",
            // Booking Time is stored in GMT in DB. So, provide entry in GMT only.
            startTime: `${plus2DateString}T05:00:00.000Z`,
            endTime: `${plus2DateString}T05:15:00.000Z`,
          },
          {
            eventTypeId: 1,
            userId: 101,
            status: "PENDING",
            // Booking Time is stored in GMT in DB. So, provide entry in GMT only.
            startTime: `${plus2DateString}T06:00:00.000Z`,
            endTime: `${plus2DateString}T06:15:00.000Z`,
          },
        ],
      });

      // Day Plus 2 is completely free - It only has non accepted bookings
      const scheduleOnCompletelyFreeDay = await getSchedule({
        input: {
          eventTypeId: 1,
          // EventTypeSlug doesn't matter for non-dynamic events
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
        },
      });

      // getSchedule returns timeslots in GMT
      expect(scheduleOnCompletelyFreeDay).toHaveTimeSlots(
        [
          "04:00:00.000Z",
          "04:45:00.000Z",
          "05:30:00.000Z",
          "06:15:00.000Z",
          "07:00:00.000Z",
          "07:45:00.000Z",
          "08:30:00.000Z",
          "09:15:00.000Z",
          "10:00:00.000Z",
          "10:45:00.000Z",
          "11:30:00.000Z",
        ],
        {
          dateString: plus2DateString,
        }
      );

      // Day plus 3
      const scheduleForDayWithOneBooking = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus2DateString}T18:30:00.000Z`,
          endTime: `${plus3DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
        },
      });

      expect(scheduleForDayWithOneBooking).toHaveTimeSlots(
        [
          // "04:00:00.000Z", - This slot is unavailable because of the booking from 4:00 to 4:15
          `04:15:00.000Z`,
          `05:00:00.000Z`,
          `05:45:00.000Z`,
          `06:30:00.000Z`,
          `07:15:00.000Z`,
          `08:00:00.000Z`,
          `08:45:00.000Z`,
          `09:30:00.000Z`,
          `10:15:00.000Z`,
          `11:00:00.000Z`,
          `11:45:00.000Z`,
        ],
        {
          dateString: plus3DateString,
        }
      );
    });

    test("slots are available as per `length`, `slotInterval` of the event", async () => {
      await createBookingScenario({
        eventTypes: [
          {
            id: 1,
            length: 30,
            users: [
              {
                id: 101,
              },
            ],
          },
          {
            id: 2,
            length: 30,
            slotInterval: 120,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
          },
        ],
      });
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
      const scheduleForEventWith30Length = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
        },
      });

      expect(scheduleForEventWith30Length).toHaveTimeSlots(
        [
          `04:00:00.000Z`,
          `04:30:00.000Z`,
          `05:00:00.000Z`,
          `05:30:00.000Z`,
          `06:00:00.000Z`,
          `06:30:00.000Z`,
          `07:00:00.000Z`,
          `07:30:00.000Z`,
          `08:00:00.000Z`,
          `08:30:00.000Z`,
          `09:00:00.000Z`,
          `09:30:00.000Z`,
          `10:00:00.000Z`,
          `10:30:00.000Z`,
          `11:00:00.000Z`,
          `11:30:00.000Z`,
          `12:00:00.000Z`,
        ],
        {
          dateString: plus2DateString,
        }
      );

      const scheduleForEventWith30minsLengthAndSlotInterval2hrs = await getSchedule({
        input: {
          eventTypeId: 2,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
        },
      });
      // `slotInterval` takes precedence over `length`
      // 4:30 is utc so it is 10:00 in IST
      expect(scheduleForEventWith30minsLengthAndSlotInterval2hrs).toHaveTimeSlots(
        [`04:30:00.000Z`, `06:30:00.000Z`, `08:30:00.000Z`, `10:30:00.000Z`, `12:30:00.000Z`],
        {
          dateString: plus2DateString,
        }
      );
    });

    // FIXME: Fix minimumBookingNotice is respected test
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip("minimumBookingNotice is respected", async () => {
      vi.useFakeTimers().setSystemTime(
        (() => {
          const today = new Date();
          // Beginning of the day in current timezone of the system
          return new Date(today.getFullYear(), today.getMonth(), today.getDate());
        })()
      );

      await createBookingScenario({
        eventTypes: [
          {
            id: 1,
            length: 120,
            minimumBookingNotice: 13 * 60, // Would take the minimum bookable time to be 18:30UTC+13 = 7:30AM UTC
            users: [
              {
                id: 101,
              },
            ],
          },
          {
            id: 2,
            length: 120,
            minimumBookingNotice: 10 * 60, // Would take the minimum bookable time to be 18:30UTC+10 = 4:30AM UTC
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
          },
        ],
      });
      const { dateString: todayDateString } = getDate();
      const { dateString: minus1DateString } = getDate({ dateIncrement: -1 });
      const scheduleForEventWithBookingNotice13Hrs = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${minus1DateString}T18:30:00.000Z`,
          endTime: `${todayDateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
        },
      });
      expect(scheduleForEventWithBookingNotice13Hrs).toHaveTimeSlots(
        [
          /*`04:00:00.000Z`, `06:00:00.000Z`, - Minimum time slot is 07:30 UTC*/ `08:00:00.000Z`,
          `10:00:00.000Z`,
          `12:00:00.000Z`,
        ],
        {
          dateString: todayDateString,
        }
      );

      const scheduleForEventWithBookingNotice10Hrs = await getSchedule({
        input: {
          eventTypeId: 2,
          eventTypeSlug: "",
          startTime: `${minus1DateString}T18:30:00.000Z`,
          endTime: `${todayDateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
        },
      });
      expect(scheduleForEventWithBookingNotice10Hrs).toHaveTimeSlots(
        [
          /*`04:00:00.000Z`, - Minimum bookable time slot is 04:30 UTC but next available is 06:00*/
          `06:00:00.000Z`,
          `08:00:00.000Z`,
          `10:00:00.000Z`,
          `12:00:00.000Z`,
        ],
        {
          dateString: todayDateString,
        }
      );
      vi.useRealTimers();
    });

    test("afterBuffer and beforeBuffer tests - Non Cal Busy Time", async () => {
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
      const { dateString: plus3DateString } = getDate({ dateIncrement: 3 });

      CalendarManagerMock.getBusyCalendarTimes.mockResolvedValue([
        {
          start: `${plus3DateString}T04:00:00.000Z`,
          end: `${plus3DateString}T05:59:59.000Z`,
        },
      ]);

      const scenarioData = {
        eventTypes: [
          {
            id: 1,
            length: 120,
            beforeEventBuffer: 120,
            afterEventBuffer: 120,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
          },
        ],
        apps: [TestData.apps.googleCalendar],
      };

      await createBookingScenario(scenarioData);

      const scheduleForEventOnADayWithNonCalBooking = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus2DateString}T18:30:00.000Z`,
          endTime: `${plus3DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
        },
      });

      expect(scheduleForEventOnADayWithNonCalBooking).toHaveTimeSlots(
        [
          // `04:00:00.000Z`, // - 4 AM is booked
          // `06:00:00.000Z`, // - 6 AM is not available because 08:00AM slot has a `beforeEventBuffer`
          `08:00:00.000Z`, // - 8 AM is available because of availability of 06:00 - 07:59
          `10:00:00.000Z`,
          `12:00:00.000Z`,
        ],
        {
          dateString: plus3DateString,
        }
      );
    });

    test("afterBuffer and beforeBuffer tests - Cal Busy Time", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
      const { dateString: plus3DateString } = getDate({ dateIncrement: 3 });

      CalendarManagerMock.getBusyCalendarTimes.mockResolvedValue([
        {
          start: `${plus3DateString}T04:00:00.000Z`,
          end: `${plus3DateString}T05:59:59.000Z`,
        },
      ]);

      const scenarioData = {
        eventTypes: [
          {
            id: 1,
            length: 120,
            beforeEventBuffer: 120,
            afterEventBuffer: 120,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
          },
        ],
        bookings: [
          {
            userId: 101,
            eventTypeId: 1,
            startTime: `${plus2DateString}T04:00:00.000Z`,
            endTime: `${plus2DateString}T05:59:59.000Z`,
            status: "ACCEPTED" as BookingStatus,
          },
        ],
        apps: [TestData.apps.googleCalendar],
      };

      await createBookingScenario(scenarioData);

      const scheduleForEventOnADayWithCalBooking = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
        },
      });

      expect(scheduleForEventOnADayWithCalBooking).toHaveTimeSlots(
        [
          // `04:00:00.000Z`, // - 4 AM is booked
          // `06:00:00.000Z`, // - 6 AM is not available because of afterBuffer(120 mins) of the existing booking(4-5:59AM slot)
          // `08:00:00.000Z`, // - 8 AM is not available because of beforeBuffer(120mins) of possible booking at 08:00
          `10:00:00.000Z`,
          `12:00:00.000Z`,
        ],
        {
          dateString: plus2DateString,
        }
      );
    });

    test("Start times are offset (offsetStart)", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

      CalendarManagerMock.getBusyCalendarTimes.mockResolvedValue([]);

      const scenarioData = {
        eventTypes: [
          {
            id: 1,
            length: 25,
            offsetStart: 5,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
          },
        ],
        apps: [TestData.apps.googleCalendar],
      };

      await createBookingScenario(scenarioData);

      const schedule = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
        },
      });

      expect(schedule).toHaveTimeSlots(
        [
          `04:05:00.000Z`,
          `04:35:00.000Z`,
          `05:05:00.000Z`,
          `05:35:00.000Z`,
          `06:05:00.000Z`,
          `06:35:00.000Z`,
          `07:05:00.000Z`,
          `07:35:00.000Z`,
          `08:05:00.000Z`,
          `08:35:00.000Z`,
          `09:05:00.000Z`,
          `09:35:00.000Z`,
          `10:05:00.000Z`,
          `10:35:00.000Z`,
          `11:05:00.000Z`,
          `11:35:00.000Z`,
          `12:05:00.000Z`,
        ],
        {
          dateString: plus2DateString,
        }
      );
    });

    test("Check for Date overrides", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

      const scenarioData = {
        eventTypes: [
          {
            id: 1,
            length: 60,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHoursWithDateOverride(plus2DateString)],
          },
        ],
      };

      await createBookingScenario(scenarioData);

      const scheduleForEventOnADayWithDateOverride = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
        },
      });

      expect(scheduleForEventOnADayWithDateOverride).toHaveTimeSlots(
        ["08:30:00.000Z", "09:30:00.000Z", "10:30:00.000Z", "11:30:00.000Z"],
        {
          dateString: plus2DateString,
        }
      );
    });

    test("that a user is considered busy when there's a booking they host", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

      await createBookingScenario({
        eventTypes: [
          // A Collective Event Type hosted by this user
          {
            id: 1,
            slotInterval: 45,
            schedulingType: "COLLECTIVE",
            hosts: [
              {
                userId: 101,
              },
              {
                userId: 102,
              },
            ],
          },
          // A default Event Type which this user owns
          {
            id: 2,
            length: 15,
            slotInterval: 45,
            users: [{ id: 101 }],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
          },
          {
            ...TestData.users.example,
            id: 102,
            schedules: [TestData.schedules.IstWorkHours],
          },
        ],
        bookings: [
          // Create a booking on our Collective Event Type
          {
            userId: 101,
            attendees: [
              {
                email: "IntegrationTestUser102@example.com",
              },
            ],
            eventTypeId: 1,
            status: "ACCEPTED",
            startTime: `${plus2DateString}T04:00:00.000Z`,
            endTime: `${plus2DateString}T04:15:00.000Z`,
          },
        ],
      });

      // Requesting this user's availability for their
      // individual Event Type
      const thisUserAvailability = await getSchedule({
        input: {
          eventTypeId: 2,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
        },
      });

      expect(thisUserAvailability).toHaveTimeSlots(
        [
          // `04:00:00.000Z`, // <- This slot should be occupied by the Collective Event
          `04:15:00.000Z`,
          `05:00:00.000Z`,
          `05:45:00.000Z`,
          `06:30:00.000Z`,
          `07:15:00.000Z`,
          `08:00:00.000Z`,
          `08:45:00.000Z`,
          `09:30:00.000Z`,
          `10:15:00.000Z`,
          `11:00:00.000Z`,
          `11:45:00.000Z`,
        ],
        {
          dateString: plus2DateString,
        }
      );
    });
    test("test that booking limit is working correctly if user is all day available", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
      const { dateString: plus3DateString } = getDate({ dateIncrement: 3 });

      const scenarioData = {
        eventTypes: [
          {
            id: 1,
            length: 60,
            beforeEventBuffer: 0,
            afterEventBuffer: 0,
            bookingLimits: {
              PER_DAY: 1,
            },
            users: [
              {
                id: 101,
              },
            ],
          },
          {
            id: 2,
            length: 60,
            beforeEventBuffer: 0,
            afterEventBuffer: 0,
            bookingLimits: {
              PER_DAY: 2,
            },
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [
              {
                id: 1,
                name: "All Day available",
                availability: [
                  {
                    userId: null,
                    eventTypeId: null,
                    days: [0, 1, 2, 3, 4, 5, 6],
                    startTime: new Date("1970-01-01T00:00:00.000Z"),
                    endTime: new Date("1970-01-01T23:59:59.999Z"),
                    date: null,
                  },
                ],
                timeZone: Timezones["+6:00"],
              },
            ],
          },
        ],
        bookings: [
          {
            userId: 101,
            eventTypeId: 1,
            startTime: `${plus2DateString}T08:00:00.000Z`,
            endTime: `${plus2DateString}T09:00:00.000Z`,
            status: "ACCEPTED" as BookingStatus,
          },
          {
            userId: 101,
            eventTypeId: 2,
            startTime: `${plus2DateString}T08:00:00.000Z`,
            endTime: `${plus2DateString}T09:00:00.000Z`,
            status: "ACCEPTED" as BookingStatus,
          },
        ],
      };

      await createBookingScenario(scenarioData);

      const thisUserAvailabilityBookingLimitOne = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T00:00:00.000Z`,
          endTime: `${plus3DateString}T23:59:59.999Z`,
          timeZone: Timezones["+6:00"],
          isTeamEvent: false,
        },
      });

      const thisUserAvailabilityBookingLimitTwo = await getSchedule({
        input: {
          eventTypeId: 2,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T00:00:00.000Z`,
          endTime: `${plus3DateString}T23:59:59.999Z`,
          timeZone: Timezones["+6:00"],
          isTeamEvent: false,
        },
      });

      let availableSlotsInTz: dayjs.Dayjs[] = [];
      for (const date in thisUserAvailabilityBookingLimitOne.slots) {
        thisUserAvailabilityBookingLimitOne.slots[date].forEach((timeObj) => {
          availableSlotsInTz.push(dayjs(timeObj.time).tz(Timezones["+6:00"]));
        });
      }

      expect(availableSlotsInTz.filter((slot) => slot.format().startsWith(plus2DateString)).length).toBe(0); // 1 booking per day as limit

      availableSlotsInTz = [];
      for (const date in thisUserAvailabilityBookingLimitTwo.slots) {
        thisUserAvailabilityBookingLimitTwo.slots[date].forEach((timeObj) => {
          availableSlotsInTz.push(dayjs(timeObj.time).tz(Timezones["+6:00"]));
        });
      }
      expect(availableSlotsInTz.filter((slot) => slot.format().startsWith(plus2DateString)).length).toBe(23); // 2 booking per day as limit, only one booking on that
    });
  });

  describe("Team Event", () => {
    test("correctly identifies unavailable slots from calendar for all users in collective scheduling, considers bookings of users in other events as well", async () => {
      const { dateString: todayDateString } = getDate();

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

      await createBookingScenario({
        eventTypes: [
          // An event having two users with one accepted booking
          {
            id: 1,
            slotInterval: 45,
            schedulingType: "COLLECTIVE",
            length: 45,
            users: [
              {
                id: 101,
              },
              {
                id: 102,
              },
            ],
          },
          {
            id: 2,
            slotInterval: 45,
            length: 45,
            users: [
              {
                id: 102,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
          },
          {
            ...TestData.users.example,
            id: 102,
            schedules: [TestData.schedules.IstWorkHours],
          },
        ],
        bookings: [
          {
            userId: 101,
            eventTypeId: 1,
            status: "ACCEPTED",
            startTime: `${plus2DateString}T04:00:00.000Z`,
            endTime: `${plus2DateString}T04:15:00.000Z`,
          },
          {
            userId: 102,
            eventTypeId: 2,
            status: "ACCEPTED",
            startTime: `${plus2DateString}T05:30:00.000Z`,
            endTime: `${plus2DateString}T05:45:00.000Z`,
          },
        ],
      });

      const scheduleForTeamEventOnADayWithNoBooking = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${todayDateString}T18:30:00.000Z`,
          endTime: `${plus1DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: true,
        },
      });

      expect(scheduleForTeamEventOnADayWithNoBooking).toHaveTimeSlots(
        [
          `04:00:00.000Z`,
          `04:45:00.000Z`,
          `05:30:00.000Z`,
          `06:15:00.000Z`,
          `07:00:00.000Z`,
          `07:45:00.000Z`,
          `08:30:00.000Z`,
          `09:15:00.000Z`,
          `10:00:00.000Z`,
          `10:45:00.000Z`,
          `11:30:00.000Z`,
        ],
        {
          dateString: plus1DateString,
        }
      );

      const scheduleForTeamEventOnADayWithOneBookingForEachUser = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: true,
        },
      });

      // A user with blocked time in another event, still affects Team Event availability
      // It's a collective availability, so both user 101 and 102 are considered for timeslots
      expect(scheduleForTeamEventOnADayWithOneBookingForEachUser).toHaveTimeSlots(
        [
          //`04:00:00.000Z`, - Blocked with User 101
          `04:15:00.000Z`,
          //`05:00:00.000Z`, - Blocked with User 102 in event 2
          `05:45:00.000Z`,
          `06:30:00.000Z`,
          `07:15:00.000Z`,
          `08:00:00.000Z`,
          `08:45:00.000Z`,
          `09:30:00.000Z`,
          `10:15:00.000Z`,
          `11:00:00.000Z`,
          `11:45:00.000Z`,
        ],
        { dateString: plus2DateString }
      );
    });

    test("correctly identifies unavailable slots from calendar for all users in Round Robin scheduling, considers bookings of users in other events as well", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
      const { dateString: plus3DateString } = getDate({ dateIncrement: 3 });

      await createBookingScenario({
        eventTypes: [
          // An event having two users with one accepted booking
          {
            id: 1,
            slotInterval: 45,
            length: 45,
            users: [
              {
                id: 101,
              },
              {
                id: 102,
              },
            ],
            schedulingType: "ROUND_ROBIN",
          },
          {
            id: 2,
            slotInterval: 45,
            length: 45,
            users: [
              {
                id: 102,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
          },
          {
            ...TestData.users.example,
            id: 102,
            schedules: [TestData.schedules.IstWorkHours],
          },
        ],
        bookings: [
          {
            userId: 101,
            eventTypeId: 1,
            status: "ACCEPTED",
            startTime: `${plus2DateString}T04:00:00.000Z`,
            endTime: `${plus2DateString}T04:15:00.000Z`,
          },
          {
            userId: 102,
            eventTypeId: 2,
            status: "ACCEPTED",
            startTime: `${plus2DateString}T05:30:00.000Z`,
            endTime: `${plus2DateString}T05:45:00.000Z`,
          },
          {
            userId: 101,
            eventTypeId: 1,
            status: "ACCEPTED",
            startTime: `${plus3DateString}T04:00:00.000Z`,
            endTime: `${plus3DateString}T04:15:00.000Z`,
          },
          {
            userId: 102,
            eventTypeId: 2,
            status: "ACCEPTED",
            startTime: `${plus3DateString}T04:00:00.000Z`,
            endTime: `${plus3DateString}T04:15:00.000Z`,
          },
        ],
      });
      const scheduleForTeamEventOnADayWithOneBookingForEachUserButOnDifferentTimeslots = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: true,
        },
      });
      // A user with blocked time in another event, still affects Team Event availability
      expect(scheduleForTeamEventOnADayWithOneBookingForEachUserButOnDifferentTimeslots).toHaveTimeSlots(
        [
          `04:00:00.000Z`, // - Blocked with User 101 but free with User 102. Being RoundRobin it is still bookable
          `04:45:00.000Z`,
          `05:30:00.000Z`, // - Blocked with User 102 but free with User 101. Being RoundRobin it is still bookable
          `06:15:00.000Z`,
          `07:00:00.000Z`,
          `07:45:00.000Z`,
          `08:30:00.000Z`,
          `09:15:00.000Z`,
          `10:00:00.000Z`,
          `10:45:00.000Z`,
          `11:30:00.000Z`,
        ],
        { dateString: plus2DateString }
      );

      const scheduleForTeamEventOnADayWithOneBookingForEachUserOnSameTimeSlot = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus2DateString}T18:30:00.000Z`,
          endTime: `${plus3DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: true,
        },
      });
      // A user with blocked time in another event, still affects Team Event availability
      expect(scheduleForTeamEventOnADayWithOneBookingForEachUserOnSameTimeSlot).toHaveTimeSlots(
        [
          //`04:00:00.000Z`, // - Blocked with User 101 as well as User 102, so not available in Round Robin
          `04:15:00.000Z`,
          `05:00:00.000Z`,
          `05:45:00.000Z`,
          `06:30:00.000Z`,
          `07:15:00.000Z`,
          `08:00:00.000Z`,
          `08:45:00.000Z`,
          `09:30:00.000Z`,
          `10:15:00.000Z`,
          `11:00:00.000Z`,
          `11:45:00.000Z`,
        ],
        { dateString: plus3DateString }
      );
    });

    test("getSchedule can get slots of org's member event type when orgSlug, eventTypeSlug passed as input", async () => {
      const org = await createOrganization({ name: "acme", slug: "acme" });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        // So, that it picks the first schedule from the list
        defaultScheduleId: null,
        organizationId: org.id,
        // Has morning shift with some overlap with morning shift
        schedules: [TestData.schedules.IstWorkHours],
      });

      const scenario = await createBookingScenario(
        getScenarioData(
          {
            eventTypes: [
              {
                id: 1,
                slotInterval: 45,
                length: 45,
                users: [
                  {
                    id: 101,
                  },
                ],
              },
            ],
            organizer,
          },
          { id: org.id }
        )
      );

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

      const getScheduleRes = await getSchedule({
        input: {
          eventTypeSlug: scenario.eventTypes[0]?.slug,
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
          orgSlug: "acme",
          usernameList: [organizer.username],
        },
      });

      expect(getScheduleRes).toHaveTimeSlots(
        [
          `04:00:00.000Z`,
          `04:45:00.000Z`,
          `05:30:00.000Z`,
          `06:15:00.000Z`,
          `07:00:00.000Z`,
          `07:45:00.000Z`,
          `08:30:00.000Z`,
          `09:15:00.000Z`,
          `10:00:00.000Z`,
          `10:45:00.000Z`,
          `11:30:00.000Z`,
        ],
        { dateString: plus2DateString }
      );
    });
  });
});
