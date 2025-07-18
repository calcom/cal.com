import { createBookingScenario } from "./bookingScenario";

import {
  expectBookingToBeInDatabase,
  expectSuccessfulBookingCreationEmails,
  expectBookingCreatedWebhookToHaveBeenFired,
} from "./expects";
import { getMockRequestDataForBooking } from "./getMockRequestDataForBooking";
import { createBookingMocks, createMockRequestData } from "./mockFactories";
import {
  createFreshBookingScenario,
  createRescheduleScenario,
  createTeamBookingScenario,
} from "./scenarioTemplates";

export const setupFreshBookingTest = async (overrides?: {
  organizer?: Record<string, unknown>;
  booker?: Record<string, unknown>;
  eventType?: Record<string, unknown>;
  withWebhooks?: boolean;
  withWorkflows?: boolean;
  mockData?: Record<string, unknown>;
}) => {
  const scenarioData = createFreshBookingScenario(overrides);
  await createBookingScenario(scenarioData);

  const mocks = createBookingMocks("fresh");

  const bookerData = { email: "booker@example.com", name: "Booker", ...overrides?.booker };

  const mockRequestData = getMockRequestDataForBooking({
    data: createMockRequestData("fresh", {
      responses: {
        email: bookerData.email,
        name: bookerData.name,
        location: { optionValue: "", value: "Cal Video" },
      },
      ...overrides?.mockData,
    }),
  });

  return {
    scenarioData,
    mocks,
    mockRequestData,
    organizer: overrides?.organizer || { name: "Organizer", email: "organizer@example.com", id: 101 },
    booker: bookerData,
  };
};

export const setupRescheduleTest = async (overrides?: {
  organizer?: Record<string, unknown>;
  booker?: Record<string, unknown>;
  existingBooking?: Record<string, unknown>;
  withWebhooks?: boolean;
  mockData?: Record<string, unknown>;
}) => {
  const scenarioData = createRescheduleScenario(overrides);
  await createBookingScenario(scenarioData);

  const mocks = createBookingMocks("reschedule");

  const bookerData = { email: "booker@example.com", name: "Booker", ...overrides?.booker };

  const mockRequestData = getMockRequestDataForBooking({
    data: createMockRequestData("reschedule", {
      rescheduleUid: overrides?.existingBooking?.uid || "existing-booking-uid",
      responses: {
        email: bookerData.email,
        name: bookerData.name,
        location: { optionValue: "", value: "Cal Video" },
      },
      ...overrides?.mockData,
    }),
  });

  return {
    scenarioData,
    mocks,
    mockRequestData,
    organizer: overrides?.organizer || { name: "Organizer", email: "organizer@example.com", id: 101 },
    booker: bookerData,
    existingBookingUid: overrides?.existingBooking?.uid || "existing-booking-uid",
  };
};

export const setupTeamBookingTest = async (overrides?: {
  schedulingType?: "COLLECTIVE" | "ROUND_ROBIN";
  teamMembers?: Record<string, unknown>[];
  withWebhooks?: boolean;
  booker?: Record<string, unknown>;
  mockData?: Record<string, unknown>;
}) => {
  const scenarioData = createTeamBookingScenario(overrides);
  await createBookingScenario(scenarioData);

  const mocks = createBookingMocks("team");

  const bookerData = { email: "booker@example.com", name: "Booker", ...overrides?.booker };

  const mockRequestData = getMockRequestDataForBooking({
    data: createMockRequestData("team", {
      responses: {
        email: bookerData.email,
        name: bookerData.name,
        location: { optionValue: "", value: "Cal Video" },
      },
      ...overrides?.mockData,
    }),
  });

  return {
    scenarioData,
    mocks,
    mockRequestData,
    organizer: { name: "Team Lead", email: "lead@example.com", id: 101 },
    booker: bookerData,
    teamMembers: overrides?.teamMembers || [],
  };
};

export const expectStandardBookingSuccess = async (params: {
  createdBooking: Record<string, unknown>;
  mockRequestData: Record<string, unknown>;
  organizer: Record<string, unknown>;
  booker: Record<string, unknown>;
  emails: Record<string, unknown>;
  withWebhook?: boolean;
  webhookUrl?: string;
}) => {
  const { createdBooking, mockRequestData, organizer, booker, emails } = params;

  await expectBookingToBeInDatabase({
    description: "",
    uid: createdBooking.uid as string,
    eventTypeId: mockRequestData.eventTypeId as number,
    status: "ACCEPTED",
  });

  expectSuccessfulBookingCreationEmails({
    booking: { uid: createdBooking.uid as string },
    booker,
    organizer,
    emails,
    iCalUID: createdBooking.iCalUID as string,
  });

  if (params.withWebhook) {
    expectBookingCreatedWebhookToHaveBeenFired({
      booker,
      organizer,
      location: "Cal Video",
      subscriberUrl: params.webhookUrl || "http://my-webhook.example.com",
    });
  }
};
