import { faker } from "@faker-js/faker";
import { Prisma, User, UserPlan } from "@prisma/client";

import { CalendarEvent, Person, VideoCallData } from "@calcom/types/Calendar";

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
    id: faker.datatype.uuid(),
    language: {
      locale: faker.random.locale(),
      translate: (key: string) => key,
    },
    ...person,
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
    plan: UserPlan.PRO,
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
