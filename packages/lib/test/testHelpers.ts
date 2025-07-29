import prismock from "../../../tests/libs/__mocks__/prismaMock";

import { faker } from "@faker-js/faker";
import type { Booking, EventType, User, Credential } from "@prisma/client";
import { vi, expect } from "vitest";

import { BookingStatus, CreationSource } from "@calcom/prisma/enums";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

export class TestScenarioBuilder {
  static booking() {
    return new BookingScenarioBuilder();
  }

  static user() {
    return new UserScenarioBuilder();
  }

  static eventType() {
    return new EventTypeScenarioBuilder();
  }
}

class BookingScenarioBuilder {
  private bookingData: Partial<Booking> = {};
  private userCount = 1;
  private existingBookingsCount = 0;
  private bookingLimits: Record<string, number> = {};
  private eventTypeData: Partial<EventType> = {};

  withUser(userData?: Partial<User>) {
    this.userCount = 1;
    return this;
  }

  withExistingBookings(count: number) {
    this.existingBookingsCount = count;
    return this;
  }

  withBookingLimits(limits: Record<string, number>) {
    this.bookingLimits = limits;
    return this;
  }

  withBookingData(data: Partial<Booking>) {
    this.bookingData = data;
    return this;
  }

  withEventTypeData(data: Partial<EventType>) {
    this.eventTypeData = data;
    return this;
  }

  async create() {
    const user = await createTestUser();
    const eventType = await createTestEventType({
      userId: user.id,
      bookingLimits: this.bookingLimits,
      ...this.eventTypeData,
    });

    const existingBookings = [];
    for (let i = 0; i < this.existingBookingsCount; i++) {
      const booking = await createTestBooking({
        userId: user.id,
        eventTypeId: eventType.id,
        ...this.bookingData,
      });
      existingBookings.push(booking);
    }

    return {
      user,
      eventType,
      existingBookings,
    };
  }
}

class UserScenarioBuilder {
  private userData: Partial<User> = {};
  private credentialsCount = 0;

  withCredentials(count: number) {
    this.credentialsCount = count;
    return this;
  }

  withUserData(data: Partial<User>) {
    this.userData = data;
    return this;
  }

  async create() {
    const user = await createTestUser(this.userData);

    const credentials = [];
    for (let i = 0; i < this.credentialsCount; i++) {
      const credential = await createTestCredential({ userId: user.id });
      credentials.push(credential);
    }

    return {
      user,
      credentials,
    };
  }
}

class EventTypeScenarioBuilder {
  private eventTypeData: Partial<EventType> = {};
  private usersCount = 1;

  withUsers(count: number) {
    this.usersCount = count;
    return this;
  }

  withEventTypeData(data: Partial<EventType>) {
    this.eventTypeData = data;
    return this;
  }

  async create() {
    const users = [];
    for (let i = 0; i < this.usersCount; i++) {
      const user = await createTestUser();
      users.push(user);
    }

    const eventType = await createTestEventType({
      userId: users[0].id,
      ...this.eventTypeData,
    });

    return {
      eventType,
      users,
    };
  }
}

export const createTestUser = async (userData: Partial<User> = {}): Promise<User> => {
  const defaultUser = {
    email: faker.internet.email(),
    name: faker.name.fullName(),
    username: faker.internet.userName(),
    timeZone: "UTC",
    weekStart: "SUNDAY",
    createdDate: new Date(),
    ...userData,
  };

  return await prismock.user.create({
    data: defaultUser,
  });
};

export const createTestEventType = async (eventTypeData: Partial<EventType> = {}): Promise<EventType> => {
  const defaultEventType = {
    title: faker.lorem.words(3),
    slug: faker.lorem.slug(),
    description: faker.lorem.paragraph(),
    length: 30,
    position: 1,
    hidden: false,
    requiresConfirmation: false,
    disableGuests: false,
    minimumBookingNotice: 120,
    beforeEventBuffer: 0,
    afterEventBuffer: 0,
    price: 0,
    currency: "usd",
    ...eventTypeData,
  };

  return await prismock.eventType.create({
    data: defaultEventType,
  });
};

export const createTestBooking = async (bookingData: Partial<Booking> = {}): Promise<Booking> => {
  const uid = faker.datatype.uuid();
  const defaultBooking = {
    uid,
    title: faker.lorem.words(3),
    description: faker.lorem.paragraph(),
    startTime: faker.date.future(),
    endTime: faker.date.future(),
    status: BookingStatus.ACCEPTED,
    paid: false,
    createdAt: new Date(),
    creationSource: CreationSource.WEBAPP,
    iCalUID: `${uid}@cal.com`,
    iCalSequence: 0,
    ...bookingData,
  };

  return await prismock.booking.create({
    data: defaultBooking,
  });
};

