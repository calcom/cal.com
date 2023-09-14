import appStoreMock from "../../../../tests/libs/__mocks__/app-store";
import i18nMock from "../../../../tests/libs/__mocks__/libServerI18n";
import prismaMock from "../../../../tests/libs/__mocks__/prisma";

import type {
  EventType as PrismaEventType,
  User as PrismaUser,
  Booking as PrismaBooking,
  App as PrismaApp,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { WebhookTriggerEvents } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { expect } from "vitest";
import "vitest-fetch-mock";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import logger from "@calcom/lib/logger";
import type { SchedulingType } from "@calcom/prisma/enums";
import type { BookingStatus } from "@calcom/prisma/enums";
import type { EventBusyDate } from "@calcom/types/Calendar";
import type { Fixtures } from "@calcom/web/test/fixtures/fixtures";

type App = {
  slug: string;
  dirName: string;
};

type InputWebhook = {
  appId: string | null;
  userId?: number | null;
  teamId?: number | null;
  eventTypeId?: number;
  active: boolean;
  eventTriggers: WebhookTriggerEvents[];
  subscriberUrl: string;
};
/**
 * Data to be mocked
 */
type ScenarioData = {
  // hosts: { id: number; eventTypeId?: number; userId?: number; isFixed?: boolean }[];
  /**
   * Prisma would return these eventTypes
   */
  eventTypes: InputEventType[];
  /**
   * Prisma would return these users
   */
  users: InputUser[];
  /**
   * Prisma would return these apps
   */
  apps?: App[];
  bookings?: InputBooking[];
  webhooks?: InputWebhook[];
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
  /**
   * These user ids are `ScenarioData["users"]["id"]`
   */
  users?: { id: number }[];
  hosts?: { id: number }[];
  schedulingType?: SchedulingType;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
  requiresConfirmation?: boolean;
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
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
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

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const userIdIn = where.OR[0].userId?.in || [];
            const firstConditionMatches =
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              statusIn.includes(booking.status) &&
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              (booking.userId === where.OR[0].userId || userIdIn.includes(booking.userId));

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

async function addWebhooks(webhooks: InputWebhook[]) {
  prismaMock.webhook.findMany.mockResolvedValue(
    webhooks.map((webhook) => {
      return {
        ...webhook,
        payloadTemplate: null,
        secret: null,
        id: uuidv4(),
        createdAt: new Date(),
        userId: webhook.userId || null,
        eventTypeId: webhook.eventTypeId || null,
        teamId: webhook.teamId || null,
      };
    })
  );
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

export async function createBookingScenario(data: ScenarioData) {
  logger.silly("TestData: Creating Scenario", data);
  addUsers(data.users);

  const eventType = addEventTypes(data.eventTypes, data.users);
  if (data.apps) {
    prismaMock.app.findMany.mockResolvedValue(data.apps as PrismaApp[]);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
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
            ...(foundApp?.slug ? TestData.apps[foundApp.slug as keyof typeof TestData.apps] || {} : {}),
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            categories: [],
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
  addWebhooks(data.webhooks || []);
  return {
    eventType,
  };
}

/**
 * This fn indents to /ally compute day, month, year for the purpose of testing.
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

export function getMockedCredential({
  metadataLookupKey,
  key,
}: {
  metadataLookupKey: string;
  key: {
    expiry_date?: number;
    token_type?: string;
    access_token?: string;
    refresh_token?: string;
    scope: string;
  };
}) {
  return {
    type: appStoreMetadata[metadataLookupKey as keyof typeof appStoreMetadata].type,
    appId: appStoreMetadata[metadataLookupKey as keyof typeof appStoreMetadata].slug,
    key: {
      expiry_date: Date.now() + 1000000,
      token_type: "Bearer",
      access_token: "ACCESS_TOKEN",
      refresh_token: "REFRESH_TOKEN",
      ...key,
    },
  };
}

export function getGoogleCalendarCredential() {
  return getMockedCredential({
    metadataLookupKey: "googlecalendar",
    key: {
      scope:
        "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
    },
  });
}

export function getZoomAppCredential() {
  return getMockedCredential({
    metadataLookupKey: "zoomvideo",
    key: {
      scope: "meeting:writed",
    },
  });
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
      email: "example@example.com",
      username: "example",
      defaultScheduleId: 1,
      timeZone: Timezones["+5:30"],
    },
  },
  apps: {
    "google-calendar": {
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
    "daily-video": {
      slug: "daily-video",
      dirName: "whatever",
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      keys: {
        expiry_date: Infinity,
        api_key: "",
        scale_plan: "false",
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

export class MockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MockError";
  }
}

export function getOrganizer({
  name,
  email,
  id,
  schedules,
  credentials,
  selectedCalendars,
}: {
  name: string;
  email: string;
  id: number;
  schedules: InputUser["schedules"];
  credentials?: InputCredential[];
  selectedCalendars?: InputSelectedCalendar[];
}) {
  return {
    ...TestData.users.example,
    name,
    email,
    id,
    schedules,
    credentials,
    selectedCalendars,
  };
}

export function getScenarioData({
  organizer,
  eventTypes,
  usersApartFromOrganizer = [],
  apps = [],
  webhooks,
}: // hosts = [],
{
  organizer: ReturnType<typeof getOrganizer>;
  eventTypes: ScenarioData["eventTypes"];
  apps: ScenarioData["apps"];
  usersApartFromOrganizer?: ScenarioData["users"];
  webhooks?: ScenarioData["webhooks"];
  // hosts?: ScenarioData["hosts"];
}) {
  const users = [organizer, ...usersApartFromOrganizer];
  eventTypes.forEach((eventType) => {
    if (
      eventType.users?.filter((eventTypeUser) => {
        return !users.find((userToCreate) => userToCreate.id === eventTypeUser.id);
      }).length
    ) {
      throw new Error(`EventType ${eventType.id} has users that are not present in ScenarioData["users"]`);
    }
  });
  return {
    // hosts: [...hosts],
    eventTypes: [...eventTypes],
    users,
    apps: [...apps],
    webhooks,
  };
}

export function mockEnableEmailFeature() {
  prismaMock.feature.findMany.mockResolvedValue([
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    {
      slug: "emails",
      // It's a kill switch
      enabled: false,
    },
  ]);
}

export function mockNoTranslations() {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  i18nMock.getTranslation.mockImplementation(() => {
    return new Promise((resolve) => {
      const identityFn = (key: string) => key;
      resolve(identityFn);
    });
  });
}

export function mockCalendarToHaveNoBusySlots(metadataLookupKey: keyof typeof appStoreMetadata) {
  const appStoreLookupKey = metadataLookupKey;
  appStoreMock.default[appStoreLookupKey as keyof typeof appStoreMock.default].mockResolvedValue({
    lib: {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      CalendarService: function MockCalendarService() {
        return {
          createEvent: () => {
            return Promise.resolve({
              type: "daily_video",
              id: "dailyEventName",
              password: "dailyvideopass",
              url: "http://dailyvideo.example.com",
            });
          },
          getAvailability: (): Promise<EventBusyDate[]> => {
            return new Promise((resolve) => {
              resolve([]);
            });
          },
        };
      },
    },
  });
}

export function mockSuccessfulVideoMeetingCreation({
  metadataLookupKey,
  appStoreLookupKey,
}: {
  metadataLookupKey: string;
  appStoreLookupKey?: string;
}) {
  appStoreLookupKey = appStoreLookupKey || metadataLookupKey;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  appStoreMock.default[appStoreLookupKey as keyof typeof appStoreMock.default].mockImplementation(() => {
    return new Promise((resolve) => {
      resolve({
        lib: {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          VideoApiAdapter: () => ({
            createMeeting: () => {
              return Promise.resolve({
                type: appStoreMetadata[metadataLookupKey as keyof typeof appStoreMetadata].type,
                id: "MOCK_ID",
                password: "MOCK_PASS",
                url: `http://mock-${metadataLookupKey}.example.com`,
              });
            },
          }),
        },
      });
    });
  });
}

export function mockErrorOnVideoMeetingCreation({
  metadataLookupKey,
  appStoreLookupKey,
}: {
  metadataLookupKey: string;
  appStoreLookupKey?: string;
}) {
  appStoreLookupKey = appStoreLookupKey || metadataLookupKey;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  appStoreMock.default[appStoreLookupKey].mockImplementation(() => {
    return new Promise((resolve) => {
      resolve({
        lib: {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          VideoApiAdapter: () => ({
            createMeeting: () => {
              throw new MockError("Error creating Video meeting");
            },
          }),
        },
      });
    });
  });
}

export function expectWebhookToHaveBeenCalledWith(
  subscriberUrl: string,
  data: {
    triggerEvent: WebhookTriggerEvents;
    payload: { metadata: Record<string, unknown>; responses: Record<string, unknown> };
  }
) {
  const fetchCalls = fetchMock.mock.calls;
  const webhookFetchCall = fetchCalls.find((call) => call[0] === subscriberUrl);
  if (!webhookFetchCall) {
    throw new Error(`Webhook not called with ${subscriberUrl}`);
  }
  expect(webhookFetchCall[0]).toBe(subscriberUrl);
  const body = webhookFetchCall[1]?.body;
  const parsedBody = JSON.parse((body as string) || "{}");
  console.log({ payload: parsedBody.payload });
  expect(parsedBody.triggerEvent).toBe(data.triggerEvent);
  parsedBody.payload.metadata.videoCallUrl = parsedBody.payload.metadata.videoCallUrl
    ? parsedBody.payload.metadata.videoCallUrl.replace(/\/video\/[a-zA-Z0-9]{22}/, "/video/DYNAMIC_UID")
    : parsedBody.payload.metadata.videoCallUrl;
  expect(parsedBody.payload.metadata).toContain(data.payload.metadata);
  expect(parsedBody.payload.responses).toEqual(data.payload.responses);
}

export function expectWorkflowToBeTriggered() {
  // TODO: Implement this.
}

export function expectBookingToBeInDatabase(booking: Partial<Prisma.BookingCreateInput>) {
  const createBookingCalledWithArgs = prismaMock.booking.create.mock.calls[0];
  expect(createBookingCalledWithArgs[0].data).toEqual(expect.objectContaining(booking));
}

export function getBooker({ name, email }: { name: string; email: string }) {
  return {
    name,
    email,
  };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveEmail(expectedEmail: { htmlToContain?: string; to: string }): R;
    }
  }
}

expect.extend({
  toHaveEmail(
    testEmail: ReturnType<Fixtures["emails"]["get"]>[number],
    expectedEmail: {
      //TODO: Support email HTML parsing to target specific elements
      htmlToContain?: string;
      to: string;
    }
  ) {
    let isHtmlContained = true;
    let isToAddressExpected = true;
    if (expectedEmail.htmlToContain) {
      isHtmlContained = testEmail.html.includes(expectedEmail.htmlToContain);
    }
    isToAddressExpected = expectedEmail.to === testEmail.to;

    return {
      pass: isHtmlContained && isToAddressExpected,
      message: () => {
        if (!isHtmlContained) {
          return `Email HTML is not as expected. Expected:"${expectedEmail.htmlToContain}" isn't contained in "${testEmail.html}"`;
        }

        return `Email To address is not as expected. Expected:${expectedEmail.to} isn't contained in ${testEmail.to}`;
      },
    };
  },
});
