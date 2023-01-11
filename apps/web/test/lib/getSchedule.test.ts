import {
  EventType as PrismaEventType,
  User as PrismaUser,
  Booking as PrismaBooking,
  App as PrismaApp,
  SchedulingType,
} from "@prisma/client";
import { diff } from "jest-diff";
import { v4 as uuidv4 } from "uuid";

import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/client";
import { getSchedule, Slot } from "@calcom/trpc/server/routers/viewer/slots";

import { prismaMock, CalendarManagerMock } from "../../../../tests/config/singleton";

// TODO: Mock properly
prismaMock.eventType.findUnique.mockResolvedValue(null);
prismaMock.user.findMany.mockResolvedValue([]);

jest.mock("@calcom/lib/constants", () => ({
  IS_PRODUCTION: true,
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
          startTime: "1970-01-01T09:30:00.000Z",
          endTime: "1970-01-01T18:00:00.000Z",
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
          startTime: "1970-01-01T09:30:00.000Z",
          endTime: "1970-01-01T18:00:00.000Z",
          date: null,
        },
        {
          userId: null,
          eventTypeId: null,
          days: [0, 1, 2, 3, 4, 5, 6],
          startTime: `1970-01-01T14:00:00.000Z`,
          endTime: `1970-01-01T18:00:00.000Z`,
          date: dateString,
        },
      ],
      timeZone: Timezones["+5:30"],
    }),
  },
  users: {
    example: {
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

const ctx = {
  prisma,
};

type App = {
  slug: string;
  dirName: string;
};

type InputCredential = typeof TestData.credentials.google;

type InputSelectedCalendar = typeof TestData.selectedCalendars.google;

type InputUser = typeof TestData.users.example & { id: number } & {
  credentials?: InputCredential[];
  selectedCalendars?: InputSelectedCalendar[];
  schedules: {
    id: number;
    name: string;
    availability: {
      userId: number | null;
      eventTypeId: number | null;
      days: number[];
      startTime: string;
      endTime: string;
      date: string | null;
    }[];
    timeZone: string;
  }[];
};

type InputEventType = {
  id: number;
  title?: string;
  length?: number;
  slotInterval?: number;
  minimumBookingNotice?: number;
  users: { id: number }[];
  schedulingType?: SchedulingType;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
};

type InputBooking = {
  userId: number;
  eventTypeId: number;
  startTime: string;
  endTime: string;
  title?: string;
  status: BookingStatus;
};

const cleanup = async () => {
  await prisma.eventType.deleteMany();
  await prisma.user.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.selectedCalendar.deleteMany();
  await prisma.credential.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.app.deleteMany();
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
      createBookingScenario(scenarioData);

      addBusyTimesInGoogleCalendar([
        {
          start: `${plus2DateString}T04:45:00.000Z`,
          end: `${plus2DateString}T23:00:00.000Z`,
        },
      ]);
      const scheduleForDayWithAGoogleCalendarBooking = await getSchedule(
        {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
        },
        ctx
      );

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
      createBookingScenario({
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
      const scheduleOnCompletelyFreeDay = await getSchedule(
        {
          eventTypeId: 1,
          // EventTypeSlug doesn't matter for non-dynamic events
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
        },
        ctx
      );

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
      const scheduleForDayWithOneBooking = await getSchedule(
        {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus2DateString}T18:30:00.000Z`,
          endTime: `${plus3DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
        },
        ctx
      );

      expect(scheduleForDayWithOneBooking).toHaveTimeSlots(
        [
          // "04:00:00.000Z", - This slot is unavailable because of the booking from 4:00 to 4:15
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
          dateString: plus3DateString,
        }
      );
    });

    test("slots are available as per `length`, `slotInterval` of the event", async () => {
      createBookingScenario({
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
      const scheduleForEventWith30Length = await getSchedule(
        {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
        },
        ctx
      );
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

      const scheduleForEventWith30minsLengthAndSlotInterval2hrs = await getSchedule(
        {
          eventTypeId: 2,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
        },
        ctx
      );
      // `slotInterval` takes precedence over `length`
      expect(scheduleForEventWith30minsLengthAndSlotInterval2hrs).toHaveTimeSlots(
        [`04:00:00.000Z`, `06:00:00.000Z`, `08:00:00.000Z`, `10:00:00.000Z`, `12:00:00.000Z`],
        {
          dateString: plus2DateString,
        }
      );
    });

    test.skip("minimumBookingNotice is respected", async () => {
      jest.useFakeTimers().setSystemTime(
        (() => {
          const today = new Date();
          // Beginning of the day in current timezone of the system
          return new Date(today.getFullYear(), today.getMonth(), today.getDate());
        })()
      );

      createBookingScenario({
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
      const scheduleForEventWithBookingNotice13Hrs = await getSchedule(
        {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${minus1DateString}T18:30:00.000Z`,
          endTime: `${todayDateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
        },
        ctx
      );
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

      const scheduleForEventWithBookingNotice10Hrs = await getSchedule(
        {
          eventTypeId: 2,
          eventTypeSlug: "",
          startTime: `${minus1DateString}T18:30:00.000Z`,
          endTime: `${todayDateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
        },
        ctx
      );
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
      jest.useRealTimers();
    });

    test("afterBuffer and beforeBuffer tests - Non Cal Busy Time", async () => {
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
      const { dateString: plus3DateString } = getDate({ dateIncrement: 3 });

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

      createBookingScenario(scenarioData);

      addBusyTimesInGoogleCalendar([
        {
          start: `${plus3DateString}T04:00:00.000Z`,
          end: `${plus3DateString}T05:59:59.000Z`,
        },
      ]);

      const scheduleForEventOnADayWithNonCalBooking = await getSchedule(
        {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus2DateString}T18:30:00.000Z`,
          endTime: `${plus3DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
        },
        ctx
      );

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

      createBookingScenario(scenarioData);

      addBusyTimesInGoogleCalendar([
        {
          start: `${plus3DateString}T04:00:00.000Z`,
          end: `${plus3DateString}T05:59:59.000Z`,
        },
      ]);

      const scheduleForEventOnADayWithCalBooking = await getSchedule(
        {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
        },
        ctx
      );

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

      createBookingScenario(scenarioData);

      const scheduleForEventOnADayWithDateOverride = await getSchedule(
        {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
        },
        ctx
      );

      expect(scheduleForEventOnADayWithDateOverride).toHaveTimeSlots(
        ["08:30:00.000Z", "09:30:00.000Z", "10:30:00.000Z", "11:30:00.000Z"],
        {
          dateString: plus2DateString,
        }
      );
    });
  });

  describe("Team Event", () => {
    test("correctly identifies unavailable slots from calendar for all users in collective scheduling, considers bookings of users in other events as well", async () => {
      const { dateString: todayDateString } = getDate();

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

      createBookingScenario({
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

      const scheduleForTeamEventOnADayWithNoBooking = await getSchedule(
        {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${todayDateString}T18:30:00.000Z`,
          endTime: `${plus1DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
        },
        ctx
      );

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

      const scheduleForTeamEventOnADayWithOneBookingForEachUser = await getSchedule(
        {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
        },
        ctx
      );
      // A user with blocked time in another event, still affects Team Event availability
      // It's a collective availability, so both user 101 and 102 are considered for timeslots
      expect(scheduleForTeamEventOnADayWithOneBookingForEachUser).toHaveTimeSlots(
        [
          //`04:00:00.000Z`, - Blocked with User 101
          `04:45:00.000Z`,
          //`05:30:00.000Z`, - Blocked with User 102 in event 2
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

    test("correctly identifies unavailable slots from calendar for all users in Round Robin scheduling, considers bookings of users in other events as well", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
      const { dateString: plus3DateString } = getDate({ dateIncrement: 3 });

      createBookingScenario({
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
      const scheduleForTeamEventOnADayWithOneBookingForEachUserButOnDifferentTimeslots = await getSchedule(
        {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
        },
        ctx
      );
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

      const scheduleForTeamEventOnADayWithOneBookingForEachUserOnSameTimeSlot = await getSchedule(
        {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus2DateString}T18:30:00.000Z`,
          endTime: `${plus3DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
        },
        ctx
      );
      // A user with blocked time in another event, still affects Team Event availability
      expect(scheduleForTeamEventOnADayWithOneBookingForEachUserOnSameTimeSlot).toHaveTimeSlots(
        [
          //`04:00:00.000Z`, // - Blocked with User 101 as well as User 102, so not available in Round Robin
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
        { dateString: plus3DateString }
      );
    });
  });
});

function getGoogleCalendarCredential() {
  return {
    type: "google_calendar",
    key: {
      scope:
        "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
      token_type: "Bearer",
      expiry_date: 1656999025367,
      access_token: "ACCESS_TOKEN",
      refresh_token: "REFRESH_TOKEN",
    },
  };
}

function addEventTypes(eventTypes: InputEventType[], usersStore: InputUser[]) {
  const baseEventType = {
    title: "Base EventType Title",
    slug: "base-event-type-slug",
    timeZone: null,
    beforeEventBuffer: 0,
    afterEventBuffer: 0,
    schedulingType: null,

    //TODO: What is the purpose of periodStartDate and periodEndDate? Test these?
    periodStartDate: new Date("2022-01-21T09:03:48.000Z"),
    periodEndDate: new Date("2022-01-21T09:03:48.000Z"),
    periodCountCalendarDays: false,
    periodDays: 30,
    seatsPerTimeSlot: null,
    metadata: {},
    minimumBookingNotice: 0,
  };
  const foundEvents: Record<number, boolean> = {};
  const eventTypesWithUsers = eventTypes.map((eventType) => {
    if (!eventType.slotInterval && !eventType.length) {
      throw new Error("eventTypes[number]: slotInterval or length must be defined");
    }
    if (foundEvents[eventType.id]) {
      throw new Error(`eventTypes[number]: id ${eventType.id} is not unique`);
    }
    foundEvents[eventType.id] = true;
    const users = eventType.users.map((userWithJustId) => {
      return usersStore.find((user) => user.id === userWithJustId.id);
    });
    return {
      ...baseEventType,
      ...eventType,
      users,
    };
  });

  logger.silly("TestData: Creating EventType", eventTypes);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  prismaMock.eventType.findUnique.mockImplementation(({ where }) => {
    return new Promise((resolve) => {
      const eventType = eventTypesWithUsers.find((e) => e.id === where.id) as unknown as PrismaEventType & {
        users: PrismaUser[];
      };
      resolve(eventType);
    });
  });
}

async function addBookings(bookings: InputBooking[], eventTypes: InputEventType[]) {
  logger.silly("TestData: Creating Bookings", bookings);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  prismaMock.booking.findMany.mockImplementation((findManyArg) => {
    const where = findManyArg?.where || {};
    return new Promise((resolve) => {
      resolve(
        bookings
          // We can improve this filter to support the entire where clause but that isn't necessary yet. So, handle what we know we pass to `findMany` and is needed
          .filter((booking) => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const statusIn = where.status?.in || [];
            // Return bookings passing status prisma where
            return statusIn.includes(booking.status) && booking.userId === where.userId;
          })
          .map((booking) => ({
            uid: uuidv4(),
            title: "Test Booking Title",
            ...booking,
            eventType: eventTypes.find((eventType) => eventType.id === booking.eventTypeId),
          })) as unknown as PrismaBooking[]
      );
    });
  });
}

function addUsers(users: InputUser[]) {
  prismaMock.user.findMany.mockResolvedValue(
    users.map((user) => {
      return {
        ...user,
        username: `IntegrationTestUser${user.id}`,
        email: `IntegrationTestUser${user.id}@example.com`,
      };
    }) as unknown as PrismaUser[]
  );
}
type ScenarioData = {
  // TODO: Support multiple bookings and add tests with that.
  bookings?: InputBooking[];
  users: InputUser[];
  credentials?: InputCredential[];
  apps?: App[];
  selectedCalendars?: InputSelectedCalendar[];
  eventTypes: InputEventType[];
  calendarBusyTimes?: {
    start: string;
    end: string;
  }[];
};

function createBookingScenario(data: ScenarioData) {
  logger.silly("TestData: Creating Scenario", data);

  addUsers(data.users);

  const eventType = addEventTypes(data.eventTypes, data.users);
  if (data.apps) {
    prismaMock.app.findMany.mockResolvedValue(data.apps as PrismaApp[]);
    // FIXME: How do we know which app to return?
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    prismaMock.app.findUnique.mockImplementation(({ where: { slug: whereSlug } }) => {
      return new Promise((resolve) => {
        if (!data.apps) {
          resolve(null);
          return;
        }
        resolve((data.apps.find(({ slug }) => slug == whereSlug) as PrismaApp) || null);
      });
    });
  }
  data.bookings = data.bookings || [];
  addBookings(data.bookings, data.eventTypes);

  return {
    eventType,
  };
}

/**
 * This fn indents to dynamically compute day, month, year for the purpose of testing.
 * We are not using DayJS because that's actually being tested by this code.
 * - `dateIncrement` adds the increment to current day
 * - `monthIncrement` adds the increment to current month
 * - `yearIncrement` adds the increment to current year
 */
const getDate = (param: { dateIncrement?: number; monthIncrement?: number; yearIncrement?: number } = {}) => {
  let { dateIncrement, monthIncrement, yearIncrement } = param;
  dateIncrement = dateIncrement || 0;
  monthIncrement = monthIncrement || 0;
  yearIncrement = yearIncrement || 0;

  let _date = new Date().getDate() + dateIncrement;
  let year = new Date().getFullYear() + yearIncrement;

  // Make it start with 1 to match with DayJS requiremet
  let _month = new Date().getMonth() + monthIncrement + 1;

  // If last day of the month(As _month is plus 1 already it is going to be the 0th day of next month which is the last day of current month)
  const lastDayOfMonth = new Date(year, _month, 0).getDate();
  const numberOfDaysForNextMonth = +_date - +lastDayOfMonth;
  if (numberOfDaysForNextMonth > 0) {
    _date = numberOfDaysForNextMonth;
    _month = _month + 1;
  }

  if (_month === 13) {
    _month = 1;
    year = year + 1;
  }

  const date = _date < 10 ? "0" + _date : _date;
  const month = _month < 10 ? "0" + _month : _month;

  return {
    date,
    month,
    year,
    dateString: `${year}-${month}-${date}`,
  };
};

/**
 * TODO: Improve this to validate the arguments passed to getBusyCalendarTimes if they are valid or not.
 */
function addBusyTimesInGoogleCalendar(
  busy: {
    start: string;
    end: string;
  }[]
) {
  CalendarManagerMock.getBusyCalendarTimes.mockResolvedValue(busy);
}
