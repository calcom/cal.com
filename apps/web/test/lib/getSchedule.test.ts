import { Prisma } from "@prisma/client";
import nock from "nock";
import { v4 as uuidv4 } from "uuid";

import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { BookingStatus, PeriodType } from "@calcom/prisma/client";
import { getSchedule } from "@calcom/trpc/server/routers/viewer/slots";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveTimeSlots(expectedSlots: string[], date: { dateString: string }): R;
    }
  }
}

expect.extend({
  toHaveTimeSlots(schedule, expectedSlots: string[], { dateString }: { dateString: string }) {
    expect(schedule.slots[`${dateString}`]).toBeDefined();
    expect(schedule.slots[`${dateString}`].map((slot: { time: string }) => slot.time)).toEqual(
      expectedSlots.map((slotTime) => `${dateString}T${slotTime}`)
    );
    return {
      pass: true,
      message: () => "has correct timeslots ",
    };
  },
});

/**
 * This fn indents to dynamically compute day, month, year for the purpose of testing.
 * We are not using DayJS because that's actually being tested by this code.
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

  console.log(`Date, month, year for ${JSON.stringify(param)}`, date, month, year);
  return {
    date,
    month,
    year,
    dateString: `${year}-${month}-${date}`,
  };
};

const ctx = {
  prisma,
};

type App = {
  slug: string;
  dirName: string;
};
type User = {
  credentials?: Credential[];
  selectedCalendars?: SelectedCalendar[];
};

type Credential = { key: any; type: string };
type SelectedCalendar = {
  integration: string;
  externalId: string;
};

type EventType = {
  id?: number;
  title?: string;
  length: number;
  periodType: PeriodType;
  slotInterval: number;
  minimumBookingNotice: number;
  seatsPerTimeSlot?: number | null;
};

type Booking = {
  userId: number;
  eventTypeId: number;
  startTime: string;
  endTime: string;
  title?: string;
  status: BookingStatus;
};

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

async function addEventTypeToDB(data: {
  eventType: EventType;
  selectedCalendars?: SelectedCalendar[];
  credentials?: Credential[];
  users?: User[];
  usersConnectedToTheEvent?: { id: number }[];
  numUsers?: number;
}) {
  data.selectedCalendars = data.selectedCalendars || [];
  data.credentials = data.credentials || [];
  const userCreate = {
    id: 100,
    username: "hariom",
    email: "hariombalhara@gmail.com",
    schedules: {
      create: {
        name: "Schedule1",
        availability: {
          create: {
            userId: null,
            eventTypeId: null,
            days: [0, 1, 2, 3, 4, 5, 6],
            startTime: "1970-01-01T09:30:00.000Z",
            endTime: "1970-01-01T18:00:00.000Z",
            date: null,
          },
        },
        timeZone: "Asia/Kolkata",
      },
    },
  };
  const usersCreate: typeof userCreate[] = [];

  if (!data.users && !data.numUsers && !data.usersConnectedToTheEvent) {
    throw new Error("Either users, numUsers or usersConnectedToTheEvent must be provided");
  }
  if (!data.users && data.numUsers) {
    data.users = [];
    for (let i = 0; i < data.numUsers; i++) {
      data.users.push({
        credentials: undefined,
        selectedCalendars: undefined,
      });
    }
  }

  if (data.users?.length) {
    data.users.forEach((user, index) => {
      const newUserCreate = {
        ...userCreate,
        ...user,
        credentials: { create: user.credentials },
        selectedCalendars: { create: user.selectedCalendars },
      };
      newUserCreate.id = index + 1;
      newUserCreate.username = `IntegrationTestUser${newUserCreate.id}`;
      newUserCreate.email = `IntegrationTestUser${newUserCreate.id}@example.com`;
      usersCreate.push(newUserCreate);
    });
  } else {
    usersCreate.push({ ...userCreate });
  }

  const prismaData: Prisma.EventTypeCreateArgs["data"] = {
    title: "Test EventType Title",
    slug: "testslug",
    timeZone: null,
    beforeEventBuffer: 0,
    afterEventBuffer: 0,
    schedulingType: null,
    periodStartDate: "2022-01-21T09:03:48.000Z",
    periodEndDate: "2022-01-21T09:03:48.000Z",
    periodCountCalendarDays: false,
    periodDays: 30,
    users: {
      create: usersCreate,
      connect: data.usersConnectedToTheEvent,
    },
    ...data.eventType,
  };
  logger.silly("TestData: Creating EventType", prismaData);

  return await prisma.eventType.create({
    data: prismaData,
    select: {
      id: true,
      users: true,
    },
  });
}

async function addBookingToDB(data: { booking: Booking }) {
  const prismaData = {
    uid: uuidv4(),
    title: "Test Booking Title",
    ...data.booking,
  };
  logger.silly("TestData: Creating Booking", prismaData);

  return await prisma.booking.create({
    data: prismaData,
  });
}

async function createBookingScenario(data: {
  booking?: Omit<Booking, "eventTypeId" | "userId">;
  users?: User[];
  numUsers?: number;
  credentials?: Credential[];
  apps?: App[];
  selectedCalendars?: SelectedCalendar[];
  eventType: EventType;
  /**
   * User must already be existing
   * */
  usersConnectedToTheEvent?: { id: number }[];
}) {
  // if (!data.eventType.userId) {
  //   data.eventType.userId =
  //     (data.users ? data.users[0]?.id : null) || data.usersConnect ? data.usersConnect[0]?.id : null;
  // }
  const eventType = await addEventTypeToDB(data);
  if (data.apps) {
    await prisma.app.createMany({
      data: data.apps,
    });
  }
  if (data.booking) {
    // TODO: What about if there are multiple users of the eventType?
    const userId = eventType.users[0].id;
    const eventTypeId = eventType.id;

    await addBookingToDB({ ...data, booking: { ...data.booking, userId, eventTypeId } });
  }
  return {
    eventType,
  };
}

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
  describe("User Event", () => {
    test("correctly identifies unavailable slots from Cal Bookings", async () => {
      // const { dateString: todayDateString } = getDate();
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
      const { dateString: plus3DateString } = getDate({ dateIncrement: 3 });

      // An event with one accepted booking
      const { eventType } = await createBookingScenario({
        eventType: {
          minimumBookingNotice: 1440,
          length: 30,
          slotInterval: 45,
          periodType: "UNLIMITED" as PeriodType,
        },
        numUsers: 1,
        booking: {
          status: "ACCEPTED",
          startTime: `${plus3DateString}T04:00:00.000Z`,
          endTime: `${plus3DateString}T04:15:00.000Z`,
        },
      });

      // const scheduleLyingWithinMinBookingNotice = await getSchedule(
      //   {
      //     eventTypeId: eventType.id,
      //     startTime: `${todayDateString}T18:30:00.000Z`,
      //     endTime: `${plus1DateString}T18:29:59.999Z`,
      //     timeZone: "Asia/Kolkata",
      //   },
      //   ctx
      // );

      // expect(scheduleLyingWithinMinBookingNotice).toHaveTimeSlots([], {
      //   dateString: plus1DateString,
      // });

      const scheduleOnCompletelyFreeDay = await getSchedule(
        {
          eventTypeId: eventType.id,
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: "Asia/Kolkata",
        },
        ctx
      );

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

      const scheduleForDayWithOneBooking = await getSchedule(
        {
          eventTypeId: eventType.id,
          startTime: `${plus2DateString}T18:30:00.000Z`,
          endTime: `${plus3DateString}T18:29:59.999Z`,
          timeZone: "Asia/Kolkata", // GMT+5:30
        },
        ctx
      );
      expect(scheduleForDayWithOneBooking).toHaveTimeSlots(
        [
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

    test("correctly identifies unavailable slots from calendar", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

      // An event with one accepted booking
      const { eventType } = await createBookingScenario({
        eventType: {
          minimumBookingNotice: 1440,
          length: 30,
          slotInterval: 45,
          periodType: "UNLIMITED" as PeriodType,
          seatsPerTimeSlot: null,
        },
        users: [
          {
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [
              {
                integration: "google_calendar",
                externalId: "john@example.com",
              },
            ],
          },
        ],
        apps: [
          {
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
        ],
      });

      nock("https://oauth2.googleapis.com").post("/token").reply(200, {
        access_token: "access_token",
        expiry_date: Infinity,
      });

      // Google Calendar with 11th July having many events
      nock("https://www.googleapis.com")
        .post("/calendar/v3/freeBusy")
        .reply(200, {
          calendars: [
            {
              busy: [
                {
                  start: `${plus2DateString}T04:30:00.000Z`,
                  end: `${plus2DateString}T23:00:00.000Z`,
                },
              ],
            },
          ],
        });

      const scheduleForDayWithAGoogleCalendarBooking = await getSchedule(
        {
          eventTypeId: eventType.id,
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: "Asia/Kolkata",
        },
        ctx
      );

      // As per Google Calendar Availability, only 4PM GMT slot would be available
      expect(scheduleForDayWithAGoogleCalendarBooking).toHaveTimeSlots([`04:00:00.000Z`], {
        dateString: plus2DateString,
      });
    });
  });

  describe("Team Event", () => {
    test("correctly identifies unavailable slots from calendar", async () => {
      const { dateString: todayDateString } = getDate();

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

      // An event having two users with one accepted booking
      const { eventType: teamEventType } = await createBookingScenario({
        eventType: {
          id: 1,
          minimumBookingNotice: 0,
          length: 30,
          slotInterval: 45,
          periodType: "UNLIMITED" as PeriodType,
          seatsPerTimeSlot: null,
        },
        numUsers: 2,
        booking: {
          status: "ACCEPTED",
          startTime: `${plus2DateString}T04:00:00.000Z`,
          endTime: `${plus2DateString}T04:15:00.000Z`,
        },
      });

      const scheduleForTeamEventOnADayWithNoBooking = await getSchedule(
        {
          eventTypeId: 1,
          startTime: `${todayDateString}T18:30:00.000Z`,
          endTime: `${plus1DateString}T18:29:59.999Z`,
          timeZone: "Asia/Kolkata",
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

      const scheduleForTeamEventOnADayWithOneBooking = await getSchedule(
        {
          eventTypeId: 1,
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: "Asia/Kolkata",
        },
        ctx
      );

      expect(scheduleForTeamEventOnADayWithOneBooking).toHaveTimeSlots(
        [
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

      // An event with user 2 of team event
      await createBookingScenario({
        eventType: {
          id: 2,
          minimumBookingNotice: 0,
          length: 30,
          slotInterval: 45,
          periodType: "UNLIMITED" as PeriodType,
          seatsPerTimeSlot: null,
        },
        usersConnectedToTheEvent: [
          {
            id: teamEventType.users[1].id,
          },
        ],
        booking: {
          status: "ACCEPTED",
          startTime: `${plus2DateString}T05:30:00.000Z`,
          endTime: `${plus2DateString}T05:45:00.000Z`,
        },
      });

      const scheduleOfTeamEventHavingAUserWithBlockedTimeInAnotherEvent = await getSchedule(
        {
          eventTypeId: 1,
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: "Asia/Kolkata",
        },
        ctx
      );

      // A user with blocked time in another event, doesn't impact Team Event availability
      expect(scheduleOfTeamEventHavingAUserWithBlockedTimeInAnotherEvent).toHaveTimeSlots(
        [
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
