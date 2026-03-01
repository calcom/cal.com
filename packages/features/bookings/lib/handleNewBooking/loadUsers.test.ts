import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/features/ee/organizations/lib/orgDomains", () => ({
  getOrgDomainConfig: vi.fn().mockReturnValue({ currentOrgDomain: null }),
}));

vi.mock("@calcom/features/users/lib/getRoutedUsers", () => ({
  findMatchingHostsWithEventSegment: vi.fn().mockResolvedValue([
    {
      user: { id: 1, email: "host@test.com", name: "Host" },
      isFixed: false,
      priority: 0,
      weight: 100,
      createdAt: new Date(),
      groupId: null,
    },
  ]),
  getNormalizedHosts: vi.fn().mockReturnValue({
    hosts: [{ user: { id: 1, email: "host@test.com" }, isFixed: false }],
    fallbackHosts: [],
  }),
  getRoutedUsersWithContactOwnerAndFixedUsers: vi.fn().mockReturnValue([]),
}));

vi.mock("@calcom/features/users/repositories/UserRepository", () => {
  class MockUserRepository {
    _getWhereClauseForFindingUsersByUsername = vi.fn().mockResolvedValue({ where: {}, profiles: [] });
  }
  return {
    UserRepository: MockUserRepository,
    withSelectedCalendars: vi.fn((user: Record<string, unknown>) => user),
  };
});

vi.mock("@calcom/prisma", () => ({
  default: {
    user: {
      findMany: vi
        .fn()
        .mockResolvedValue([{ id: 1, email: "user@test.com", username: "testuser", name: "Test" }]),
    },
  },
  userSelect: {},
}));

vi.mock("@calcom/prisma/selects/credential", () => ({
  credentialForCalendarServiceSelect: {},
}));

import { loadUsers } from "./loadUsers";

const makeEventType = (overrides = {}) => ({
  id: 1,
  hosts: [{ user: { id: 1 }, isFixed: false }],
  users: [{ id: 1 }],
  schedulingType: null,
  team: null,
  assignAllTeamMembers: false,
  assignRRMembersUsingSegment: false,
  rrSegmentQueryValue: null,
  ...overrides,
});

describe("loadUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads users by event type when eventType.id exists", async () => {
    const result = await loadUsers({
      eventType: makeEventType() as never,
      dynamicUserList: [],
      hostname: "cal.com",
      forcedSlug: undefined,
      isPlatform: false,
      routedTeamMemberIds: null,
      contactOwnerEmail: null,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("id", 1);
  });

  it("loads dynamic users when eventType.id is 0", async () => {
    const result = await loadUsers({
      eventType: makeEventType({ id: 0 }) as never,
      dynamicUserList: ["testuser"],
      hostname: "cal.com",
      forcedSlug: undefined,
      isPlatform: false,
      routedTeamMemberIds: null,
      contactOwnerEmail: null,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("throws when dynamic user list is empty and eventType.id is 0", async () => {
    await expect(
      loadUsers({
        eventType: makeEventType({ id: 0 }) as never,
        dynamicUserList: [],
        hostname: "cal.com",
        forcedSlug: undefined,
        isPlatform: false,
        routedTeamMemberIds: null,
        contactOwnerEmail: null,
      })
    ).rejects.toThrow();
  });

  it("returns routed users when routedTeamMemberIds match", async () => {
    const { getRoutedUsersWithContactOwnerAndFixedUsers } = await import(
      "@calcom/features/users/lib/getRoutedUsers"
    );
    vi.mocked(getRoutedUsersWithContactOwnerAndFixedUsers).mockReturnValue([
      { id: 2, email: "routed@test.com" },
    ] as never);

    const result = await loadUsers({
      eventType: makeEventType() as never,
      dynamicUserList: [],
      hostname: "cal.com",
      forcedSlug: undefined,
      isPlatform: false,
      routedTeamMemberIds: [2],
      contactOwnerEmail: null,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("id", 2);
  });
});
