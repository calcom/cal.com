import { getOrganizer, getBooker, getScenarioData, TestData } from "./bookingScenario";

export const createFreshBookingScenario = (overrides?: {
  organizer?: Partial<ReturnType<typeof getOrganizer>>;
  booker?: Partial<ReturnType<typeof getBooker>>;
  eventType?: Record<string, unknown>;
  withWebhooks?: boolean;
  withWorkflows?: boolean;
}) => {
  const organizer = getOrganizer({
    name: "Organizer",
    email: "organizer@example.com",
    id: 101,
    schedules: [TestData.schedules.IstWorkHours],
    credentials: overrides?.organizer?.credentials || [],
    selectedCalendars: overrides?.organizer?.selectedCalendars || [],
    ...overrides?.organizer,
  });

  getBooker({
    email: "booker@example.com",
    name: "Booker",
    ...overrides?.booker,
  });

  const webhooks = overrides?.withWebhooks
    ? [
        {
          userId: organizer.id,
          eventTriggers: ["BOOKING_CREATED" as const],
          subscriberUrl: "http://my-webhook.example.com",
          active: true,
          eventTypeId: 1,
          appId: null,
        },
      ]
    : [];

  const workflows = overrides?.withWorkflows
    ? [
        {
          userId: organizer.id,
          trigger: "NEW_EVENT" as const,
          action: "EMAIL_HOST" as const,
          template: "REMINDER" as const,
          activeOn: [1],
        },
      ]
    : [];

  return getScenarioData({
    eventTypes: [
      {
        id: 1,
        slotInterval: 30,
        length: 30,
        users: (overrides?.eventType?.users as { id: number }[]) || [{ id: organizer.id }],
        ...overrides?.eventType,
      },
    ],
    organizer,
    webhooks,
    workflows,
    apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
  });
};

export const createRescheduleScenario = (overrides?: {
  organizer?: Partial<ReturnType<typeof getOrganizer>>;
  booker?: Partial<ReturnType<typeof getBooker>>;
  existingBooking?: Record<string, unknown>;
  withWebhooks?: boolean;
}) => {
  const organizer = getOrganizer({
    name: "Organizer",
    email: "organizer@example.com",
    id: 101,
    schedules: [TestData.schedules.IstWorkHours],
    ...overrides?.organizer,
  });

  const defaultBooking = {
    uid: "existing-booking-uid",
    eventTypeId: 1,
    status: "ACCEPTED" as const,
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
    ...overrides?.existingBooking,
  };

  return getScenarioData({
    eventTypes: [
      {
        id: 1,
        slotInterval: 30,
        length: 30,
        users: [{ id: 101 }],
      },
    ],
    bookings: [defaultBooking],
    organizer,
    webhooks: overrides?.withWebhooks
      ? [
          {
            userId: organizer.id,
            eventTriggers: ["BOOKING_RESCHEDULED" as const],
            subscriberUrl: "http://my-webhook.example.com",
            active: true,
            eventTypeId: 1,
            appId: null,
          },
        ]
      : [],
    apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
  });
};

export const createTeamBookingScenario = (overrides?: {
  schedulingType?: "COLLECTIVE" | "ROUND_ROBIN";
  teamMembers?: Array<Partial<ReturnType<typeof getOrganizer>>>;
  withWebhooks?: boolean;
}) => {
  const organizer = getOrganizer({
    name: "Team Lead",
    email: "lead@example.com",
    id: 101,
    schedules: [TestData.schedules.IstWorkHours],
  });

  const teamMembers = overrides?.teamMembers?.map((member) =>
    getOrganizer({
      name: member.name || "Team Member",
      email: member.email || "member@example.com",
      id: member.id || 102,
      schedules: member.schedules || [TestData.schedules.IstWorkHours],
    })
  ) || [
    getOrganizer({
      name: "Team Member 1",
      email: "member1@example.com",
      id: 102,
      schedules: [TestData.schedules.IstWorkHours],
    }),
  ];

  return getScenarioData({
    eventTypes: [
      {
        id: 1,
        slotInterval: 30,
        length: 30,
        schedulingType: overrides?.schedulingType || "COLLECTIVE",
        users: [{ id: 101 }, ...teamMembers.map((m) => ({ id: m.id }))],
      },
    ],
    organizer,
    usersApartFromOrganizer: teamMembers,
    webhooks: overrides?.withWebhooks
      ? [
          {
            userId: organizer.id,
            eventTriggers: ["BOOKING_CREATED" as const],
            subscriberUrl: "http://my-webhook.example.com",
            active: true,
            eventTypeId: 1,
            appId: null,
          },
        ]
      : [],
    apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
  });
};

