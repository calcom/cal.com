import { faker } from "@faker-js/faker";
import type { Booking, EventType, Prisma, Webhook } from "@prisma/client";

import { BookingStatus } from "@calcom/prisma/enums";
import type { CalendarEvent, Person, VideoCallData } from "@calcom/types/Calendar";

export const buildVideoCallData = (callData?: Partial<VideoCallData>): VideoCallData => {
  return {
    type: faker.helpers.arrayElement(["zoom_video", "stream_video"]),
    id: faker.datatype.uuid(),
    password: faker.internet.password(),
    url: faker.internet.url(),
    ...callData,
  };
};

export const buildPerson = (person?: Partial<Person>): Person => {
  return {
    name: faker.name.firstName(),
    email: faker.internet.email(),
    timeZone: faker.address.timeZone(),
    username: faker.internet.userName(),
    id: faker.datatype.number(),
    language: {
      locale: faker.random.locale(),
      translate: (key: string) => key,
    },
    ...person,
  };
};

export const buildBooking = (booking?: Partial<Booking>): Booking => {
  return {
    id: faker.datatype.number(),
    uid: faker.datatype.uuid(),
    userId: null,
    eventTypeId: null,
    title: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    customInputs: null,
    startTime: faker.date.future(),
    endTime: faker.date.future(),
    location: null,
    createdAt: new Date(),
    updatedAt: null,
    status: BookingStatus.ACCEPTED,
    paid: false,
    destinationCalendarId: null,
    cancellationReason: null,
    rejectionReason: null,
    dynamicEventSlugRef: null,
    dynamicGroupSlugRef: null,
    rescheduled: null,
    fromReschedule: null,
    recurringEventId: null,
    smsReminderNumber: null,
    scheduledJobs: [],
    metadata: null,
    responses: null,
    isRecorded: false,
    ...booking,
  };
};

export const buildEventType = (eventType?: Partial<EventType>): EventType => {
  return {
    id: faker.datatype.number(),
    title: faker.lorem.sentence(),
    slug: faker.lorem.slug(),
    description: faker.lorem.paragraph(),
    position: 1,
    locations: null,
    length: 15,
    offsetStart: 0,
    hidden: false,
    userId: null,
    teamId: null,
    eventName: faker.lorem.words(),
    timeZone: null,
    periodType: "UNLIMITED",
    periodStartDate: null,
    periodEndDate: null,
    periodDays: null,
    periodCountCalendarDays: null,
    recurringEvent: null,
    requiresConfirmation: false,
    disableGuests: false,
    hideCalendarNotes: false,
    minimumBookingNotice: 120,
    beforeEventBuffer: 0,
    afterEventBuffer: 0,
    seatsPerTimeSlot: null,
    seatsShowAttendees: null,
    schedulingType: null,
    scheduleId: null,
    bookingLimits: null,
    durationLimits: null,
    price: 0,
    currency: "usd",
    slotInterval: null,
    metadata: null,
    successRedirectUrl: null,
    bookingFields: [],
    parentId: null,
    ...eventType,
  };
};

export const buildWebhook = (webhook?: Partial<Webhook>): Webhook => {
  return {
    id: faker.datatype.uuid(),
    eventTypeId: faker.datatype.number(),
    subscriberUrl: "http://mockedURL.com",
    payloadTemplate: null,
    createdAt: faker.datatype.datetime(),
    appId: null,
    userId: null,
    secret: faker.lorem.slug(),
    active: true,
    eventTriggers: [],
    ...webhook,
  };
};

export const buildSubscriberEvent = (booking?: Partial<Booking>) => {
  return {
    type: booking?.title || "",
    title: booking?.title,
    description: "",
    additionalNotes: "",
    customInputs: {},
    startTime: booking?.startTime,
    endTime: booking?.endTime,
    organizer: {
      name: "",
      email: "",
      timeZone: "",
      language: {
        locale: "en",
      },
    },
    attendees: [],
    location: "",
    destinationCalendar: null,
    hideCalendar: false,
    uid: booking?.uid,
    metadata: {},
  };
};

export const buildCalendarEvent = (event?: Partial<CalendarEvent>): CalendarEvent => {
  return {
    uid: faker.datatype.uuid(),
    type: faker.helpers.arrayElement(["event", "meeting"]),
    title: faker.lorem.sentence(),
    startTime: faker.date.future().toISOString(),
    endTime: faker.date.future().toISOString(),
    location: faker.address.city(),
    description: faker.lorem.paragraph(),
    attendees: [],
    customInputs: {},
    additionalNotes: faker.lorem.paragraph(),
    organizer: buildPerson(),
    videoCallData: buildVideoCallData(),
    ...event,
  };
};

type UserPayload = Prisma.UserGetPayload<{
  include: {
    credentials: true;
    destinationCalendar: true;
    availability: true;
    selectedCalendars: true;
    schedules: true;
  };
}>;
export const buildUser = <T extends Partial<UserPayload>>(user?: T): UserPayload => {
  return {
    name: faker.name.firstName(),
    email: faker.internet.email(),
    timeZone: faker.address.timeZone(),
    username: faker.internet.userName(),
    id: 0,
    allowDynamicBooking: true,
    availability: [],
    avatar: "",
    away: false,
    bio: null,
    brandColor: "#292929",
    bufferTime: 0,
    completedOnboarding: false,
    createdDate: new Date(),
    credentials: [],
    darkBrandColor: "#fafafa",
    defaultScheduleId: null,
    destinationCalendar: null,
    disableImpersonation: false,
    emailVerified: null,
    endTime: 0,
    hideBranding: true,
    identityProvider: "CAL",
    identityProviderId: null,
    invitedTo: null,
    locale: "en",
    metadata: null,
    password: null,
    role: "USER",
    schedules: [],
    selectedCalendars: [],
    startTime: 0,
    theme: null,
    timeFormat: null,
    trialEndsAt: null,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    verified: false,
    weekStart: "",
    ...user,
  };
};
