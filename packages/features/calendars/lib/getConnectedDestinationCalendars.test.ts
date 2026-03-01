import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetCalendarCredentials,
  mockGetConnectedCalendars,
  mockCleanIntegrationKeys,
  mockEnrichUser,
  mockIsDelegationCredential,
  mockPrisma,
  mockDestCalRepo,
  mockSelectedCalRepo,
} = vi.hoisted(() => ({
  mockGetCalendarCredentials: vi.fn().mockReturnValue([]),
  mockGetConnectedCalendars: vi
    .fn()
    .mockResolvedValue({ connectedCalendars: [], destinationCalendar: undefined }),
  mockCleanIntegrationKeys: vi.fn((integration: Record<string, unknown>) => integration),
  mockEnrichUser: vi.fn().mockResolvedValue({ credentials: [] }),
  mockIsDelegationCredential: vi.fn().mockReturnValue(false),
  mockPrisma: {
    credential: { findMany: vi.fn().mockResolvedValue([]) },
    destinationCalendar: {
      delete: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({ id: 1, integration: "google_calendar", externalId: "cal-1" }),
      create: vi.fn().mockResolvedValue({ id: 1, integration: "google_calendar", externalId: "cal-1" }),
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
  mockDestCalRepo: {
    createIfNotExistsForUser: vi.fn().mockResolvedValue({
      id: 1,
      userId: 1,
      integration: "google_calendar",
      externalId: "primary-cal",
      credentialId: 1,
      eventTypeId: null,
      primaryEmail: "user@example.com",
    }),
  },
  mockSelectedCalRepo: {
    createIfNotExists: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@calcom/features/calendars/lib/CalendarManager", () => ({
  getCalendarCredentials: mockGetCalendarCredentials,
  getConnectedCalendars: mockGetConnectedCalendars,
  cleanIntegrationKeys: mockCleanIntegrationKeys,
}));

vi.mock("@calcom/app-store/delegationCredential", () => ({
  enrichUserWithDelegationCredentialsIncludeServiceAccountKey: mockEnrichUser,
}));

vi.mock("@calcom/lib/delegationCredential", () => ({
  isDelegationCredential: mockIsDelegationCredential,
}));

vi.mock("@calcom/prisma", () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

vi.mock("@calcom/features/calendars/repositories/DestinationCalendarRepository", () => ({
  DestinationCalendarRepository: mockDestCalRepo,
}));

vi.mock("@calcom/features/selectedCalendar/repositories/SelectedCalendarRepository", () => ({
  SelectedCalendarRepository: mockSelectedCalRepo,
}));

vi.mock("@calcom/prisma/selects/credential", () => ({
  credentialForCalendarServiceSelect: {},
}));

vi.mock("@calcom/prisma/enums", () => ({
  AppCategories: { calendar: "calendar" },
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import type { UserWithCalendars } from "./getConnectedDestinationCalendars";
import { getConnectedDestinationCalendarsAndEnsureDefaultsInDb } from "./getConnectedDestinationCalendars";

function buildUser(overrides: Partial<UserWithCalendars> = {}): UserWithCalendars {
  return {
    id: 1,
    email: "user@example.com",
    allSelectedCalendars: [],
    userLevelSelectedCalendars: [],
    destinationCalendar: null,
    ...overrides,
  };
}

describe("getConnectedDestinationCalendars", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnrichUser.mockResolvedValue({ credentials: [] });
    mockGetCalendarCredentials.mockReturnValue([]);
  });

  describe("fn: getConnectedDestinationCalendarsAndEnsureDefaultsInDb", () => {
    it("should fetch user credentials and calendar credentials", async () => {
      const user = buildUser();
      mockGetConnectedCalendars.mockResolvedValue({
        connectedCalendars: [],
        destinationCalendar: undefined,
      });

      await getConnectedDestinationCalendarsAndEnsureDefaultsInDb({
        user,
        onboarding: false,
        prisma: mockPrisma as never,
      });

      expect(mockPrisma.credential.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 1 }),
        })
      );
      expect(mockEnrichUser).toHaveBeenCalled();
      expect(mockGetCalendarCredentials).toHaveBeenCalled();
    });

    it("should delete destination calendar when no connected calendars exist", async () => {
      const user = buildUser({
        destinationCalendar: {
          id: 10,
          userId: 1,
          eventTypeId: null,
          integration: "google_calendar",
          externalId: "old-cal",
          credentialId: 1,
          primaryEmail: "user@example.com",
          delegationCredentialId: null,
          customCalendarReminder: null,
        },
      });

      mockGetConnectedCalendars.mockResolvedValue({
        connectedCalendars: [],
        destinationCalendar: undefined,
      });

      await getConnectedDestinationCalendarsAndEnsureDefaultsInDb({
        user,
        onboarding: false,
        prisma: mockPrisma as never,
      });

      expect(mockPrisma.destinationCalendar.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 1 } })
      );
    });

    it("should create default destination calendar when user has no destinationCalendar", async () => {
      const user = buildUser({ destinationCalendar: null });
      const connectedCalendar = {
        credentialId: 1,
        delegationCredentialId: null,
        integration: { slug: "google", type: "google_calendar" },
        primary: {
          integration: "google_calendar",
          externalId: "primary-cal",
          credentialId: 1,
          delegationCredentialId: null,
          email: "user@example.com",
        },
        calendars: [
          {
            integration: "google_calendar",
            externalId: "primary-cal",
            isSelected: false,
            credentialId: 1,
          },
        ],
      };

      mockGetConnectedCalendars.mockResolvedValue({
        connectedCalendars: [connectedCalendar],
        destinationCalendar: undefined,
      });

      await getConnectedDestinationCalendarsAndEnsureDefaultsInDb({
        user,
        onboarding: true,
        prisma: mockPrisma as never,
      });

      expect(mockDestCalRepo.createIfNotExistsForUser).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1, integration: "google_calendar", externalId: "primary-cal" })
      );
    });

    it("should update destination calendar when it is not found in connected calendars", async () => {
      const user = buildUser({
        destinationCalendar: {
          id: 10,
          userId: 1,
          eventTypeId: null,
          integration: "google_calendar",
          externalId: "missing-cal",
          credentialId: 1,
          primaryEmail: "user@example.com",
          delegationCredentialId: null,
          customCalendarReminder: null,
        },
      });

      const connectedCalendar = {
        credentialId: 1,
        delegationCredentialId: null,
        integration: { slug: "google", type: "google_calendar" },
        primary: {
          integration: "google_calendar",
          externalId: "new-primary",
          credentialId: 1,
          email: "user@example.com",
        },
        calendars: [
          { integration: "google_calendar", externalId: "new-primary", isSelected: false, credentialId: 1 },
        ],
      };

      mockGetConnectedCalendars.mockResolvedValue({
        connectedCalendars: [connectedCalendar],
        destinationCalendar: undefined,
      });

      await getConnectedDestinationCalendarsAndEnsureDefaultsInDb({
        user,
        onboarding: false,
        prisma: mockPrisma as never,
      });

      expect(mockPrisma.destinationCalendar.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 1 },
          data: expect.objectContaining({ externalId: "new-primary" }),
        })
      );
    });

    it("should mark destination calendar as selected during onboarding when it exists in connected calendars", async () => {
      const user = buildUser({
        destinationCalendar: {
          id: 10,
          userId: 1,
          eventTypeId: null,
          integration: "google_calendar",
          externalId: "primary-cal",
          credentialId: 1,
          primaryEmail: "user@example.com",
          delegationCredentialId: null,
          customCalendarReminder: null,
        },
      });

      const calendars = [
        {
          integration: "google_calendar",
          externalId: "primary-cal",
          isSelected: false,
          credentialId: 1,
        },
      ];

      const connectedCalendar = {
        credentialId: 1,
        delegationCredentialId: null,
        integration: { slug: "google", type: "google_calendar" },
        primary: {
          integration: "google_calendar",
          externalId: "primary-cal",
          credentialId: 1,
          email: "user@example.com",
        },
        calendars,
      };

      mockGetConnectedCalendars.mockResolvedValue({
        connectedCalendars: [connectedCalendar],
        destinationCalendar: { integration: "google_calendar", externalId: "primary-cal" },
      });

      await getConnectedDestinationCalendarsAndEnsureDefaultsInDb({
        user,
        onboarding: true,
        prisma: mockPrisma as never,
      });

      // The calendar should be marked as selected
      expect(calendars[0].isSelected).toBe(true);
      // And it should be persisted to DB
      expect(mockSelectedCalRepo.createIfNotExists).toHaveBeenCalled();
    });

    it("should skip sync when skipSync is true", async () => {
      const user = buildUser();

      await getConnectedDestinationCalendarsAndEnsureDefaultsInDb({
        user,
        onboarding: false,
        skipSync: true,
        prisma: mockPrisma as never,
      });

      expect(mockGetConnectedCalendars).not.toHaveBeenCalled();
    });

    it("should filter out conflicting non-delegated connected calendars", async () => {
      const user = buildUser();

      const delegatedCalendar = {
        credentialId: -1,
        delegationCredentialId: "delegation-1",
        integration: { slug: "google-calendar" },
        primary: { email: "user@example.com" },
        calendars: [],
      };

      const nonDelegatedCalendar = {
        credentialId: 2,
        delegationCredentialId: null,
        integration: { slug: "google-calendar" },
        primary: { email: "user@example.com" },
        calendars: [],
      };

      mockGetConnectedCalendars.mockResolvedValue({
        connectedCalendars: [delegatedCalendar, nonDelegatedCalendar],
        destinationCalendar: undefined,
      });

      const result = await getConnectedDestinationCalendarsAndEnsureDefaultsInDb({
        user,
        onboarding: false,
        prisma: mockPrisma as never,
      });

      // The non-delegated calendar matching the user email should be filtered out
      // Only the delegated calendar should remain
      expect(result.connectedCalendars).toHaveLength(1);
      expect(result.connectedCalendars[0].delegationCredentialId).toBe("delegation-1");
    });

    it("should use eventTypeId-specific selected calendars when eventTypeId is provided", async () => {
      const user = buildUser({
        allSelectedCalendars: [
          {
            id: "cal-1",
            externalId: "cal-1",
            integration: "google_calendar",
            eventTypeId: 5,
            updatedAt: new Date(),
            googleChannelId: null,
          },
          {
            id: "cal-2",
            externalId: "cal-2",
            integration: "google_calendar",
            eventTypeId: null,
            updatedAt: new Date(),
            googleChannelId: null,
          },
        ],
        userLevelSelectedCalendars: [
          {
            id: "cal-2",
            externalId: "cal-2",
            integration: "google_calendar",
            eventTypeId: null,
            updatedAt: new Date(),
            googleChannelId: null,
          },
        ],
      });

      mockGetConnectedCalendars.mockResolvedValue({
        connectedCalendars: [],
        destinationCalendar: undefined,
      });

      await getConnectedDestinationCalendarsAndEnsureDefaultsInDb({
        user,
        onboarding: false,
        eventTypeId: 5,
        prisma: mockPrisma as never,
      });

      // Should have called getConnectedCalendars with the event-type-specific calendars
      expect(mockGetConnectedCalendars).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([expect.objectContaining({ eventTypeId: 5 })]),
        undefined
      );
    });

    it("should use user-level selected calendars when no eventTypeId is provided", async () => {
      const userLevelCal = {
        id: "cal-2",
        externalId: "cal-2",
        integration: "google_calendar",
        eventTypeId: null,
        updatedAt: new Date(),
        googleChannelId: null,
      };

      const user = buildUser({
        allSelectedCalendars: [
          {
            id: "cal-1",
            externalId: "cal-1",
            integration: "google_calendar",
            eventTypeId: 5,
            updatedAt: new Date(),
            googleChannelId: null,
          },
          userLevelCal,
        ],
        userLevelSelectedCalendars: [userLevelCal],
      });

      mockGetConnectedCalendars.mockResolvedValue({
        connectedCalendars: [],
        destinationCalendar: undefined,
      });

      await getConnectedDestinationCalendarsAndEnsureDefaultsInDb({
        user,
        onboarding: false,
        prisma: mockPrisma as never,
      });

      expect(mockGetConnectedCalendars).toHaveBeenCalledWith(expect.anything(), [userLevelCal], undefined);
    });

    it("should not delete destination calendar when no connected calendars and no existing destination", async () => {
      const user = buildUser({ destinationCalendar: null });

      mockGetConnectedCalendars.mockResolvedValue({
        connectedCalendars: [],
        destinationCalendar: undefined,
      });

      await getConnectedDestinationCalendarsAndEnsureDefaultsInDb({
        user,
        onboarding: false,
        prisma: mockPrisma as never,
      });

      expect(mockPrisma.destinationCalendar.delete).not.toHaveBeenCalled();
    });
  });
});
