import { ErrorWithCode } from "@calcom/lib/errors";
import { MembershipRole } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the repositories and external dependencies
vi.mock("@calcom/features/host/repositories/HostRepository");
vi.mock("@calcom/features/membership/repositories/PrismaMembershipRepository");
vi.mock("@calcom/features/eventtypes/repositories/eventTypeRepository");
vi.mock("@calcom/features/routing-forms/lib/findTeamMembersMatchingAttributeLogic");

import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { HostRepository } from "@calcom/features/host/repositories/HostRepository";
import { PrismaMembershipRepository as MembershipRepository } from "@calcom/features/membership/repositories/PrismaMembershipRepository";
import { findTeamMembersMatchingAttributeLogic } from "@calcom/features/routing-forms/lib/findTeamMembersMatchingAttributeLogic";
import { EventTypeHostService } from "./EventTypeHostService";

const mockPrisma = {} as never;

function createService() {
  return new EventTypeHostService(mockPrisma);
}

function getHostRepoInstance(): InstanceType<typeof HostRepository> {
  return (HostRepository as unknown as { mock: { instances: InstanceType<typeof HostRepository>[] } }).mock
    .instances[0];
}

function getMembershipRepoInstance(): InstanceType<typeof MembershipRepository> {
  return (
    MembershipRepository as unknown as {
      mock: { instances: InstanceType<typeof MembershipRepository>[] };
    }
  ).mock.instances[0];
}

