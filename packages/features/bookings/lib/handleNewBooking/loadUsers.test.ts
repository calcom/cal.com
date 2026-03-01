import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    }),
  },
}));

vi.mock("@calcom/lib/safeStringify", () => ({
  safeStringify: (v: unknown) => JSON.stringify(v),
}));

vi.mock("@calcom/lib/server/getServerErrorFromUnknown", () => ({
  getServerErrorFromUnknown: (error: Error) => error,
}));

const mockGetOrgDomainConfig = vi.fn();
vi.mock("@calcom/features/ee/organizations/lib/orgDomains", () => ({
  getOrgDomainConfig: (...args: unknown[]) => mockGetOrgDomainConfig(...args),
}));

const mockGetRoutedUsersWithContactOwnerAndFixedUsers = vi.fn();
const mockGetNormalizedHosts = vi.fn();
const mockFindMatchingHostsWithEventSegment = vi.fn();
vi.mock("@calcom/features/users/lib/getRoutedUsers", () => ({
  getRoutedUsersWithContactOwnerAndFixedUsers: (...args: unknown[]) =>
    mockGetRoutedUsersWithContactOwnerAndFixedUsers(...args),
  getNormalizedHosts: (...args: unknown[]) => mockGetNormalizedHosts(...args),
  findMatchingHostsWithEventSegment: (...args: unknown[]) => mockFindMatchingHostsWithEventSegment(...args),
}));

vi.mock("@calcom/features/users/repositories/UserRepository", () => ({
  UserRepository: vi.fn().mockImplementation(() => ({
    _getWhereClauseForFindingUsersByUsername: vi.fn().mockResolvedValue({ where: {}, profiles: [] }),
  })),
  withSelectedCalendars: (user: Record<string, unknown>) => ({
    ...user,
    userLevelSelectedCalendars: [],
    allSelectedCalendars: [],
  }),
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    user: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
  userSelect: { id: true, name: true, email: true, username: true },
}));

vi.mock("@calcom/prisma/selects/credential", () => ({
  credentialForCalendarServiceSelect: { id: true, type: true },
}));

import { loadUsers } from "./loadUsers";

describe("loadUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrgDomainConfig.mockReturnValue({ currentOrgDomain: null });
    mockGetRoutedUsersWithContactOwnerAndFixedUsers.mockReturnValue([]);
  });

  const makeEventType = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    hosts: [],
    users: [],
    schedulingType: null,
    team: null,
    assignAllTeamMembers: false,
    assignRRMembersUsingSegment: false,
    rrSegmentQueryValue: null,
    ...overrides,
  });

  it("loads users by event type when eventType.id is set", async () => {
    const hosts = [
      {
        user: { id: 1, name: "Host 1", username: "host1" },
        isFixed: true,
        priority: 1,
        weight: 100,
        createdAt: new Date(),
        groupId: null,
      },
    ];
    mockGetNormalizedHosts.mockReturnValue({ hosts, fallbackHosts: [] });
    mockFindMatchingHostsWithEventSegment.mockResolvedValue(hosts);

    const result = await loadUsers({
      eventType: makeEventType({ id: 1, hosts }) as Parameters<typeof loadUsers>[0]["eventType"],
      dynamicUserList: [],
      hostname: "cal.com",
      forcedSlug: undefined,
      isPlatform: false,
      routedTeamMemberIds: null,
      contactOwnerEmail: null,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("returns routed users when routedTeamMemberIds match", async () => {
    const hosts = [
      {
        user: { id: 1, name: "Host 1", username: "host1" },
        isFixed: true,
        priority: 1,
        weight: 100,
        createdAt: new Date(),
        groupId: null,
      },
    ];
    const routedUsers = [{ id: 1, name: "Host 1", username: "host1", isFixed: true }];
    mockGetNormalizedHosts.mockReturnValue({ hosts, fallbackHosts: [] });
    mockFindMatchingHostsWithEventSegment.mockResolvedValue(hosts);
    mockGetRoutedUsersWithContactOwnerAndFixedUsers.mockReturnValue(routedUsers);

    const result = await loadUsers({
      eventType: makeEventType({ id: 1, hosts }) as Parameters<typeof loadUsers>[0]["eventType"],
      dynamicUserList: [],
      hostname: "cal.com",
      forcedSlug: undefined,
      isPlatform: false,
      routedTeamMemberIds: [1],
      contactOwnerEmail: null,
    });

    expect(result).toEqual(routedUsers);
  });

  it("throws error when dynamicUserList is empty for dynamic booking", async () => {
    await expect(
      loadUsers({
        eventType: makeEventType({ id: 0 }) as Parameters<typeof loadUsers>[0]["eventType"],
        dynamicUserList: [],
        hostname: "cal.com",
        forcedSlug: undefined,
        isPlatform: false,
        routedTeamMemberIds: null,
        contactOwnerEmail: null,
      })
    ).rejects.toThrow("dynamicUserList is not properly defined or empty.");
  });

  it("passes hostname and forcedSlug to getOrgDomainConfig", async () => {
    mockGetNormalizedHosts.mockReturnValue({ hosts: [], fallbackHosts: [] });
    mockFindMatchingHostsWithEventSegment.mockResolvedValue([]);

    await loadUsers({
      eventType: makeEventType({ id: 1 }) as Parameters<typeof loadUsers>[0]["eventType"],
      dynamicUserList: [],
      hostname: "acme.cal.com",
      forcedSlug: "acme",
      isPlatform: true,
      routedTeamMemberIds: null,
      contactOwnerEmail: null,
    });

    expect(mockGetOrgDomainConfig).toHaveBeenCalledWith({
      hostname: "acme.cal.com",
      forcedSlug: "acme",
      isPlatform: true,
    });
  });
});
