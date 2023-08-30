import type {
  EventType as PrismaEventType,
  User as PrismaUser,
  Booking as PrismaBooking,
  App as PrismaApp,
} from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import logger from "@calcom/lib/logger";
import type { SchedulingType } from "@calcom/prisma/enums";
import type { BookingStatus } from "@calcom/prisma/enums";

import type CalendarManagerMock from "../../../../tests/libs/__mocks__/CalendarManager";
import prismaMock from "../../../../tests/libs/__mocks__/prisma";

type App = {
  slug: string;
  dirName: string;
};

type ScenarioData = {
  hosts: { id: number; eventTypeId?: number; userId?: number; isFixed?: boolean }[];
  eventTypes: InputEventType[];
  users: InputUser[];
  apps?: App[];
  bookings?: InputBooking[];
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
      startTime: Date;
      endTime: Date;
      date: string | null;
    }[];
    timeZone: string;
  }[];
};

type InputEventType = {
  id: number;
  title?: string;
  length?: number;
  offsetStart?: number;
  slotInterval?: number;
  minimumBookingNotice?: number;
  users?: { id: number }[];
  hosts?: { id: number }[];
  schedulingType?: SchedulingType;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
};

type InputBooking = {
  userId?: number;
  eventTypeId: number;
  startTime: string;
  endTime: string;
  title?: string;
  status: BookingStatus;
  attendees?: { email: string }[];
};

const Timezones = {
  "+5:30": "Asia/Kolkata",
  "+6:00": "Asia/Dhaka",
};

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
    offsetStart: 0,
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
    const users =
      eventType.users?.map((userWithJustId) => {
        return usersStore.find((user) => user.id === userWithJustId.id);
      }) || [];
    return {
      ...baseEventType,
      ...eventType,
      workflows: [],
      users,
    };
  });

  logger.silly("TestData: Creating EventType", eventTypes);
  const eventTypeMock = ({ where }) => {
    return new Promise((resolve) => {
      const eventType = eventTypesWithUsers.find((e) => e.id === where.id) as unknown as PrismaEventType & {
        users: PrismaUser[];
      };
      resolve(eventType);
    });
  };
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  prismaMock.eventType.findUnique.mockImplementation(eventTypeMock);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  prismaMock.eventType.findUniqueOrThrow.mockImplementation(eventTypeMock);
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
            /**
             * A user is considered busy within a given time period if there
             * is a booking they own OR host. This function mocks some of the logic
             * for each condition. For details see the following ticket:
             * https://github.com/calcom/cal.com/issues/6374
             */

            // ~~ FIRST CONDITION ensures that this booking is owned by this user
            //    and that the status is what we want
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const statusIn = where.OR[0].status?.in || [];
            const firstConditionMatches =
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              statusIn.includes(booking.status) && booking.userId === where.OR[0].userId;

            // We return this booking if either condition is met
            return firstConditionMatches;
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

async function addWebhooks() {
  prismaMock.webhook.findMany.mockResolvedValue([]);
}

function addUsers(users: InputUser[]) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  prismaMock.user.findUniqueOrThrow.mockImplementation((findUniqueArgs) => {
    return new Promise((resolve) => {
      resolve({
        email: `IntegrationTestUser${findUniqueArgs?.where.id}@example.com`,
      } as unknown as PrismaUser);
    });
  });

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

export function createBookingScenario(data: ScenarioData) {
  logger.silly("TestData: Creating Scenario", data);

  addUsers(data.users);

  const eventType = addEventTypes(data.eventTypes, data.users);
  if (data.apps) {
    prismaMock.app.findMany.mockResolvedValue(data.apps as PrismaApp[]);
    const appMock = ({ where: { slug: whereSlug } }) => {
      return new Promise((resolve) => {
        if (!data.apps) {
          resolve(null);
          return;
        }

        const foundApp = data.apps.find(({ slug }) => slug == whereSlug);
        //TODO: Pass just the app name in data.apps and maintain apps in a separate object or load them dyamically
        resolve(
          ({
            ...foundApp,
            enabled: true,
          } as PrismaApp) || null
        );
      });
    };
    // FIXME: How do we know which app to return?
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    prismaMock.app.findUnique.mockImplementation(appMock);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    prismaMock.app.findFirst.mockImplementation(appMock);
  }
  data.bookings = data.bookings || [];
  allowSuccessfulBookingCreation();
  addBookings(data.bookings, data.eventTypes);
  // mockBusyCalendarTimes([]);
  addWebhooks();
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
export const getDate = (
  param: { dateIncrement?: number; monthIncrement?: number; yearIncrement?: number } = {}
) => {
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

export function getGoogleCalendarCredential() {
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

export const TestData = {
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
          startTime: new Date(`1970-01-01T14:00:00.000Z`),
          endTime: new Date(`1970-01-01T18:00:00.000Z`),
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
    dailyVideo: {
      slug: "daily-video",
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

function allowSuccessfulBookingCreation() {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  prismaMock.booking.create.mockImplementation(function (booking) {
    return booking.data;
  });
}

// FIXME: This has to be per user.
// Also, can we not mock Google Calendar Itself?
export function mockBusyCalendarTimes(
  busyTimes: Awaited<ReturnType<typeof CalendarManagerMock.getBusyCalendarTimes>>
) {
  // return CalendarManagerMock.getBusyCalendarTimes.mockResolvedValue(busyTimes);
}
