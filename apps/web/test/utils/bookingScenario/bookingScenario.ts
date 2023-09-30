import appStoreMock from "../../../../../tests/libs/__mocks__/app-store";
import i18nMock from "../../../../../tests/libs/__mocks__/libServerI18n";
import prismock from "../../../../../tests/libs/__mocks__/prisma";

import type { Prisma } from "@prisma/client";
import type { WebhookTriggerEvents } from "@prisma/client";
import type Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import "vitest-fetch-mock";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { handleStripePaymentSuccess } from "@calcom/features/ee/payments/api/webhook";
import type { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import type { SchedulingType } from "@calcom/prisma/enums";
import type { BookingStatus } from "@calcom/prisma/enums";
import type { NewCalendarEventType } from "@calcom/types/Calendar";
import type { EventBusyDate } from "@calcom/types/Calendar";

import { getMockPaymentService } from "./MockPaymentService";

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
  destinationCalendar?: Prisma.DestinationCalendarCreateInput;
};

export type InputEventType = {
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
  destinationCalendar?: Prisma.DestinationCalendarCreateInput;
} & Partial<Omit<Prisma.EventTypeCreateInput, "users">>;

type InputBooking = {
  id?: number;
  uid?: string;
  userId?: number;
  eventTypeId: number;
  startTime: string;
  endTime: string;
  title?: string;
  status: BookingStatus;
  attendees?: { email: string }[];
  references?: {
    type: string;
    uid: string;
    meetingId?: string;
    meetingPassword?: string;
    meetingUrl?: string;
    bookingId?: number;
    externalCalendarId?: string;
    deleted?: boolean;
    credentialId?: number;
  }[];
};

const Timezones = {
  "+5:30": "Asia/Kolkata",
  "+6:00": "Asia/Dhaka",
};
logger.setSettings({ minLevel: "silly" });

async function addEventTypesToDb(
  eventTypes: (Omit<Prisma.EventTypeCreateInput, "users" | "worflows" | "destinationCalendar"> & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    users?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    workflows?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    destinationCalendar?: any;
  })[]
) {
  logger.silly("TestData: Add EventTypes to DB", JSON.stringify(eventTypes));
  await prismock.eventType.createMany({
    data: eventTypes,
  });
  logger.silly(
    "TestData: All EventTypes in DB are",
    JSON.stringify({
      eventTypes: await prismock.eventType.findMany({
        include: {
          users: true,
          workflows: true,
          destinationCalendar: true,
        },
      }),
    })
  );
}

async function addEventTypes(eventTypes: InputEventType[], usersStore: InputUser[]) {
  const baseEventType = {
    title: "Base EventType Title",
    slug: "base-event-type-slug",
    timeZone: null,
    beforeEventBuffer: 0,
    afterEventBuffer: 0,
    schedulingType: null,
    length: 15,
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
      destinationCalendar: eventType.destinationCalendar
        ? {
            create: eventType.destinationCalendar,
          }
        : eventType.destinationCalendar,
    };
  });
  logger.silly("TestData: Creating EventType", JSON.stringify(eventTypesWithUsers));
  await addEventTypesToDb(eventTypesWithUsers);
}

function addBookingReferencesToDB(bookingReferences: Prisma.BookingReferenceCreateManyInput[]) {
  prismock.bookingReference.createMany({
    data: bookingReferences,
  });
}

async function addBookingsToDb(
  bookings: (Prisma.BookingCreateInput & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    references: any[];
  })[]
) {
  await prismock.booking.createMany({
    data: bookings,
  });
  logger.silly(
    "TestData: Booking as in DB",
    JSON.stringify({
      bookings: await prismock.booking.findMany({
        include: {
          references: true,
        },
      }),
    })
  );
}

