import prismock from "../../../tests/libs/__mocks__/prismaMock";

import { faker } from "@faker-js/faker";
import type {
  Booking,
  EventType,
  User,
  Credential,
  Team,
  Membership,
  Webhook,
  Workflow,
} from "@prisma/client";
import { vi, expect } from "vitest";

import { BookingStatus, CreationSource, MembershipRole, SchedulingType } from "@calcom/prisma/enums";
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

  static team() {
    return new TeamScenarioBuilder();
  }

  static seatedEvent() {
    return new SeatedEventScenarioBuilder();
  }

  static roundRobin() {
    return new RoundRobinScenarioBuilder();
  }

  static recurringEvent() {
    return new RecurringEventScenarioBuilder();
  }
}

class BookingScenarioBuilder {
  private bookingData: Partial<Booking> = {};
  private existingBookingsCount = 0;
  private bookingLimits: Record<string, number> = {};
  private eventTypeData: Partial<EventType> = {};
  private userData: Partial<User> = {};
  private withWebhooks = false;
  private withWorkflows = false;
  private withCalendarIntegrationFlag = false;
  private withVideoIntegrationFlag = false;

  withUserData(data: Partial<User>) {
    this.userData = data;
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

  withWebhookSupport() {
    this.withWebhooks = true;
    return this;
  }

  withWorkflowSupport() {
    this.withWorkflows = true;
    return this;
  }

  withCalendarIntegration() {
    this.withCalendarIntegrationFlag = true;
    return this;
  }

  withVideoIntegration() {
    this.withVideoIntegrationFlag = true;
    return this;
  }

  async create() {
    const user = await createTestUser(this.userData);

    if (this.withCalendarIntegrationFlag) {
      await createTestCredential({ userId: user.id, type: "google_calendar" });
    }

    if (this.withVideoIntegrationFlag) {
      await createTestCredential({ userId: user.id, type: "zoom_video" });
    }

    const eventType = await createTestEventType({
      userId: user.id,
      bookingLimits: this.bookingLimits,
      ...this.eventTypeData,
    });

    const webhooks = [];
    if (this.withWebhooks) {
      const webhook = await createTestWebhook({ userId: user.id, eventTypeId: eventType.id });
      webhooks.push(webhook);
    }

    const workflows = [];
    if (this.withWorkflows) {
      const workflow = await createTestWorkflow({ userId: user.id });
      workflows.push(workflow);
    }

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
      webhooks,
      workflows,
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

class TeamScenarioBuilder {
  private teamData: Partial<Team> = {};
  private membersCount = 2;
  private withEventTypesFlag = false;
  private eventTypeData: Partial<EventType> = {};

  withTeamData(data: Partial<Team>) {
    this.teamData = data;
    return this;
  }

  withMembers(count: number) {
    this.membersCount = count;
    return this;
  }

  withEventTypes(data: Partial<EventType> = {}) {
    this.withEventTypesFlag = true;
    this.eventTypeData = { ...this.eventTypeData, ...data };
    return this;
  }

  async create() {
    const team = await createTestTeam(this.teamData);

    const members = [];
    for (let i = 0; i < this.membersCount; i++) {
      const user = await createTestUser();
      const membership = await createTestMembership({
        userId: user.id,
        teamId: team.id,
        role: i === 0 ? MembershipRole.OWNER : MembershipRole.MEMBER,
      });
      members.push({ user, membership });
    }

    const eventTypes = [];
    if (this.withEventTypesFlag) {
      const eventType = await createTestEventType({
        userId: members[0].user.id,
        teamId: team.id,
        schedulingType: SchedulingType.COLLECTIVE,
        ...this.eventTypeData,
      });
      eventTypes.push(eventType);
    }

    return {
      team,
      members,
      eventTypes,
    };
  }
}

class SeatedEventScenarioBuilder {
  private eventTypeData: Partial<EventType> = {};
  private userData: Partial<User> = {};
  private seatsPerTimeSlot = 3;
  private seatsShowAttendees = false;

  withUserData(data: Partial<User>) {
    this.userData = data;
    return this;
  }

  withEventTypeData(data: Partial<EventType>) {
    this.eventTypeData = data;
    return this;
  }

  withSeats(count: number, showAttendees = false) {
    this.seatsPerTimeSlot = count;
    this.seatsShowAttendees = showAttendees;
    return this;
  }

  async create() {
    const user = await createTestUser(this.userData);
    const eventType = await createTestEventType({
      userId: user.id,
      seatsPerTimeSlot: this.seatsPerTimeSlot,
      seatsShowAttendees: this.seatsShowAttendees,
      ...this.eventTypeData,
    });

    return {
      user,
      eventType,
      seatsPerTimeSlot: this.seatsPerTimeSlot,
      seatsShowAttendees: this.seatsShowAttendees,
    };
  }
}

class RoundRobinScenarioBuilder {
  private teamData: Partial<Team> = {};
  private membersCount = 3;
  private eventTypeData: Partial<EventType> = {};

  withTeamData(data: Partial<Team>) {
    this.teamData = data;
    return this;
  }

  withMembers(count: number) {
    this.membersCount = count;
    return this;
  }

  withEventTypeData(data: Partial<EventType>) {
    this.eventTypeData = data;
    return this;
  }

  async create() {
    const team = await createTestTeam(this.teamData);

    const members = [];
    for (let i = 0; i < this.membersCount; i++) {
      const user = await createTestUser();
      const membership = await createTestMembership({
        userId: user.id,
        teamId: team.id,
        role: i === 0 ? MembershipRole.OWNER : MembershipRole.MEMBER,
      });
      members.push({ user, membership });
    }

    const eventType = await createTestEventType({
      userId: members[0].user.id,
      teamId: team.id,
      schedulingType: SchedulingType.ROUND_ROBIN,
      ...this.eventTypeData,
    });

    return {
      team,
      members,
      eventType,
    };
  }
}

class RecurringEventScenarioBuilder {
  private userData: Partial<User> = {};
  private eventTypeData: Partial<EventType> = {};
  private recurringEvent = { freq: 2, count: 3, interval: 1 };

  withUserData(data: Partial<User>) {
    this.userData = data;
    return this;
  }

  withEventTypeData(data: Partial<EventType>) {
    this.eventTypeData = data;
    return this;
  }

  withRecurrence(freq: number, count: number, interval = 1) {
    this.recurringEvent = { freq, count, interval };
    return this;
  }

  async create() {
    const user = await createTestUser(this.userData);
    const eventType = await createTestEventType({
      userId: user.id,
      recurringEvent: this.recurringEvent,
      ...this.eventTypeData,
    });

    return {
      user,
      eventType,
      recurringEvent: this.recurringEvent,
    };
  }
}

export const createTestUser = async (userData: Partial<User> = {}): Promise<User> => {
  return await prismock.user.create({
    data: {
      email: userData.email || faker.internet.email(),
      name: userData.name !== undefined ? userData.name : faker.name.fullName(),
      username: userData.username !== undefined ? userData.username : faker.internet.userName(),
      timeZone: userData.timeZone || "UTC",
      weekStart: userData.weekStart || "SUNDAY",
      createdDate: userData.createdDate || new Date(),
    },
  });
};

export const createTestEventType = async (eventTypeData: Partial<EventType> = {}): Promise<EventType> => {
  return await prismock.eventType.create({
    data: {
      title: eventTypeData.title || faker.lorem.words(3),
      slug: eventTypeData.slug || faker.lorem.slug(),
      description:
        eventTypeData.description !== undefined ? eventTypeData.description : faker.lorem.paragraph(),
      length: eventTypeData.length || 30,
      position: eventTypeData.position || 1,
      hidden: eventTypeData.hidden || false,
      requiresConfirmation: eventTypeData.requiresConfirmation || false,
      disableGuests: eventTypeData.disableGuests || false,
      minimumBookingNotice: eventTypeData.minimumBookingNotice || 120,
      beforeEventBuffer: eventTypeData.beforeEventBuffer || 0,
      afterEventBuffer: eventTypeData.afterEventBuffer || 0,
      price: eventTypeData.price || 0,
      currency: eventTypeData.currency || "usd",
      ...(eventTypeData.userId && { userId: eventTypeData.userId }),
      ...(eventTypeData.bookingLimits && { bookingLimits: eventTypeData.bookingLimits }),
      ...(eventTypeData.durationLimits && { durationLimits: eventTypeData.durationLimits }),
    },
  });
};

export const createTestBooking = async (bookingData: Partial<Booking> = {}): Promise<Booking> => {
  const uid = bookingData.uid || faker.datatype.uuid();

  return await prismock.booking.create({
    data: {
      uid,
      title: bookingData.title || faker.lorem.words(3),
      description: bookingData.description !== undefined ? bookingData.description : faker.lorem.paragraph(),
      startTime: bookingData.startTime || faker.date.future(),
      endTime: bookingData.endTime || faker.date.future(),
      status: bookingData.status || BookingStatus.ACCEPTED,
      paid: bookingData.paid || false,
      createdAt: bookingData.createdAt || new Date(),
      creationSource: bookingData.creationSource || CreationSource.WEBAPP,
      iCalUID: bookingData.iCalUID || `${uid}@cal.com`,
      iCalSequence: bookingData.iCalSequence || 0,
      ...(bookingData.eventTypeId && { eventTypeId: bookingData.eventTypeId }),
      ...(bookingData.userId && { userId: bookingData.userId }),
    },
  });
};

export const createTestCredential = async (credentialData: Partial<Credential> = {}): Promise<Credential> => {
  return await prismock.credential.create({
    data: {
      type: credentialData.type || "google_calendar",
      key: credentialData.key || { access_token: faker.random.alphaNumeric(32) },
      invalid: credentialData.invalid !== undefined ? credentialData.invalid : false,
      ...(credentialData.userId && { userId: credentialData.userId }),
    },
  });
};

export const createTestTeam = async (teamData: Partial<Team> = {}): Promise<Team> => {
  return await prismock.team.create({
    data: {
      name: teamData.name || faker.company.name(),
      slug: teamData.slug || faker.lorem.slug(),
      bio: teamData.bio || faker.lorem.paragraph(),
      hideBranding: teamData.hideBranding || false,
      isPrivate: teamData.isPrivate || false,
      hideBookATeamMember: teamData.hideBookATeamMember || false,
      createdAt: teamData.createdAt || new Date(),
    },
  });
};

export const createTestMembership = async (membershipData: Partial<Membership> = {}): Promise<Membership> => {
  return await prismock.membership.create({
    data: {
      userId: membershipData.userId!,
      teamId: membershipData.teamId!,
      accepted: membershipData.accepted !== undefined ? membershipData.accepted : true,
      role: membershipData.role || MembershipRole.MEMBER,
      disableImpersonation: membershipData.disableImpersonation || false,
    },
  });
};

export const createTestWebhook = async (webhookData: Partial<Webhook> = {}): Promise<Webhook> => {
  return await prismock.webhook.create({
    data: {
      id: webhookData.id || faker.datatype.uuid(),
      userId: webhookData.userId,
      teamId: webhookData.teamId,
      eventTypeId: webhookData.eventTypeId,
      subscriberUrl: webhookData.subscriberUrl || faker.internet.url(),
      payloadTemplate: webhookData.payloadTemplate,
      active: webhookData.active !== undefined ? webhookData.active : true,
      eventTriggers: webhookData.eventTriggers || ["BOOKING_CREATED"],
      appId: webhookData.appId,
      secret: webhookData.secret,
    },
  });
};

export const createTestWorkflow = async (workflowData: Partial<Workflow> = {}): Promise<Workflow> => {
  return await prismock.workflow.create({
    data: {
      name: workflowData.name || faker.lorem.words(3),
      userId: workflowData.userId,
      teamId: workflowData.teamId,
      trigger: workflowData.trigger || "NEW_EVENT",
      time: workflowData.time,
      timeUnit: workflowData.timeUnit,
    },
  });
};

export const createMockCalendarService = (overrides = {}) => ({
  createEvent: vi.fn().mockResolvedValue({
    id: faker.datatype.uuid(),
    url: faker.internet.url(),
    iCalUID: faker.datatype.uuid(),
  }),
  updateEvent: vi.fn().mockResolvedValue({
    id: faker.datatype.uuid(),
    url: faker.internet.url(),
    iCalUID: faker.datatype.uuid(),
  }),
  deleteEvent: vi.fn().mockResolvedValue(true),
  getAvailability: vi.fn().mockResolvedValue([]),
  listCalendars: vi.fn().mockResolvedValue([
    {
      externalId: "primary",
      name: "Primary Calendar",
      primary: true,
      readOnly: false,
    },
  ]),
  ...overrides,
});

export const createMockVideoService = (overrides = {}) => ({
  createMeeting: vi.fn().mockResolvedValue({
    id: faker.datatype.uuid(),
    url: faker.internet.url(),
    password: faker.internet.password(),
    type: "daily_video",
  }),
  updateMeeting: vi.fn().mockResolvedValue({
    id: faker.datatype.uuid(),
    url: faker.internet.url(),
    password: faker.internet.password(),
  }),
  deleteMeeting: vi.fn().mockResolvedValue(true),
  ...overrides,
});

export const createMockPaymentService = (overrides = {}) => ({
  create: vi.fn().mockResolvedValue({
    id: faker.datatype.uuid(),
    url: faker.internet.url(),
    amount: faker.datatype.number({ min: 1000, max: 10000 }),
    currency: "usd",
    status: "requires_payment_method",
  }),
  update: vi.fn().mockResolvedValue({
    id: faker.datatype.uuid(),
    status: "succeeded",
    amount: faker.datatype.number({ min: 1000, max: 10000 }),
  }),
  refund: vi.fn().mockResolvedValue({
    id: faker.datatype.uuid(),
    status: "succeeded",
    amount: faker.datatype.number({ min: 1000, max: 10000 }),
  }),
  ...overrides,
});

export const createMockWebhookService = (overrides = {}) => ({
  sendPayload: vi.fn().mockResolvedValue({
    status: 200,
    response: "OK",
  }),
  ...overrides,
});

export const createMockWorkflowService = (overrides = {}) => ({
  sendReminder: vi.fn().mockResolvedValue(true),
  sendNotification: vi.fn().mockResolvedValue(true),
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
  userId?: number;
  startTime?: Date;
  endTime?: Date;
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
  if (bookingData.userId) {
    expect(booking?.userId).toBe(bookingData.userId);
  }
  if (bookingData.startTime) {
    expect(booking?.startTime).toEqual(bookingData.startTime);
  }
  if (bookingData.endTime) {
    expect(booking?.endTime).toEqual(bookingData.endTime);
  }

  return booking;
};

export const expectUserInDatabase = async (userData: {
  email: string;
  name?: string;
  username?: string;
}): Promise<User | null> => {
  const user = await prismock.user.findUnique({
    where: { email: userData.email },
  });

  expect(user).toBeDefined();
  if (userData.name) {
    expect(user?.name).toBe(userData.name);
  }
  if (userData.username) {
    expect(user?.username).toBe(userData.username);
  }

  return user;
};

export const expectTeamInDatabase = async (teamData: {
  slug: string;
  name?: string;
}): Promise<Team | null> => {
  const team = await prismock.team.findUnique({
    where: { slug: teamData.slug },
  });

  expect(team).toBeDefined();
  if (teamData.name) {
    expect(team?.name).toBe(teamData.name);
  }

  return team;
};

export const expectMembershipInDatabase = async (membershipData: {
  userId: number;
  teamId: number;
  role?: MembershipRole;
  accepted?: boolean;
}): Promise<Membership | null> => {
  const membership = await prismock.membership.findFirst({
    where: {
      userId: membershipData.userId,
      teamId: membershipData.teamId,
    },
  });

  expect(membership).toBeDefined();
  if (membershipData.role) {
    expect(membership?.role).toBe(membershipData.role);
  }
  if (membershipData.accepted !== undefined) {
    expect(membership?.accepted).toBe(membershipData.accepted);
  }

  return membership;
};

export const expectWebhookToHaveBeenCalled = (mockWebhookService: any, expectedPayload?: any) => {
  expect(mockWebhookService.sendPayload).toHaveBeenCalled();
  if (expectedPayload) {
    expect(mockWebhookService.sendPayload).toHaveBeenCalledWith(expect.objectContaining(expectedPayload));
  }
};

export const expectWorkflowToHaveBeenTriggered = (
  mockWorkflowService: any,
  action: "sendReminder" | "sendNotification" = "sendReminder"
) => {
  expect(mockWorkflowService[action]).toHaveBeenCalled();
};

export const expectCalendarEventCreated = (mockCalendarService: any, expectedEvent?: any) => {
  expect(mockCalendarService.createEvent).toHaveBeenCalled();
  if (expectedEvent) {
    expect(mockCalendarService.createEvent).toHaveBeenCalledWith(expect.objectContaining(expectedEvent));
  }
};

export const expectVideoMeetingCreated = (mockVideoService: any, expectedMeeting?: any) => {
  expect(mockVideoService.createMeeting).toHaveBeenCalled();
  if (expectedMeeting) {
    expect(mockVideoService.createMeeting).toHaveBeenCalledWith(expect.objectContaining(expectedMeeting));
  }
};

export const expectSeatedBookingSuccess = async (bookingData: {
  uid: string;
  seatsPerTimeSlot: number;
  attendeeCount?: number;
}) => {
  const booking = await expectBookingInDatabase({
    uid: bookingData.uid,
    status: BookingStatus.ACCEPTED,
  });

  expect(booking).toBeDefined();
  return booking;
};

export const expectRoundRobinAssignment = async (bookingData: {
  uid: string;
  expectedAssigneeId: number;
}) => {
  const booking = await expectBookingInDatabase({
    uid: bookingData.uid,
    userId: bookingData.expectedAssigneeId,
    status: BookingStatus.ACCEPTED,
  });

  expect(booking).toBeDefined();
  return booking;
};

export const expectRecurringBookingsCreated = async (bookingUids: string[], expectedCount: number) => {
  expect(bookingUids).toHaveLength(expectedCount);

  for (const uid of bookingUids) {
    await expectBookingInDatabase({
      uid,
      status: BookingStatus.ACCEPTED,
    });
  }
};

export const clearTestDatabase = async () => {
  await prismock.booking.deleteMany();
  await prismock.eventType.deleteMany();
  await prismock.credential.deleteMany();
  await prismock.user.deleteMany();
};

export const createQuickTestScenario = async (
  scenario:
    | "simple-booking"
    | "booking-with-limits"
    | "user-with-credentials"
    | "team-booking"
    | "seated-event"
    | "round-robin"
    | "recurring-event"
    | "booking-with-integrations"
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

    case "team-booking":
      return await TestScenarioBuilder.team().withMembers(3).withEventTypes().create();

    case "seated-event":
      return await TestScenarioBuilder.seatedEvent().withSeats(5, true).create();

    case "round-robin":
      return await TestScenarioBuilder.roundRobin().withMembers(4).create();

    case "recurring-event":
      return await TestScenarioBuilder.recurringEvent().withRecurrence(2, 5, 1).create();

    case "booking-with-integrations":
      return await TestScenarioBuilder.booking()
        .withWebhookSupport()
        .withWorkflowSupport()
        .withCalendarIntegration()
        .withVideoIntegration()
        .create();

    default:
      throw new Error(`Unknown scenario: ${scenario}`);
  }
};

export const createBeginnerFriendlyBookingTest = async (
  options: {
    scenario?: "fresh" | "reschedule" | "team" | "seated" | "round-robin" | "recurring";
    withWebhooks?: boolean;
    withWorkflows?: boolean;
    withIntegrations?: boolean;
    seatsPerTimeSlot?: number;
    teamMembersCount?: number;
    recurringCount?: number;
  } = {}
) => {
  const {
    scenario = "fresh",
    withWebhooks = false,
    withWorkflows = false,
    withIntegrations = false,
    seatsPerTimeSlot = 3,
    teamMembersCount = 3,
    recurringCount = 3,
  } = options;

  let builder;

  switch (scenario) {
    case "fresh":
      builder = TestScenarioBuilder.booking();
      break;
    case "team":
      builder = TestScenarioBuilder.team().withMembers(teamMembersCount).withEventTypes();
      break;
    case "seated":
      builder = TestScenarioBuilder.seatedEvent().withSeats(seatsPerTimeSlot);
      break;
    case "round-robin":
      builder = TestScenarioBuilder.roundRobin().withMembers(teamMembersCount);
      break;
    case "recurring":
      builder = TestScenarioBuilder.recurringEvent().withRecurrence(2, recurringCount, 1);
      break;
    default:
      builder = TestScenarioBuilder.booking();
  }

  if (scenario === "fresh" || scenario === "reschedule") {
    if (withWebhooks) {
      (builder as BookingScenarioBuilder).withWebhookSupport();
    }
    if (withWorkflows) {
      (builder as BookingScenarioBuilder).withWorkflowSupport();
    }
    if (withIntegrations) {
      (builder as BookingScenarioBuilder).withCalendarIntegration().withVideoIntegration();
    }
  }

  return await builder.create();
};