export const createTestCredential = async (credentialData: Partial<Credential> = {}): Promise<Credential> => {
  const defaultCredential = {
    type: "google_calendar",
    key: { access_token: faker.random.alphaNumeric(32) },
    invalid: false,
    ...credentialData,
  };

  return await prismock.credential.create({
    data: defaultCredential,
  });
};

export const createMockCalendarService = (overrides = {}) => ({
  createEvent: vi.fn().mockResolvedValue({
    id: faker.datatype.uuid(),
    url: faker.internet.url(),
  }),
  updateEvent: vi.fn().mockResolvedValue({
    id: faker.datatype.uuid(),
    url: faker.internet.url(),
  }),
  deleteEvent: vi.fn().mockResolvedValue(true),
  getAvailability: vi.fn().mockResolvedValue([]),
  listCalendars: vi.fn().mockResolvedValue([]),
  ...overrides,
});

export const createMockVideoService = (overrides = {}) => ({
  createMeeting: vi.fn().mockResolvedValue({
    id: faker.datatype.uuid(),
    url: faker.internet.url(),
    password: faker.internet.password(),
  }),
  updateMeeting: vi.fn().mockResolvedValue({
    id: faker.datatype.uuid(),
    url: faker.internet.url(),
  }),
  deleteMeeting: vi.fn().mockResolvedValue(true),
  ...overrides,
});

export const createMockPaymentService = (overrides = {}) => ({
  create: vi.fn().mockResolvedValue({
    id: faker.datatype.uuid(),
    url: faker.internet.url(),
    amount: faker.datatype.number({ min: 1000, max: 10000 }),
  }),
  update: vi.fn().mockResolvedValue({
    id: faker.datatype.uuid(),
    status: "succeeded",
  }),
  refund: vi.fn().mockResolvedValue({
    id: faker.datatype.uuid(),
    status: "succeeded",
  }),
  ...overrides,
});

export const buildCalendarEvent = (event?: Partial<CalendarEvent>): CalendarEvent => {
  const uid = faker.datatype.uuid();
  return {
    uid,
    type: "meeting",
    title: faker.lorem.words(3),
    startTime: faker.date.future().toISOString(),
    endTime: faker.date.future().toISOString(),
    location: faker.address.city(),
    description: faker.lorem.paragraph(),
    attendees: [],
    customInputs: {},
    additionalNotes: faker.lorem.paragraph(),
    organizer: buildPerson(),
    ...event,
  };
};

export const buildPerson = (person?: Partial<Person>): Person => {
  return {
    name: faker.name.fullName(),
    email: faker.internet.email(),
    timeZone: "UTC",
    username: faker.internet.userName(),
    id: faker.datatype.number(),
    language: {
      locale: "en",
      translate: ((key: string) => key) as any,
    },
    ...person,
  };
};

export const expectBookingInDatabase = async (bookingData: {
  uid: string;
  status?: BookingStatus;
  eventTypeId?: number;
}): Promise<Booking | null> => {
  const booking = await prismock.booking.findUnique({
    where: { uid: bookingData.uid },
  });

  expect(booking).toBeDefined();
  if (bookingData.status) {
    expect(booking?.status).toBe(bookingData.status);
  }
  if (bookingData.eventTypeId) {
    expect(booking?.eventTypeId).toBe(bookingData.eventTypeId);
  }

  return booking;
};

export const expectUserInDatabase = async (userData: {
  email: string;
  name?: string;
}): Promise<User | null> => {
  const user = await prismock.user.findUnique({
    where: { email: userData.email },
  });

  expect(user).toBeDefined();
  if (userData.name) {
    expect(user?.name).toBe(userData.name);
  }

  return user;
};

export const clearTestDatabase = async () => {
  await prismock.booking.deleteMany();
  await prismock.eventType.deleteMany();
  await prismock.credential.deleteMany();
  await prismock.user.deleteMany();
};

export const createQuickTestScenario = async (
  scenario: "simple-booking" | "booking-with-limits" | "user-with-credentials"
) => {
  switch (scenario) {
    case "simple-booking":
      return await TestScenarioBuilder.booking().create();

    case "booking-with-limits":
      return await TestScenarioBuilder.booking()
        .withBookingLimits({ PER_DAY: 2 })
        .withExistingBookings(1)
        .create();

    case "user-with-credentials":
      return await TestScenarioBuilder.user().withCredentials(2).create();

    default:
      throw new Error(`Unknown scenario: ${scenario}`);
  }
};
