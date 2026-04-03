/**
 * NOTE: The dynamic import of ./route triggers @calcom/prisma loading, which initializes
 * prismock via the factory in __mocks__/prisma.ts. We call enableEmailFeature/mockNoTranslations
 * after the dynamic import so prismock is available.
 */
// biome-ignore lint/nursery/noImportCycles: Mock imports must come first for vitest mocking to work
import prismaMock from "@calcom/testing/lib/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockSendOrganizerRequestReminderEmail = vi.fn((..._args: unknown[]) => Promise.resolve());
vi.mock("@calcom/emails/email-manager", () => ({
  sendOrganizerRequestReminderEmail: (...args: unknown[]) =>
    mockSendOrganizerRequestReminderEmail(...args),
}));

vi.mock("@calcom/features/bookings/lib/getCalEventResponses", () => ({
  getCalEventResponses: vi.fn(() => ({})),
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

// Mock dayjs to return a far-future date so that createdAt <= dayjsMocked works
// for bookings created by prismock (which sets createdAt to "now").
vi.mock("@calcom/dayjs", () => {
  const dayjs = (d?: unknown) => ({
    add: () => ({ toDate: () => new Date("2099-01-01T00:00:00Z") }),
    toDate: () => (d ? new Date(d as string) : new Date()),
  });
  dayjs.default = dayjs;
  return { default: dayjs };
});

vi.mock("app/api/defaultResponderForAppDir", () => ({
  defaultResponderForAppDir: (fn: Function) => fn,
}));

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

describe("bookingReminder route", () => {
  beforeEach(() => {
    vi.stubEnv("CALENDSO_ENCRYPTION_KEY", "abcdefghjnmkljhjklmnhjklkmnbhjui");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "MOCK_STRIPE_WEBHOOK_SECRET");
    vi.stubEnv("CALCOM_KEYRING_SMTP_CURRENT", "K1");
    vi.stubEnv("CALCOM_KEYRING_SMTP_K1", "RNvJaRNaRGhIZGRHQY_l-i6TjEauPNWQ2qL6Xehe_XI");
    vi.stubEnv("CRON_API_KEY", "test-api-key");
    vi.stubEnv("UNKEY_ROOT_KEY", "");
    vi.clearAllMocks();
    globalThis.testEmails = [];
    fetchMock.resetMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.testEmails = [];
    fetchMock.resetMocks();
  });

  describe("organizationId on calEvent", () => {
    it("should set organizationId from user profile on the evt passed to sendOrganizerRequestReminderEmail", async () => {
      // Dynamic import triggers @calcom/prisma → prismock initialization
      const { POST } = await import("./route");

      // Now prismock is initialized, set up scenario
      enableEmailFeature();
      mockNoTranslations();

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
                users: [{ id: 101 }],
              },
            ],
            bookings: [
              {
                uid: "uid-reminder-1",
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.PENDING,
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

      const headers = new Map([["authorization", "test-api-key"]]);
      const searchParams = new Map();
      const request = {
        headers: { get: (key: string) => headers.get(key) ?? null },
        nextUrl: { searchParams: { get: (key: string) => searchParams.get(key) ?? null } },
      };

      await (POST as any)(request as any);

      expect(mockSendOrganizerRequestReminderEmail).toHaveBeenCalled();
      const calEvent = mockSendOrganizerRequestReminderEmail.mock.calls[0]?.[0] as any;
      expect(calEvent.organizationId).toBe(ORG_ID);
    });

    it("should fall back to team parentId when user has no org profile", async () => {
      const { POST } = await import("./route");

      enableEmailFeature();
      mockNoTranslations();

      const TEAM_PARENT_ID = 99;
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
              users: [{ id: 101 }],
            },
          ],
          bookings: [
            {
              uid: "uid-reminder-2",
              eventTypeId: 1,
              userId: 101,
              status: BookingStatus.PENDING,
              startTime: `${plus1DateString}T10:00:00.000Z`,
              endTime: `${plus1DateString}T11:00:00.000Z`,
              attendees: [{ email: "attendee@test.com", timeZone: "UTC" }],
              user: { id: 101 },
            },
          ],
        })
      );

      // Manually create a team with parentId and link it to the event type
      await prismaMock.team.create({
        data: {
          id: 50,
          name: "Sub Team",
          slug: "sub-team",
          parentId: TEAM_PARENT_ID,
        },
      });
      await prismaMock.eventType.update({
        where: { id: 1 },
        data: { teamId: 50 },
      });

      const headers = new Map([["authorization", "test-api-key"]]);
      const searchParams = new Map();
      const request = {
        headers: { get: (key: string) => headers.get(key) ?? null },
        nextUrl: { searchParams: { get: (key: string) => searchParams.get(key) ?? null } },
      };

      await (POST as any)(request as any);

      expect(mockSendOrganizerRequestReminderEmail).toHaveBeenCalled();
      const calEvent = mockSendOrganizerRequestReminderEmail.mock.calls[0]?.[0] as any;
      expect(calEvent.organizationId).toBe(TEAM_PARENT_ID);
    });

    it("should set organizationId to null when no org profile and no team parent", async () => {
      const { POST } = await import("./route");

      enableEmailFeature();
      mockNoTranslations();

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
              users: [{ id: 101 }],
            },
          ],
          bookings: [
            {
              uid: "uid-reminder-3",
              eventTypeId: 1,
              userId: 101,
              status: BookingStatus.PENDING,
              startTime: `${plus1DateString}T10:00:00.000Z`,
              endTime: `${plus1DateString}T11:00:00.000Z`,
              attendees: [{ email: "attendee@test.com", timeZone: "UTC" }],
              user: { id: 101 },
            },
          ],
        })
      );

      const headers = new Map([["authorization", "test-api-key"]]);
      const searchParams = new Map();
      const request = {
        headers: { get: (key: string) => headers.get(key) ?? null },
        nextUrl: { searchParams: { get: (key: string) => searchParams.get(key) ?? null } },
      };

      await (POST as any)(request as any);

      expect(mockSendOrganizerRequestReminderEmail).toHaveBeenCalled();
      const calEvent = mockSendOrganizerRequestReminderEmail.mock.calls[0]?.[0] as any;
      expect(calEvent.organizationId).toBeNull();
    });
  });
});