export const createSeatedEventScenario = (overrides?: {
  organizer?: Partial<ReturnType<typeof getOrganizer>>;
  seatsPerTimeSlot?: number;
  seatsShowAttendees?: boolean;
  withWebhooks?: boolean;
}) => {
  const organizer = getOrganizer({
    name: "Organizer",
    email: "organizer@example.com",
    id: 101,
    schedules: [TestData.schedules.IstWorkHours],
    ...overrides?.organizer,
  });

  return getScenarioData({
    eventTypes: [
      {
        id: 1,
        slotInterval: 30,
        length: 30,
        users: [{ id: organizer.id }],
        seatsPerTimeSlot: overrides?.seatsPerTimeSlot || 3,
        seatsShowAttendees: overrides?.seatsShowAttendees ?? false,
      },
    ],
    organizer,
    webhooks: overrides?.withWebhooks
      ? [
          {
            userId: organizer.id,
            eventTriggers: ["BOOKING_CREATED" as const],
            subscriberUrl: "http://my-webhook.example.com",
            active: true,
            eventTypeId: 1,
            appId: null,
          },
        ]
      : [],
    apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
  });
};

export const createRoundRobinScenario = (overrides?: {
  teamMembers?: Array<Partial<ReturnType<typeof getOrganizer>>>;
  withWebhooks?: boolean;
  withWorkflows?: boolean;
}) => {
  const organizer = getOrganizer({
    name: "Team Lead",
    email: "lead@example.com",
    id: 101,
    schedules: [TestData.schedules.IstWorkHours],
  });

  const teamMembers = overrides?.teamMembers?.map((member, index) =>
    getOrganizer({
      name: member.name || `Team Member ${index + 1}`,
      email: member.email || `member${index + 1}@example.com`,
      id: member.id || 102 + index,
      schedules: member.schedules || [TestData.schedules.IstWorkHours],
    })
  ) || [
    getOrganizer({
      name: "Team Member 1",
      email: "member1@example.com",
      id: 102,
      schedules: [TestData.schedules.IstWorkHours],
    }),
  ];

  return getScenarioData({
    eventTypes: [
      {
        id: 1,
        slotInterval: 30,
        length: 30,
        schedulingType: "ROUND_ROBIN",
        users: [{ id: 101 }, ...teamMembers.map((m) => ({ id: m.id }))],
        hosts: [
          { userId: 101, isFixed: false },
          ...teamMembers.map((m) => ({ userId: m.id, isFixed: false })),
        ],
      },
    ],
    organizer,
    usersApartFromOrganizer: teamMembers,
    webhooks: overrides?.withWebhooks
      ? [
          {
            userId: organizer.id,
            eventTriggers: ["BOOKING_CREATED" as const],
            subscriberUrl: "http://my-webhook.example.com",
            active: true,
            eventTypeId: 1,
            appId: null,
          },
        ]
      : [],
    workflows: overrides?.withWorkflows
      ? [
          {
            userId: organizer.id,
            trigger: "NEW_EVENT" as const,
            action: "EMAIL_HOST" as const,
            template: "REMINDER" as const,
            activeOn: [1],
          },
        ]
      : [],
    apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
  });
};

export const createRecurringEventScenario = (overrides?: {
  organizer?: Partial<ReturnType<typeof getOrganizer>>;
  recurringEvent?: { freq: number; count: number; interval?: number };
  withWebhooks?: boolean;
}) => {
  const organizer = getOrganizer({
    name: "Organizer",
    email: "organizer@example.com",
    id: 101,
    schedules: [TestData.schedules.IstWorkHours],
    ...overrides?.organizer,
  });

  return getScenarioData({
    eventTypes: [
      {
        id: 1,
        slotInterval: 30,
        length: 30,
        users: [{ id: organizer.id }],
        recurringEvent: overrides?.recurringEvent || { freq: 2, count: 3, interval: 1 },
      },
    ],
    organizer,
    webhooks: overrides?.withWebhooks
      ? [
          {
            userId: organizer.id,
            eventTriggers: ["BOOKING_CREATED" as const],
            subscriberUrl: "http://my-webhook.example.com",
            active: true,
            eventTypeId: 1,
            appId: null,
          },
        ]
      : [],
    apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
  });
};
