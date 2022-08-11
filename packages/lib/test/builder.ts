import { faker } from "@faker-js/faker";

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
