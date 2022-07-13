import { Prisma } from "@prisma/client";
import nock from "nock";
import { v4 as uuidv4 } from "uuid";

import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { BookingStatus, PeriodType } from "@calcom/prisma/client";

import { getSchedule } from "../../server/routers/viewer/slots";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveTimeSlots(slots: string[], date: { date: number; month: number; year: number }): R;
    }
  }
}

expect.extend({
  toHaveTimeSlots(schedule, slots, { date, year, month }) {
    expect(schedule.slots[`${year}-${month}-${date}`]).toBeDefined();
    expect(schedule.slots[`${year}-${month}-${date}`].map((slot) => slot.time)).toEqual(
      slots.map((slotTime) => `${year}-${month}-${date}T${slotTime}`)
    );
    return {
      pass: true,
      message: () => "has timeslots ",
    };
  },
});

/**
 * This fn indents to dynamically compute day, month, year for the purpose of testing.
 * We are not using DayJS because that's actually being tested by this code.
 */
const getDate = ({ dateIncrement, monthIncrement, yearIncrement } = {}) => {
  dateIncrement = dateIncrement || 0;
  monthIncrement = monthIncrement || 0;
  yearIncrement = yearIncrement || 0;
  const year = new Date().getFullYear() + yearIncrement;
  // Make it start with 1 to match with DayJS requiremet
  let _month = new Date().getMonth() + monthIncrement + 1;
  if (_month === 13) {
    _month = 1;
  }
  const month = _month < 10 ? "0" + _month : _month;

  let _date = new Date().getDate() + dateIncrement;

  // If last day of the month(As _month is plus 1 already it is going to be the 0th day of next month which is the last day of current month)
  if (_date === new Date(year, _month, 0).getDate()) {
    _date = 1;
  }

  const date = _date < 10 ? "0" + _date : _date;
  console.log("Date, month, year:", date, month, year);
  return {
    date,
    month,
    year,
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
  credentials: Credential[];
  selectedCalendars: SelectedCalendar[];
};

type Credential = { key: string; type: string };
type SelectedCalendar = {
  integration: string;
  externalId: string;
};

type EventType = {
  id: number;
  title?: string;
  length: number;
  periodType: PeriodType;
  slotInterval: number;
  minimumBookingNotice: number;
  seatsPerTimeSlot: number | null;
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
  usersConnect?: { id: number }[];
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
      const newUserCreate = { ...userCreate, ...user };
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
      connect: data.usersConnect,
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
  usersConnect?: { id: number }[];
}) {
  if (!data.eventType.userId) {
    data.eventType.userId =
      (data.users ? data.users[0]?.id : null) || data.usersConnect ? data.usersConnect[0]?.id : null;
  }
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

beforeEach(async () => {
  await prisma.eventType.deleteMany();
  await prisma.user.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.selectedCalendar.deleteMany();
  await prisma.credential.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.app.deleteMany();
});

describe("getSchedule", () => {
  test("correctly identifies unavailable slots from Cal Bookings", async () => {
    // An event with one accepted booking
    await createBookingScenario({
      eventType: {
        id: 36837,
        minimumBookingNotice: 1440,
        length: 30,
        slotInterval: 45,
        periodType: "UNLIMITED" as PeriodType,
        seatsPerTimeSlot: null,
      },
      booking: {
        status: "ACCEPTED",
        startTime: "2022-07-17T04:00:00.000Z",
        endTime: "2022-07-17T04:15:00.000Z",
      },
    });

    // Get schedule for a day which has no booking
    const schedule1 = await getSchedule(
      {
        eventTypeId: 36837,
        startTime: "2022-07-12T18:30:00.000Z",
        endTime: "2022-07-13T18:29:59.999Z",
        timeZone: "Asia/Kolkata",
      },
      ctx
    );
    expect(schedule1.slots["2022-07-13"].map((slot) => slot.time)).toEqual([
      "2022-07-13T04:00:00.000Z",
      "2022-07-13T04:45:00.000Z",
      "2022-07-13T05:30:00.000Z",
      "2022-07-13T06:15:00.000Z",
      "2022-07-13T07:00:00.000Z",
      "2022-07-13T07:45:00.000Z",
      "2022-07-13T08:30:00.000Z",
      "2022-07-13T09:15:00.000Z",
      "2022-07-13T10:00:00.000Z",
      "2022-07-13T10:45:00.000Z",
      "2022-07-13T11:30:00.000Z",
    ]);

    // Get schedule for a day which has 1 booking
    // const schedule2 = await getSchedule(
    //   {
    //     eventTypeId: 36837,
    //     startTime: "2022-07-16T18:30:00.000Z",
    //     endTime: "2022-07-17T18:29:59.999Z",
    //     timeZone: "Asia/Kolkata", // GMT+5:30
    //   },
    //   ctx
    // );

    // expect(schedule2.slots["2022-07-17"].map((slot) => slot.time)).toEqual([
    //   "2022-07-17T04:45:00.000Z",
    //   "2022-07-17T05:30:00.000Z",
    //   "2022-07-17T06:15:00.000Z",
    //   "2022-07-17T07:00:00.000Z",
    //   "2022-07-17T07:45:00.000Z",
    //   "2022-07-17T08:30:00.000Z",
    //   "2022-07-17T09:15:00.000Z",
    //   "2022-07-17T10:00:00.000Z",
    //   "2022-07-17T10:45:00.000Z",
    //   "2022-07-17T11:30:00.000Z",
    // ]);
  });

  test("correctly identifies unavailable slots from calendar", async () => {
    // An event with one accepted booking
    await createBookingScenario({
      eventType: {
        id: 36837,
        minimumBookingNotice: 1440,
        length: 30,
        slotInterval: 45,
        periodType: "UNLIMITED" as PeriodType,
        seatsPerTimeSlot: null,
      },
      apps: [
        {
          slug: "google-calendar",
          dirName: "whatever",
          keys: {
            expiry_date: Infinity,
            client_id: "client_id",
            client_secret: "client_secret",
            redirect_uris: ["http://localhost:3000/auth/callback"],
          },
        },
      ],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [
        {
          integration: "google_calendar",
          externalId: "john@example.com",
        },
      ],
      booking: {
        status: "ACCEPTED",
        startTime: "2022-07-17T04:00:00.000Z",
        endTime: "2022-07-17T04:15:00.000Z",
      },
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
                start: "2022-07-11T04:30:00.000Z",
                end: "2022-07-11T23:00:00.000Z",
              },
            ],
          },
        ],
      });

    // Get schedule for a day which has google calendar bookings
    const schedule1 = await getSchedule(
      {
        eventTypeId: 36837,
        startTime: "2022-07-10T18:30:00.000Z",
        endTime: "2022-07-11T18:29:59.999Z",
        timeZone: "Asia/Kolkata",
      },
      ctx
    );

    // As per Google Calendar Availability, only 4PM GMT slot would be available
    expect(schedule1.slots["2022-07-11"].map((slot) => slot.time)).toEqual(["2022-07-11T04:00:00.000Z"]);
  });

  describe("Team Event", async () => {
    test.only("correctly identifies unavailable slots from calendar", async () => {
      const { year, date, month } = getDate();
      const { date: plus1Date, month: plus1Month, year: plus1Year } = getDate({ dateIncrement: 1 });
      const { date: plus2Date, month: plus2Month, year: plus2Year } = getDate({ dateIncrement: 2 });

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
          startTime: `${plus2Year}-${plus2Month}-${plus2Date}T04:00:00.000Z`,
          endTime: `${plus2Year}-${plus2Month}-${plus2Date}T04:15:00.000Z`,
        },
      });

      // // Get schedule for a day which has no booking
      // const schedule1 = await getSchedule(
      //   {
      //     eventTypeId: 1,
      //     startTime: `${year}-${month}-${date}T18:30:00.000Z`,
      //     endTime: `${year}-${month}-${plus1Date}T18:29:59.999Z`,
      //     timeZone: "Asia/Kolkata",
      //   },
      //   ctx
      // );

      // expect(schedule1).toHaveTimeSlots(
      //   [
      //     `04:00:00.000Z`,
      //     `04:45:00.000Z`,
      //     `05:30:00.000Z`,
      //     `06:15:00.000Z`,
      //     `07:00:00.000Z`,
      //     `07:45:00.000Z`,
      //     `08:30:00.000Z`,
      //     `09:15:00.000Z`,
      //     `10:00:00.000Z`,
      //     `10:45:00.000Z`,
      //     `11:30:00.000Z`,
      //   ],
      //   {
      //     date: plus1Date,
      //     month: plus1Month,
      //     year: plus1Year,
      //   }
      // );

      // const schedule2 = await getSchedule(
      //   {
      //     eventTypeId: 1,
      //     startTime: `${plus1Year}-${plus1Month}-${plus1Date}T18:30:00.000Z`,
      //     endTime: `${plus2Year}-${plus2Month}-${plus2Date}T18:29:59.999Z`,
      //     timeZone: "Asia/Kolkata",
      //   },
      //   ctx
      // );

      // expect(schedule2).toHaveTimeSlots(
      //   [
      //     `04:45:00.000Z`,
      //     `05:30:00.000Z`,
      //     `06:15:00.000Z`,
      //     `07:00:00.000Z`,
      //     `07:45:00.000Z`,
      //     `08:30:00.000Z`,
      //     `09:15:00.000Z`,
      //     `10:00:00.000Z`,
      //     `10:45:00.000Z`,
      //     `11:30:00.000Z`,
      //   ],
      //   { year: plus2Year, month: plus2Month, date: plus2Date }
      // );

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
        usersConnect: [
          {
            id: teamEventType.users[1].id,
          },
        ],
        booking: {
          status: "ACCEPTED",
          startTime: `${plus2Year}-${plus2Month}-${plus2Date}T05:30:00.000Z`,
          endTime: `${plus2Year}-${plus2Month}-${plus2Date}T05:45:00.000Z`,
        },
      });

      console.log(
        "CREATED EVENT",
        await prisma.eventType.findUnique({
          where: { id: 2 },
          include: {
            users: true,
          },
        })
      );

      const schedule3 = await getSchedule(
        {
          eventTypeId: 1,
          startTime: `${plus1Year}-${plus1Month}-${plus1Date}T18:30:00.000Z`,
          endTime: `${plus2Year}-${plus2Month}-${plus2Date}T18:29:59.999Z`,
          timeZone: "Asia/Kolkata",
        },
        ctx
      );

      expect(schedule3).toHaveTimeSlots(
        [
          `04:45:00.000Z`,
          `06:15:00.000Z`,
          `07:00:00.000Z`,
          `07:45:00.000Z`,
          `08:30:00.000Z`,
          `09:15:00.000Z`,
          `10:00:00.000Z`,
          `10:45:00.000Z`,
          `11:30:00.000Z`,
        ],
        { year: plus2Year, month: plus2Month, date: plus2Date }
      );
    });
  });
});