function getEventTypeRepoInstance(): InstanceType<typeof EventTypeRepository> {
  return (
    EventTypeRepository as unknown as {
      mock: { instances: InstanceType<typeof EventTypeRepository>[] };
    }
  ).mock.instances[0];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EventTypeHostService", () => {
  describe("getHostsForAvailability", () => {
    it("should map repository items to AvailabilityHost DTOs", async () => {
      const service = createService();
      const hostRepo = getHostRepoInstance();

      vi.mocked(hostRepo.findHostsPaginatedIncludeUser).mockResolvedValue({
        items: [
          {
            userId: 1,
            isFixed: true,
            priority: 2,
            weight: 150,
            scheduleId: 10,
            groupId: "g1",
            user: { name: "Alice", avatarUrl: "https://example.com/alice.png", timeZone: "UTC" },
          },
        ],
        nextCursor: undefined,
        hasMore: false,
      });

      const result = await service.getHostsForAvailability({
        eventTypeId: 100,
        limit: 20,
      });

      expect(hostRepo.findHostsPaginatedIncludeUser).toHaveBeenCalledWith({
        eventTypeId: 100,
        cursor: undefined,
        limit: 20,
        search: undefined,
      });
      expect(result.hosts).toHaveLength(1);
      expect(result.hosts[0]).toEqual({
        userId: 1,
        isFixed: true,
        priority: 2,
        weight: 150,
        scheduleId: 10,
        groupId: "g1",
        name: "Alice",
        avatarUrl: "https://example.com/alice.png",
      });
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it("should default priority to 0 and weight to 100 when null", async () => {
      const service = createService();
      const hostRepo = getHostRepoInstance();

      vi.mocked(hostRepo.findHostsPaginatedIncludeUser).mockResolvedValue({
        items: [
          {
            userId: 2,
            isFixed: false,
            priority: null,
            weight: null,
            scheduleId: null,
            groupId: null,
            user: { name: null, avatarUrl: null, timeZone: "UTC" },
          },
        ],
        nextCursor: undefined,
        hasMore: false,
      });

      const result = await service.getHostsForAvailability({ eventTypeId: 1, limit: 10 });

      expect(result.hosts[0].priority).toBe(0);
      expect(result.hosts[0].weight).toBe(100);
    });

    it("should pass pagination params through", async () => {
      const service = createService();
      const hostRepo = getHostRepoInstance();

      vi.mocked(hostRepo.findHostsPaginatedIncludeUser).mockResolvedValue({
        items: [],
        nextCursor: undefined,
        hasMore: false,
      });

      await service.getHostsForAvailability({
        eventTypeId: 5,
        cursor: 42,
        limit: 10,
        search: "test",
      });

      expect(hostRepo.findHostsPaginatedIncludeUser).toHaveBeenCalledWith({
        eventTypeId: 5,
        cursor: 42,
        limit: 10,
        search: "test",
      });
    });
  });

  describe("getHostsForAssignment", () => {
    it("should map repository items to AssignmentHost DTOs with email", async () => {
      const service = createService();
      const hostRepo = getHostRepoInstance();

      vi.mocked(hostRepo.findHostsPaginatedIncludeUserForAssignment).mockResolvedValue({
        items: [
          {
            userId: 1,
            isFixed: false,
            priority: 3,
            weight: 200,
            scheduleId: null,
            groupId: null,
            user: { name: "Bob", email: "bob@test.com", avatarUrl: null },
          },
        ],
        nextCursor: undefined,
        hasMore: false,
        hasFixedHosts: false,
      });

      const result = await service.getHostsForAssignment({
        eventTypeId: 100,
        limit: 20,
      });

      expect(result.hosts[0].email).toBe("bob@test.com");
      expect(result.hosts[0].name).toBe("Bob");
      expect(result.hasFixedHosts).toBe(false);
    });

    it("should include hasFixedHosts only when defined", async () => {
      const service = createService();
      const hostRepo = getHostRepoInstance();

      vi.mocked(hostRepo.findHostsPaginatedIncludeUserForAssignment).mockResolvedValue({
        items: [],
        nextCursor: undefined,
        hasMore: false,
        hasFixedHosts: undefined,
      });

      const result = await service.getHostsForAssignment({
        eventTypeId: 100,
        limit: 20,
      });

      expect(result).not.toHaveProperty("hasFixedHosts");
    });

    it("should pass memberUserIds to repository", async () => {
      const service = createService();
      const hostRepo = getHostRepoInstance();

      vi.mocked(hostRepo.findHostsPaginatedIncludeUserForAssignment).mockResolvedValue({
        items: [],
        nextCursor: undefined,
        hasMore: false,
        hasFixedHosts: undefined,
      });

      await service.getHostsForAssignment({
        eventTypeId: 1,
        limit: 10,
        memberUserIds: [1, 2, 3],
      });

      expect(hostRepo.findHostsPaginatedIncludeUserForAssignment).toHaveBeenCalledWith(
        expect.objectContaining({ memberUserIds: [1, 2, 3] })
      );
    });
  });

  describe("getChildrenForAssignment", () => {
    it("should map children to AssignmentChild DTOs (null owners filtered at DB level)", async () => {
      const service = createService();
      const hostRepo = getHostRepoInstance();

      vi.mocked(hostRepo.findChildrenForAssignmentPaginated).mockResolvedValue({
        items: [
          {
            id: 10,
            slug: "child-1",
            hidden: false,
            owner: { id: 1, name: "Alice", email: "alice@test.com", username: "alice", avatarUrl: null },
          },
          {
            id: 11,
            slug: "child-2",
            hidden: true,
            owner: { id: 2, name: "Bob", email: "bob@test.com", username: "bob", avatarUrl: null },
          },
        ],
        nextCursor: undefined,
        hasMore: false,
      });

      const result = await service.getChildrenForAssignment({
        eventTypeId: 100,
        limit: 20,
      });

      expect(result.children).toHaveLength(2);
      expect(result.children[0]).toEqual({
        childEventTypeId: 10,
        slug: "child-1",
        hidden: false,
        owner: {
          id: 1,
          name: "Alice",
          email: "alice@test.com",
          username: "alice",
          avatarUrl: null,
        },
      });
      expect(result.children[1]).toEqual({
        childEventTypeId: 11,
        slug: "child-2",
        hidden: true,
        owner: {
          id: 2,
          name: "Bob",
          email: "bob@test.com",
          username: "bob",
          avatarUrl: null,
        },
      });
    });
  });

  describe("searchTeamMembers", () => {
    it("should throw FORBIDDEN if user is not a member of the team", async () => {
      const service = createService();
      const membershipRepo = getMembershipRepoInstance();

      vi.mocked(membershipRepo.hasMembership).mockResolvedValue(false);

      await expect(
        service.searchTeamMembers({
          teamId: 1,
          userId: 99,
          limit: 10,
        })
      ).rejects.toThrow(ErrorWithCode);

      await expect(
        service.searchTeamMembers({
          teamId: 1,
          userId: 99,
          limit: 10,
        })
      ).rejects.toMatchObject({ code: "forbidden_error" });
    });

    it("should return mapped team members when user is authorized", async () => {
      const service = createService();
      const membershipRepo = getMembershipRepoInstance();

      vi.mocked(membershipRepo.hasMembership).mockResolvedValue(true);
      vi.mocked(membershipRepo.searchMembers).mockResolvedValue({
        memberships: [
          {
            user: {
              id: 5,
              name: "Charlie",
              email: "charlie@test.com",
              avatarUrl: null,
              username: "charlie",
              defaultScheduleId: 1,
            },
            role: MembershipRole.MEMBER,
          },
        ],
        nextCursor: undefined,
        hasMore: false,
      });

      const result = await service.searchTeamMembers({
        teamId: 1,
        userId: 10,
        limit: 20,
      });

      expect(result.members).toHaveLength(1);
      expect(result.members[0]).toEqual({
        userId: 5,
        name: "Charlie",
        email: "charlie@test.com",
        avatarUrl: null,
        username: "charlie",
        defaultScheduleId: 1,
        role: MembershipRole.MEMBER,
      });
    });

    it("should pass search and memberUserIds to repository", async () => {
      const service = createService();
      const membershipRepo = getMembershipRepoInstance();

      vi.mocked(membershipRepo.hasMembership).mockResolvedValue(true);
      vi.mocked(membershipRepo.searchMembers).mockResolvedValue({
        memberships: [],
        nextCursor: undefined,
        hasMore: false,
      });

      await service.searchTeamMembers({
        teamId: 1,
        userId: 10,
        limit: 20,
        search: "test",
        memberUserIds: [1, 2],
      });

      expect(membershipRepo.searchMembers).toHaveBeenCalledWith({
        teamId: 1,
        search: "test",
        cursor: undefined,
        limit: 20,
        memberUserIds: [1, 2],
      });
    });
  });

  describe("exportHostsForWeights", () => {
    it("should derive teamId from event type instead of trusting input", async () => {
      const service = createService();
      const eventTypeRepo = getEventTypeRepoInstance();
      const hostRepo = getHostRepoInstance();

      vi.mocked(eventTypeRepo.getTeamIdByEventTypeId).mockResolvedValue({ teamId: 42 });
      vi.mocked(hostRepo.findAllRoundRobinHosts).mockResolvedValue([]);

      await service.exportHostsForWeights({
        eventTypeId: 100,
        assignAllTeamMembers: false,
        organizationId: null,
      });

      expect(eventTypeRepo.getTeamIdByEventTypeId).toHaveBeenCalledWith({ id: 100 });
    });

    it("should fetch team members when assignAllTeamMembers is true", async () => {
      const service = createService();
      const eventTypeRepo = getEventTypeRepoInstance();
      const membershipRepo = getMembershipRepoInstance();

      vi.mocked(eventTypeRepo.getTeamIdByEventTypeId).mockResolvedValue({ teamId: 42 });
      vi.mocked(membershipRepo.findAcceptedMembersWithUserProfile).mockResolvedValue([
        {
          user: { id: 1, name: "Alice", email: "alice@test.com", avatarUrl: null },
        },
        {
          user: { id: 2, name: "Bob", email: "bob@test.com", avatarUrl: null },
        },
      ]);

      const result = await service.exportHostsForWeights({
        eventTypeId: 100,
        assignAllTeamMembers: true,
        organizationId: null,
      });

      expect(membershipRepo.findAcceptedMembersWithUserProfile).toHaveBeenCalledWith({ teamId: 42 });
      expect(result.members).toHaveLength(2);
      expect(result.members[0].weight).toBeNull();
      expect(result.members[1].weight).toBeNull();
    });

    it("should fetch round robin hosts when assignAllTeamMembers is false", async () => {
      const service = createService();
      const eventTypeRepo = getEventTypeRepoInstance();
      const hostRepo = getHostRepoInstance();

      vi.mocked(eventTypeRepo.getTeamIdByEventTypeId).mockResolvedValue({ teamId: 42 });
      vi.mocked(hostRepo.findAllRoundRobinHosts).mockResolvedValue([
        {
          userId: 1,
          weight: 150,
          user: { name: "Alice", email: "alice@test.com", avatarUrl: null },
        },
      ]);

      const result = await service.exportHostsForWeights({
        eventTypeId: 100,
        assignAllTeamMembers: false,
        organizationId: null,
      });

      expect(hostRepo.findAllRoundRobinHosts).toHaveBeenCalledWith({ eventTypeId: 100 });
      expect(result.members).toHaveLength(1);
      expect(result.members[0].weight).toBe(150);
    });

    it("should default host weight to 100 when null", async () => {
      const service = createService();
      const eventTypeRepo = getEventTypeRepoInstance();
      const hostRepo = getHostRepoInstance();

      vi.mocked(eventTypeRepo.getTeamIdByEventTypeId).mockResolvedValue({ teamId: 42 });
      vi.mocked(hostRepo.findAllRoundRobinHosts).mockResolvedValue([
        {
          userId: 1,
          weight: null,
          user: { name: "Alice", email: "alice@test.com", avatarUrl: null },
        },
      ]);

      const result = await service.exportHostsForWeights({
        eventTypeId: 100,
        assignAllTeamMembers: false,
        organizationId: null,
      });

      expect(result.members[0].weight).toBe(100);
    });

    it("should filter by segment members when segment filtering is enabled", async () => {
      const service = createService();
      const eventTypeRepo = getEventTypeRepoInstance();
      const hostRepo = getHostRepoInstance();

      vi.mocked(eventTypeRepo.getTeamIdByEventTypeId).mockResolvedValue({ teamId: 42 });
      vi.mocked(hostRepo.findAllRoundRobinHosts).mockResolvedValue([
        { userId: 1, weight: 100, user: { name: "Alice", email: "alice@test.com", avatarUrl: null } },
        { userId: 2, weight: 200, user: { name: "Bob", email: "bob@test.com", avatarUrl: null } },
        { userId: 3, weight: 50, user: { name: "Charlie", email: "charlie@test.com", avatarUrl: null } },
      ]);
      vi.mocked(findTeamMembersMatchingAttributeLogic).mockResolvedValue({
        teamMembersMatchingAttributeLogic: [
          { odataUserId: 1, odataEmail: "alice@test.com", userId: 1 },
          { odataUserId: 3, odataEmail: "charlie@test.com", userId: 3 },
        ],
        mainAttributeLogicBuildingWarnings: [],
        troubleshooter: null,
      } as never);

      const result = await service.exportHostsForWeights({
        eventTypeId: 100,
        assignAllTeamMembers: false,
        assignRRMembersUsingSegment: true,
        attributesQueryValue: { type: "group" } as never,
        organizationId: 999,
      });

      expect(findTeamMembersMatchingAttributeLogic).toHaveBeenCalledWith(
        { teamId: 42, attributesQueryValue: { type: "group" }, orgId: 999 },
        { enablePerf: false }
      );
      // Only Alice (1) and Charlie (3) should remain
      expect(result.members).toHaveLength(2);
      expect(result.members.map((m) => m.userId)).toEqual([1, 3]);
    });

    it("should skip segment filtering when organizationId is null", async () => {
      const service = createService();
      const eventTypeRepo = getEventTypeRepoInstance();
      const hostRepo = getHostRepoInstance();

      vi.mocked(eventTypeRepo.getTeamIdByEventTypeId).mockResolvedValue({ teamId: 42 });
      vi.mocked(hostRepo.findAllRoundRobinHosts).mockResolvedValue([
        { userId: 1, weight: 100, user: { name: "Alice", email: "alice@test.com", avatarUrl: null } },
      ]);

      const result = await service.exportHostsForWeights({
        eventTypeId: 100,
        assignAllTeamMembers: false,
        assignRRMembersUsingSegment: true,
        attributesQueryValue: { type: "group" } as never,
        organizationId: null,
      });

      expect(findTeamMembersMatchingAttributeLogic).not.toHaveBeenCalled();
      expect(result.members).toHaveLength(1);
    });

    it("should return empty members when event type has no teamId and assignAllTeamMembers is false", async () => {
      const service = createService();
      const eventTypeRepo = getEventTypeRepoInstance();
      const hostRepo = getHostRepoInstance();

      vi.mocked(eventTypeRepo.getTeamIdByEventTypeId).mockResolvedValue({ teamId: null });
      vi.mocked(hostRepo.findAllRoundRobinHosts).mockResolvedValue([]);

      const result = await service.exportHostsForWeights({
        eventTypeId: 100,
        assignAllTeamMembers: false,
        organizationId: null,
      });

      expect(result.members).toHaveLength(0);
    });
  });

  describe("getAllHosts", () => {
    it("should map repository items to AvailabilityHost DTOs with email", async () => {
      const service = createService();
      const hostRepo = getHostRepoInstance();

      vi.mocked(hostRepo.findAllHostsIncludeUser).mockResolvedValue([
        {
          userId: 1,
          isFixed: true,
          priority: 2,
          weight: 150,
          scheduleId: 10,
          groupId: "g1",
          user: { name: "Alice", email: "alice@test.com", avatarUrl: "https://example.com/alice.png" },
        },
        {
          userId: 2,
          isFixed: false,
          priority: 1,
          weight: 200,
          scheduleId: null,
          groupId: null,
          user: { name: "Bob", email: "bob@test.com", avatarUrl: null },
        },
      ]);

      const result = await service.getAllHosts({ eventTypeId: 100 });

      expect(hostRepo.findAllHostsIncludeUser).toHaveBeenCalledWith({ eventTypeId: 100 });
      expect(result.hosts).toHaveLength(2);
      expect(result.hosts[0]).toEqual({
        userId: 1,
        isFixed: true,
        priority: 2,
        weight: 150,
        scheduleId: 10,
        groupId: "g1",
        name: "Alice",
        email: "alice@test.com",
        avatarUrl: "https://example.com/alice.png",
      });
      expect(result.hosts[1]).toEqual({
        userId: 2,
        isFixed: false,
        priority: 1,
        weight: 200,
        scheduleId: null,
        groupId: null,
        name: "Bob",
        email: "bob@test.com",
        avatarUrl: null,
      });
    });

    it("should default priority to 0 and weight to 100 when null", async () => {
      const service = createService();
      const hostRepo = getHostRepoInstance();

      vi.mocked(hostRepo.findAllHostsIncludeUser).mockResolvedValue([
        {
          userId: 3,
          isFixed: false,
          priority: null,
          weight: null,
          scheduleId: null,
          groupId: null,
          user: { name: null, email: "user3@test.com", avatarUrl: null },
        },
      ]);

      const result = await service.getAllHosts({ eventTypeId: 1 });

      expect(result.hosts[0].priority).toBe(0);
      expect(result.hosts[0].weight).toBe(100);
    });

    it("should return empty hosts array when no hosts exist", async () => {
      const service = createService();
      const hostRepo = getHostRepoInstance();

      vi.mocked(hostRepo.findAllHostsIncludeUser).mockResolvedValue([]);

      const result = await service.getAllHosts({ eventTypeId: 999 });

      expect(result.hosts).toHaveLength(0);
    });
  });

  describe("getAllChildrenForAssignment", () => {
    it("should map repository items to AssignmentChild DTOs", async () => {
      const service = createService();
      const hostRepo = getHostRepoInstance();

      vi.mocked(hostRepo.findAllChildrenForAssignment).mockResolvedValue([
        {
          id: 10,
          slug: "child-1",
          hidden: false,
          owner: { id: 1, name: "Alice", email: "alice@test.com", username: "alice", avatarUrl: null },
        },
        {
          id: 11,
          slug: "child-2",
          hidden: true,
          owner: {
            id: 2,
            name: "Bob",
            email: "bob@test.com",
            username: "bob",
            avatarUrl: "https://example.com/bob.png",
          },
        },
      ]);

      const result = await service.getAllChildrenForAssignment({ eventTypeId: 100 });

      expect(hostRepo.findAllChildrenForAssignment).toHaveBeenCalledWith({ eventTypeId: 100 });
      expect(result.children).toHaveLength(2);
      expect(result.children[0]).toEqual({
        childEventTypeId: 10,
        slug: "child-1",
        hidden: false,
        owner: {
          id: 1,
          name: "Alice",
          email: "alice@test.com",
          username: "alice",
          avatarUrl: null,
        },
      });
      expect(result.children[1]).toEqual({
        childEventTypeId: 11,
        slug: "child-2",
        hidden: true,
        owner: {
          id: 2,
          name: "Bob",
          email: "bob@test.com",
          username: "bob",
          avatarUrl: "https://example.com/bob.png",
        },
      });
    });

    it("should return empty children array when no children exist", async () => {
      const service = createService();
      const hostRepo = getHostRepoInstance();

      vi.mocked(hostRepo.findAllChildrenForAssignment).mockResolvedValue([]);

      const result = await service.getAllChildrenForAssignment({ eventTypeId: 999 });

      expect(result.children).toHaveLength(0);
    });
  });
});