async function addBookings(bookings: InputBooking[]) {
  logger.silly("TestData: Creating Bookings", JSON.stringify(bookings));
  const allBookings = [...bookings].map((booking) => {
    if (booking.references) {
      addBookingReferencesToDB(
        booking.references.map((reference) => {
          return {
            ...reference,
            bookingId: booking.id,
          };
        })
      );
    }
    return {
      uid: uuidv4(),
      workflowReminders: [],
      references: [],
      title: "Test Booking Title",
      ...booking,
    };
  });

  await addBookingsToDb(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    allBookings.map((booking) => {
      const bookingCreate = booking;
      if (booking.references) {
        bookingCreate.references = {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          createMany: {
            data: booking.references,
          },
        };
      }
      return bookingCreate;
    })
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function addWebhooksToDb(webhooks: any[]) {
  await prismock.webhook.createMany({
    data: webhooks,
  });
}

async function addWebhooks(webhooks: InputWebhook[]) {
  logger.silly("TestData: Creating Webhooks", webhooks);

  await addWebhooksToDb(webhooks);
}

async function addUsersToDb(users: (Prisma.UserCreateInput & { schedules: Prisma.ScheduleCreateInput[] })[]) {
  logger.silly("TestData: Creating Users", JSON.stringify(users));
  await prismock.user.createMany({
    data: users,
  });
  logger.silly("Added users to Db", {
    allUsers: await prismock.user.findMany(),
  });
}

async function addUsers(users: InputUser[]) {
  const prismaUsersCreate = users.map((user) => {
    const newUser = user;
    if (user.schedules) {
      newUser.schedules = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        createMany: {
          data: user.schedules.map((schedule) => {
            return {
              ...schedule,
              availability: {
                createMany: {
                  data: schedule.availability,
                },
              },
            };
          }),
        },
      };
    }
    if (user.credentials) {
      newUser.credentials = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        createMany: {
          data: user.credentials,
        },
      };
    }
    if (user.selectedCalendars) {
      newUser.selectedCalendars = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        createMany: {
          data: user.selectedCalendars,
        },
      };
    }
    return newUser;
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  await addUsersToDb(prismaUsersCreate);
}

export async function createBookingScenario(data: ScenarioData) {
  logger.silly("TestData: Creating Scenario", JSON.stringify({ data }));
  await addUsers(data.users);

  const eventType = await addEventTypes(data.eventTypes, data.users);
  if (data.apps) {
    prismock.app.createMany({
      data: data.apps,
    });
  }
  data.bookings = data.bookings || [];
  // allowSuccessfulBookingCreation();
  await addBookings(data.bookings);
  // mockBusyCalendarTimes([]);
  await addWebhooks(data.webhooks || []);
  // addPaymentMock();
  return {
    eventType,
  };
}

// async function addPaymentsToDb(payments: Prisma.PaymentCreateInput[]) {
//   await prismaMock.payment.createMany({
//     data: payments,
//   });
// }

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
  const app = appStoreMetadata[metadataLookupKey as keyof typeof appStoreMetadata];
  return {
    type: app.type,
    appId: app.slug,
    app: app,
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
      scope: "meeting:write",
    },
  });
}

