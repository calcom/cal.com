import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock prisma before importing the module under test
vi.mock("@calcom/prisma", () => ({
  default: {
    user: {
      findFirst: vi.fn(),
    },
  },
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
  },
  availabilityUserSelect: {
    id: true,
    name: true,
    email: true,
    username: true,
    timeZone: true,
    timeFormat: true,
    defaultScheduleId: true,
    bufferTime: true,
    isPlatformManaged: true,
    availability: true,
    schedules: {
      select: {
        availability: true,
        timeZone: true,
        id: true,
      },
    },
    travelSchedules: true,
  },
}));

vi.mock("@calcom/prisma/selects/credential", () => ({
  credentialForCalendarServiceSelect: {
    id: true,
    type: true,
    key: true,
    userId: true,
    teamId: true,
    appId: true,
    invalid: true,
    delegatedToId: true,
  },
}));

vi.mock("@calcom/lib/server/withSelectedCalendars", () => ({
  withSelectedCalendars: vi.fn((user: unknown) => ({
    ...(user as Record<string, unknown>),
    allSelectedCalendars: [],
    userLevelSelectedCalendars: [],
  })),
}));

vi.mock("@calcom/app-store/delegationCredential", () => ({
  enrichUserWithDelegationCredentialsIncludeServiceAccountKey: vi.fn(({ user }: { user: unknown }) => user),
}));

import { prisma } from "@calcom/prisma";
import { findUsersForAvailabilityCheck } from "./findUsersForAvailabilityCheck";

describe("findUsersForAvailabilityCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when no user is found", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    const result = await findUsersForAvailabilityCheck({ where: { id: 999 } });
    expect(result).toBeNull();
  });

  it("should return user with selected calendars when user is found", async () => {
    const mockUser = {
      id: 1,
      name: "Test User",
      email: "test@example.com",
      username: "testuser",
      timeZone: "America/New_York",
      timeFormat: 12,
      defaultScheduleId: 1,
      bufferTime: 0,
      isPlatformManaged: false,
      availability: [],
      schedules: [],
      travelSchedules: [],
      selectedCalendars: [],
      credentials: [],
    };

    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);

    const result = await findUsersForAvailabilityCheck({ where: { id: 1 } });

    expect(result).toBeDefined();
    expect(result).toHaveProperty("id", 1);
    expect(result).toHaveProperty("email", "test@example.com");
  });

  it("should call prisma.user.findFirst with correct where clause", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    await findUsersForAvailabilityCheck({ where: { email: "test@example.com" } });

    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "test@example.com" },
      })
    );
  });

  it("should include selectedCalendars in the query select", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    await findUsersForAvailabilityCheck({ where: { id: 1 } });

    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          selectedCalendars: true,
          credentials: expect.objectContaining({
            select: expect.any(Object),
          }),
        }),
      })
    );
  });

  it("should enrich user with delegation credentials", async () => {
    const mockUser = {
      id: 1,
      name: "Test User",
      email: "test@example.com",
      username: "testuser",
      timeZone: "UTC",
      timeFormat: 24,
      defaultScheduleId: null,
      bufferTime: 0,
      isPlatformManaged: false,
      availability: [],
      schedules: [],
      travelSchedules: [],
      selectedCalendars: [],
      credentials: [{ id: 1, type: "google_calendar" }],
    };

    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);

    const { enrichUserWithDelegationCredentialsIncludeServiceAccountKey } = await import(
      "@calcom/app-store/delegationCredential"
    );

    await findUsersForAvailabilityCheck({ where: { id: 1 } });

    expect(enrichUserWithDelegationCredentialsIncludeServiceAccountKey).toHaveBeenCalled();
  });

  it("should call withSelectedCalendars before enriching with delegation credentials", async () => {
    const mockUser = {
      id: 1,
      name: "Test User",
      email: "test@example.com",
      username: "testuser",
      timeZone: "UTC",
      timeFormat: 24,
      defaultScheduleId: null,
      bufferTime: 0,
      isPlatformManaged: false,
      availability: [],
      schedules: [],
      travelSchedules: [],
      selectedCalendars: [],
      credentials: [],
    };

    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);

    const { withSelectedCalendars } = await import("@calcom/lib/server/withSelectedCalendars");

    await findUsersForAvailabilityCheck({ where: { id: 1 } });

    expect(withSelectedCalendars).toHaveBeenCalled();
  });

  it("should handle complex where clauses", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    await findUsersForAvailabilityCheck({
      where: {
        AND: [{ email: "test@example.com" }, { username: "testuser" }],
      },
    });

    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ email: "test@example.com" }, { username: "testuser" }],
        },
      })
    );
  });

  it("should handle user with multiple schedules", async () => {
    const mockUser = {
      id: 1,
      name: "Test User",
      email: "test@example.com",
      username: "testuser",
      timeZone: "America/New_York",
      timeFormat: 12,
      defaultScheduleId: 1,
      bufferTime: 0,
      isPlatformManaged: false,
      availability: [],
      schedules: [
        {
          id: 1,
          availability: [
            {
              days: [1, 2, 3, 4, 5],
              startTime: new Date("1970-01-01T09:00:00Z"),
              endTime: new Date("1970-01-01T17:00:00Z"),
              date: null,
            },
          ],
          timeZone: "America/New_York",
        },
        {
          id: 2,
          availability: [
            {
              days: [6],
              startTime: new Date("1970-01-01T10:00:00Z"),
              endTime: new Date("1970-01-01T14:00:00Z"),
              date: null,
            },
          ],
          timeZone: "America/New_York",
        },
      ],
      travelSchedules: [],
      selectedCalendars: [],
      credentials: [],
    };

    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);

    const result = await findUsersForAvailabilityCheck({ where: { id: 1 } });

    expect(result).toBeDefined();
  });

  it("should handle user with no schedules", async () => {
    const mockUser = {
      id: 1,
      name: "Test User",
      email: "test@example.com",
      username: "testuser",
      timeZone: "UTC",
      timeFormat: 24,
      defaultScheduleId: null,
      bufferTime: 0,
      isPlatformManaged: false,
      availability: [],
      schedules: [],
      travelSchedules: [],
      selectedCalendars: [],
      credentials: [],
    };

    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);

    const result = await findUsersForAvailabilityCheck({ where: { id: 1 } });

    expect(result).toBeDefined();
    expect(result).toHaveProperty("id", 1);
  });

  it("should handle user with platform managed flag", async () => {
    const mockUser = {
      id: 1,
      name: "Platform User",
      email: "platform@example.com",
      username: "platformuser",
      timeZone: "UTC",
      timeFormat: 24,
      defaultScheduleId: null,
      bufferTime: 0,
      isPlatformManaged: true,
      availability: [],
      schedules: [],
      travelSchedules: [],
      selectedCalendars: [],
      credentials: [],
    };

    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);

    const result = await findUsersForAvailabilityCheck({ where: { id: 1 } });

    expect(result).toBeDefined();
    expect(result).toHaveProperty("isPlatformManaged", true);
  });
});
