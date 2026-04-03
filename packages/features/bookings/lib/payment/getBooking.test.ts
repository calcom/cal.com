// biome-ignore lint/nursery/noImportCycles: Mock imports must come first for vitest mocking to work
import prismaMock from "@calcom/testing/lib/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@calcom/app-store/delegationCredential", () => ({
  enrichUserWithDelegationCredentials: vi.fn(({ user }) => Promise.resolve(user)),
}));

vi.mock("@calcom/ee/workflows/lib/getAllWorkflows", () => ({
  workflowSelect: {},
}));

vi.mock("@calcom/features/bookings/lib/getCalEventResponses", () => ({
  getCalEventResponses: vi.fn(() => ({})),
}));

vi.mock("@calcom/features/ee/organizations/lib/getBookerUrlServer", () => ({
  getBookerBaseUrl: vi.fn(() => Promise.resolve("https://cal.com")),
}));

vi.mock("@calcom/features/eventtypes/di/EventTypeService.container", () => ({
  getEventTypeService: vi.fn(() => ({
    shouldHideBrandingForEventType: vi.fn(() => Promise.resolve(false)),
  })),
}));

vi.mock("@calcom/lib/http-error", () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;
    constructor({ statusCode, message }: { statusCode: number; message: string }) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

vi.mock("@calcom/lib/isPrismaObj", () => ({
  isPrismaObjOrUndefined: vi.fn((v) => v),
}));

vi.mock("@calcom/lib/isRecurringEvent", () => ({
  parseRecurringEvent: vi.fn(() => null),
}));

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn(() => Promise.resolve(vi.fn())),
}));

vi.mock("@calcom/lib/timeFormat", () => ({
  getTimeFormatStringFromUserTimeFormat: vi.fn(() => "h:mma"),
}));

vi.mock("@calcom/prisma/selects/credential", () => ({
  credentialForCalendarServiceSelect: {},
}));

vi.mock("@calcom/prisma/zod-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/prisma/zod-utils")>();
  return {
    ...actual,
    EventTypeMetaDataSchema: { parse: vi.fn((v) => v ?? null) },
  };
});

import { BookingStatus } from "@calcom/prisma/enums";
import {
  createBookingScenario,
  enableEmailFeature,
  getOrganizer,
  getScenarioData,
  mockNoTranslations,
  TestData,
  getDate,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";

import { getBooking } from "./getBooking";

describe("getBooking", () => {
  beforeEach(() => {
    vi.stubEnv("CALENDSO_ENCRYPTION_KEY", "abcdefghjnmkljhjklmnhjklkmnbhjui");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "MOCK_STRIPE_WEBHOOK_SECRET");
    vi.stubEnv("CALCOM_KEYRING_SMTP_CURRENT", "K1");
    vi.stubEnv("CALCOM_KEYRING_SMTP_K1", "RNvJaRNaRGhIZGRHQY_l-i6TjEauPNWQ2qL6Xehe_XI");
    vi.stubEnv("UNKEY_ROOT_KEY", "");
    vi.clearAllMocks();
    globalThis.testEmails = [];
    fetchMock.resetMocks();
    enableEmailFeature();
    mockNoTranslations();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.testEmails = [];
    fetchMock.resetMocks();
  });

  describe("organizationId on calEvent", () => {
    it("should set organizationId from organizer profile when user belongs to org", async () => {
      const ORG_ID = 42;
      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@test.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
      });

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData(
          {
            organizer,
            eventTypes: [
              {
                id: 1,
                slotInterval: 30,
                length: 30,
                slug: "test-event",
                users: [{ id: 101 }],
              },
            ],
            bookings: [
              {
                id: 1,
                uid: "uid-123",
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `${plus1DateString}T10:00:00.000Z`,
                endTime: `${plus1DateString}T11:00:00.000Z`,
                attendees: [{ email: "attendee@test.com", timeZone: "UTC" }],
                user: { id: 101 },
              },
            ],
          },
          { id: ORG_ID }
        )
      );

      const { evt } = await getBooking(1);

      expect(evt.organizationId).toBe(ORG_ID);
    });

    it("should fall back to team parentId when no organizer profile exists", async () => {
      const TEAM_PARENT_ID = 99;
      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@test.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
      });

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      // Create the org (parent) first so the team can reference it
      await createBookingScenario(
        getScenarioData({
          organizer,
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              slug: "test-event",
              users: [{ id: 101 }],
            },
          ],
          bookings: [
            {
              id: 1,
              uid: "uid-123",
              eventTypeId: 1,
              userId: 101,
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T10:00:00.000Z`,
              endTime: `${plus1DateString}T11:00:00.000Z`,
              attendees: [{ email: "attendee@test.com", timeZone: "UTC" }],
              user: { id: 101 },
            },
          ],
        })
      );

      // Manually create a team with parentId and link to event type
      await prismaMock.team.create({
        data: {
          id: 5,
          name: "Test Team",
          slug: "test-team",
          parentId: TEAM_PARENT_ID,
        },
      });
      await prismaMock.eventType.update({
        where: { id: 1 },
        data: { teamId: 5 },
      });

      const { evt } = await getBooking(1);

      expect(evt.organizationId).toBe(TEAM_PARENT_ID);
    });

    it("should set organizationId to null when user has no org and no team parent", async () => {
      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@test.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
      });

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
          organizer,
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              slug: "test-event",
              users: [{ id: 101 }],
            },
          ],
          bookings: [
            {
              id: 1,
              uid: "uid-123",
              eventTypeId: 1,
              userId: 101,
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T10:00:00.000Z`,
              endTime: `${plus1DateString}T11:00:00.000Z`,
              attendees: [{ email: "attendee@test.com", timeZone: "UTC" }],
              user: { id: 101 },
            },
          ],
        })
      );

      const { evt } = await getBooking(1);

      expect(evt.organizationId).toBeNull();
    });
  });
});