export function getStripeAppCredential() {
  return getMockedCredential({
    metadataLookupKey: "stripepayment",
    key: {
      scope: "read_write",
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
      enabled: true,
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
      enabled: true,
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
    zoomvideo: {
      slug: "zoom",
      enabled: true,
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
    "stripe-payment": {
      //TODO: Read from appStoreMeta
      slug: "stripe",
      enabled: true,
      dirName: "stripepayment",
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
  destinationCalendar,
}: {
  name: string;
  email: string;
  id: number;
  schedules: InputUser["schedules"];
  credentials?: InputCredential[];
  selectedCalendars?: InputSelectedCalendar[];
  destinationCalendar?: Prisma.DestinationCalendarCreateInput;
}) {
  return {
    ...TestData.users.example,
    name,
    email,
    id,
    schedules,
    credentials,
    selectedCalendars,
    destinationCalendar,
  };
}

export function getScenarioData({
  organizer,
  eventTypes,
  usersApartFromOrganizer = [],
  apps = [],
  webhooks,
  bookings,
}: // hosts = [],
{
  organizer: ReturnType<typeof getOrganizer>;
  eventTypes: ScenarioData["eventTypes"];
  apps?: ScenarioData["apps"];
  usersApartFromOrganizer?: ScenarioData["users"];
  webhooks?: ScenarioData["webhooks"];
  bookings?: ScenarioData["bookings"];
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
    eventTypes: eventTypes.map((eventType, index) => {
      return {
        ...eventType,
        title: `Test Event Type - ${index + 1}`,
        description: `It's a test event type - ${index + 1}`,
      };
    }),
    users: users.map((user) => {
      const newUser = {
        ...user,
      };
      if (user.destinationCalendar) {
        newUser.destinationCalendar = {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          create: user.destinationCalendar,
        };
      }
      return newUser;
    }),
    apps: [...apps],
    webhooks,
    bookings: bookings || [],
  };
}

export function enableEmailFeature() {
  prismock.feature.create({
    data: {
      slug: "emails",
      enabled: false,
      type: "KILL_SWITCH",
    },
  });
}

export function mockNoTranslations() {
  // @ts-expect-error FIXME
  i18nMock.getTranslation.mockImplementation(() => {
    return new Promise((resolve) => {
      const identityFn = (key: string) => key;
      resolve(identityFn);
    });
  });
}

/**
 * @param metadataLookupKey
 * @param calendarData Specify uids and other data to be faked to be returned by createEvent and updateEvent
 */
export function mockCalendar(
  metadataLookupKey: keyof typeof appStoreMetadata,
  calendarData?: {
    create?: {
      uid?: string;
    };
    update?: {
      uid: string;
    };
    busySlots?: { start: `${string}Z`; end: `${string}Z` }[];
    creationCrash?: boolean;
    updationCrash?: boolean;
    getAvailabilityCrash?: boolean;
  }
) {
  const appStoreLookupKey = metadataLookupKey;
  const normalizedCalendarData = calendarData || {
    create: {
      uid: "MOCK_ID",
    },
    update: {
      uid: "UPDATED_MOCK_ID",
    },
  };
  logger.silly(`Mocking ${appStoreLookupKey} on appStoreMock`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createEventCalls: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateEventCalls: any[] = [];
  const app = appStoreMetadata[metadataLookupKey as keyof typeof appStoreMetadata];
  appStoreMock.default[appStoreLookupKey as keyof typeof appStoreMock.default].mockResolvedValue({
    lib: {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      CalendarService: function MockCalendarService() {
        return {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          createEvent: async function (...rest: any[]): Promise<NewCalendarEventType> {
            if (calendarData?.creationCrash) {
              throw new Error("MockCalendarService.createEvent fake error");
            }
            const [calEvent, credentialId] = rest;
            logger.silly("mockCalendar.createEvent", JSON.stringify({ calEvent, credentialId }));
            createEventCalls.push(rest);
            return Promise.resolve({
              type: app.type,
              additionalInfo: {},
              uid: "PROBABLY_UNUSED_UID",
              id: normalizedCalendarData.create?.uid || "FALLBACK_MOCK_ID",
              // Password and URL seems useless for CalendarService, plan to remove them if that's the case
              password: "MOCK_PASSWORD",
              url: "https://UNUSED_URL",
            });
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          updateEvent: async function (...rest: any[]): Promise<NewCalendarEventType> {
            if (calendarData?.updationCrash) {
              throw new Error("MockCalendarService.updateEvent fake error");
            }
            const [uid, event, externalCalendarId] = rest;
            logger.silly("mockCalendar.updateEvent", JSON.stringify({ uid, event, externalCalendarId }));
            // eslint-disable-next-line prefer-rest-params
            updateEventCalls.push(rest);
            return Promise.resolve({
              type: app.type,
              additionalInfo: {},
              uid: "PROBABLY_UNUSED_UID",
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              id: normalizedCalendarData.update?.uid || "FALLBACK_MOCK_ID",
              // Password and URL seems useless for CalendarService, plan to remove them if that's the case
              password: "MOCK_PASSWORD",
              url: "https://UNUSED_URL",
            });
          },
          getAvailability: async (): Promise<EventBusyDate[]> => {
            if (calendarData?.getAvailabilityCrash) {
              throw new Error("MockCalendarService.getAvailability fake error");
            }
            return new Promise((resolve) => {
              resolve(calendarData?.busySlots || []);
            });
          },
        };
      },
    },
  });
  return {
    createEventCalls,
    updateEventCalls,
  };
}

export function mockCalendarToHaveNoBusySlots(
  metadataLookupKey: keyof typeof appStoreMetadata,
  calendarData?: {
    create: {
      uid?: string;
    };
    update?: {
      uid: string;
    };
  }
) {
  calendarData = calendarData || {
    create: {
      uid: "MOCK_ID",
    },
    update: {
      uid: "UPDATED_MOCK_ID",
    },
  };
  return mockCalendar(metadataLookupKey, { ...calendarData, busySlots: [] });
}

export function mockCalendarToCrashOnCreateEvent(metadataLookupKey: keyof typeof appStoreMetadata) {
  return mockCalendar(metadataLookupKey, { creationCrash: true });
}

export function mockCalendarToCrashOnUpdateEvent(metadataLookupKey: keyof typeof appStoreMetadata) {
  return mockCalendar(metadataLookupKey, { updationCrash: true });
}

export function mockVideoApp({
  metadataLookupKey,
  appStoreLookupKey,
  videoMeetingData,
  creationCrash,
  updationCrash,
}: {
  metadataLookupKey: string;
  appStoreLookupKey?: string;
  videoMeetingData?: {
    password: string;
    id: string;
    url: string;
  };
  creationCrash?: boolean;
  updationCrash?: boolean;
}) {
  appStoreLookupKey = appStoreLookupKey || metadataLookupKey;
  videoMeetingData = videoMeetingData || {
    id: "MOCK_ID",
    password: "MOCK_PASS",
    url: `http://mock-${metadataLookupKey}.example.com`,
  };
  logger.silly(
    "mockSuccessfulVideoMeetingCreation",
    JSON.stringify({ metadataLookupKey, appStoreLookupKey })
  );
  const createMeetingCalls: any[] = [];
  const updateMeetingCalls: any[] = [];
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  appStoreMock.default[appStoreLookupKey as keyof typeof appStoreMock.default].mockImplementation(() => {
    return new Promise((resolve) => {
      resolve({
        lib: {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          VideoApiAdapter: () => ({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            createMeeting: (...rest: any[]) => {
              if (creationCrash) {
                throw new Error("MockVideoApiAdapter.createMeeting fake error");
              }
              createMeetingCalls.push(rest);

              return Promise.resolve({
                type: appStoreMetadata[metadataLookupKey as keyof typeof appStoreMetadata].type,
                ...videoMeetingData,
              });
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            updateMeeting: async (...rest: any[]) => {
              if (updationCrash) {
                throw new Error("MockVideoApiAdapter.updateMeeting fake error");
              }
              const [bookingRef, calEvent] = rest;
              updateMeetingCalls.push(rest);
              if (!bookingRef.type) {
                throw new Error("bookingRef.type is not defined");
              }
              if (!calEvent.organizer) {
                throw new Error("calEvent.organizer is not defined");
              }
              logger.silly(
                "mockSuccessfulVideoMeetingCreation.updateMeeting",
                JSON.stringify({ bookingRef, calEvent })
              );
              return Promise.resolve({
                type: appStoreMetadata[metadataLookupKey as keyof typeof appStoreMetadata].type,
                ...videoMeetingData,
              });
            },
          }),
        },
      });
    });
  });
  return {
    createMeetingCalls,
    updateMeetingCalls,
  };
}

export function mockSuccessfulVideoMeetingCreation({
  metadataLookupKey,
  appStoreLookupKey,
  videoMeetingData,
}: {
  metadataLookupKey: string;
  appStoreLookupKey?: string;
  videoMeetingData?: {
    password: string;
    id: string;
    url: string;
  };
}) {
  return mockVideoApp({
    metadataLookupKey,
    appStoreLookupKey,
    videoMeetingData,
  });
}

export function mockVideoAppToCrashOnCreateMeeting({
  metadataLookupKey,
  appStoreLookupKey,
}: {
  metadataLookupKey: string;
  appStoreLookupKey?: string;
}) {
  return mockVideoApp({
    metadataLookupKey,
    appStoreLookupKey,
    creationCrash: true,
  });
}

export function mockPaymentApp({
  metadataLookupKey,
  appStoreLookupKey,
}: {
  metadataLookupKey: string;
  appStoreLookupKey?: string;
}) {
  appStoreLookupKey = appStoreLookupKey || metadataLookupKey;
  const { paymentUid, externalId, MockPaymentService } = getMockPaymentService();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  appStoreMock.default[appStoreLookupKey as keyof typeof appStoreMock.default].mockImplementation(() => {
    return new Promise((resolve) => {
      resolve({
        lib: {
          PaymentService: MockPaymentService,
        },
      });
    });
  });

  return {
    paymentUid,
    externalId,
  };
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

export function getBooker({ name, email }: { name: string; email: string }) {
  return {
    name,
    email,
  };
}

export function getMockedStripePaymentEvent({ paymentIntentId }: { paymentIntentId: string }) {
  return {
    id: null,
    data: {
      object: {
        id: paymentIntentId,
      },
    },
  } as unknown as Stripe.Event;
}

export async function mockPaymentSuccessWebhookFromStripe({ externalId }: { externalId: string }) {
  let webhookResponse = null;
  try {
    await handleStripePaymentSuccess(getMockedStripePaymentEvent({ paymentIntentId: externalId }));
  } catch (e) {
    logger.silly("mockPaymentSuccessWebhookFromStripe:catch", JSON.stringify(e));

    webhookResponse = e as HttpError;
  }
  return { webhookResponse };
}
