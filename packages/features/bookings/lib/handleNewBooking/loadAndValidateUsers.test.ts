import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/sentryWrapper", () => ({
  withReporting: (fn: (...args: never[]) => unknown) => fn,
}));

vi.mock("@calcom/lib/piiFreeData", () => ({
  getPiiFreeUser: (user: Record<string, unknown>) => ({ id: user.id }),
}));

vi.mock("@calcom/lib/safeStringify", () => ({
  safeStringify: (v: unknown) => JSON.stringify(v),
}));

const mockLoadUsers = vi.fn();
vi.mock("./loadUsers", () => ({
  loadUsers: (...args: unknown[]) => mockLoadUsers(...args),
}));

const mockFilterBlockedUsers = vi.fn();
vi.mock("@calcom/features/watchlist/operations/filter-blocked-users.controller", () => ({
  filterBlockedUsers: (...args: unknown[]) => mockFilterBlockedUsers(...args),
}));

vi.mock("@calcom/features/watchlist/lib/telemetry", () => ({
  sentrySpan: undefined,
}));

vi.mock("@calcom/features/profile/repositories/ProfileRepository", () => ({
  ProfileRepository: {
    findFirstOrganizationIdForUser: vi.fn().mockResolvedValue(null),
  },
}));

const mockFindQualifiedHostsWithDelegationCredentials = vi.fn();
vi.mock("@calcom/features/di/containers/QualifiedHosts", () => ({
  getQualifiedHostsService: () => ({
    findQualifiedHostsWithDelegationCredentials: mockFindQualifiedHostsWithDelegationCredentials,
  }),
}));

vi.mock("@calcom/app-store/delegationCredential", () => ({
  enrichUsersWithDelegationCredentials: vi.fn().mockImplementation(({ users }) => users),
}));

vi.mock("@calcom/lib/getOrgIdFromMemberOrTeamId", () => ({
  default: vi.fn().mockResolvedValue(null),
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
  userSelect: { id: true, name: true, email: true, username: true },
}));

vi.mock("@calcom/prisma/selects/credential", () => ({
  credentialForCalendarServiceSelect: { id: true, type: true },
}));

vi.mock("@calcom/features/users/repositories/UserRepository", () => ({
  withSelectedCalendars: (user: Record<string, unknown>) => ({
    ...user,
    userLevelSelectedCalendars: [],
    allSelectedCalendars: [],
  }),
}));

import { loadAndValidateUsers } from "./loadAndValidateUsers";

const mockLogger = {
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
} as unknown as Parameters<typeof loadAndValidateUsers>[0]["logger"];

describe("loadAndValidateUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadUsers.mockResolvedValue([
      {
        id: 1,
        name: "User 1",
        username: "user1",
        email: "user1@test.com",
        allowDynamicBooking: true,
        credentials: [],
      },
    ]);
    mockFilterBlockedUsers.mockResolvedValue({
      eligibleUsers: [
        {
          id: 1,
          name: "User 1",
          username: "user1",
          email: "user1@test.com",
          allowDynamicBooking: true,
          credentials: [],
        },
      ],
      blockedCount: 0,
    });
    mockFindQualifiedHostsWithDelegationCredentials.mockResolvedValue({
      qualifiedRRHosts: [],
      allFallbackRRHosts: [],
      fixedHosts: [],
    });
  });

  const baseInput = {
    eventType: {
      id: 1,
      hosts: [],
      users: [],
      userId: null,
      schedulingType: null,
      maxLeadThreshold: null,
      team: null,
      parent: null,
      assignAllTeamMembers: false,
      assignRRMembersUsingSegment: false,
      rrSegmentQueryValue: null,
      isRRWeightsEnabled: false,
      rescheduleWithSameRoundRobinHost: false,
      teamId: null,
      includeNoShowInRRCalculation: false,
      rrHostSubsetEnabled: false,
    } as Parameters<typeof loadAndValidateUsers>[0]["eventType"],
    eventTypeId: 1,
    dynamicUserList: [],
    logger: mockLogger,
    routedTeamMemberIds: null,
    contactOwnerEmail: null,
    rescheduleUid: null,
    routingFormResponse: null,
    isPlatform: false,
    hostname: "cal.com",
    forcedSlug: undefined,
  };

  it("returns fixedUsers when no qualified RR hosts", async () => {
    const result = await loadAndValidateUsers(baseInput);

    expect(result.fixedUsers).toHaveLength(1);
    expect(result.qualifiedRRUsers).toHaveLength(0);
    expect(result.additionalFallbackRRUsers).toHaveLength(0);
  });

  it("throws HttpError when all users are blocked", async () => {
    mockFilterBlockedUsers.mockResolvedValue({
      eligibleUsers: [],
      blockedCount: 1,
    });

    await expect(loadAndValidateUsers(baseInput)).rejects.toThrow("eventTypeUser.notFound");
  });

  it("throws HttpError when dynamic user does not allow dynamic booking", async () => {
    mockLoadUsers.mockResolvedValue([
      {
        id: 1,
        name: "User 1",
        allowDynamicBooking: false,
        credentials: [],
      },
    ]);

    await expect(
      loadAndValidateUsers({
        ...baseInput,
        eventTypeId: 0,
        dynamicUserList: ["user1"],
      })
    ).rejects.toThrow("Some of the users in this group do not allow dynamic booking");
  });

  it("maps users with isFixed based on scheduling type", async () => {
    mockLoadUsers.mockResolvedValue([
      {
        id: 1,
        name: "User 1",
        allowDynamicBooking: true,
        credentials: [],
        isFixed: false,
      },
    ]);
    mockFilterBlockedUsers.mockResolvedValue({
      eligibleUsers: [
        {
          id: 1,
          name: "User 1",
          allowDynamicBooking: true,
          credentials: [],
          isFixed: false,
        },
      ],
      blockedCount: 0,
    });

    const result = await loadAndValidateUsers(baseInput);

    // schedulingType is null (not ROUND_ROBIN), so isFixed should be true
    expect(result.fixedUsers[0].id).toBe(1);
  });

  it("logs when blocked users are filtered out", async () => {
    mockFilterBlockedUsers.mockResolvedValue({
      eligibleUsers: [
        {
          id: 1,
          name: "User 1",
          allowDynamicBooking: true,
          credentials: [],
        },
      ],
      blockedCount: 2,
    });

    await loadAndValidateUsers(baseInput);

    expect(mockLogger.info).toHaveBeenCalledWith("Filtered out 2 blocked user(s) from booking");
  });
});
