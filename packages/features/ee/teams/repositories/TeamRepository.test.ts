import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { Team } from "@calcom/prisma/client";

import { getTeam, getOrg, TeamRepository } from "./TeamRepository";

const sampleTeamProps = {
  logo: null,
  logoUrl: null,
  calVideoLogo: null,
  appLogo: null,
  appIconLogo: null,
  bio: null,
  description: null,
  hideBranding: false,
  isPrivate: false,
  hideBookATeamMember: false,
  hideTeamProfileLink: false,
  createdAt: new Date(),
  theme: null,
  brandColor: "",
  darkBrandColor: "",
  timeFormat: null,
  timeZone: "",
  weekStart: "",
  parentId: null,
  metadata: null,
  isOrganization: false,
  organizationSettings: null,
  isPlatform: false,
  bannerUrl: null,
  rrResetInterval: 0,
  rrResetOccurrence: 0,
  rrResetLimitOn: null,
  rrResetLimitOccurrences: null,
  rrResetLimitDate: null,
  includeManagedEventsInLimits: false,
  rrTimestampBasis: null,
  pendingPayment: false,
  createdByOAuthClientId: null,
  smsLockState: null,
  smsLockReviewedByAdmin: false,
  bookingLimits: null,
};

describe("TeamRepository", () => {
  let teamRepository: TeamRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    teamRepository = new TeamRepository(prismaMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("findById", () => {
    it("should return null if team is not found", async () => {
      prismaMock.team.findFirst.mockResolvedValue(null);
      const result = await teamRepository.findById({ id: 1 });
      expect(result).toBeNull();
    });

    it("should return parsed team if found", async () => {
      const mockTeam = {
        id: 1,
        name: "Test Team",
        slug: "test-team",
        logoUrl: "test-logo-url",
        parentId: 1,
        metadata: {
          requestedSlug: null,
        },
        isOrganization: true,
        organizationSettings: {},
        isPlatform: true,
        requestedSlug: null,
      };
      prismaMock.team.findFirst.mockResolvedValue(mockTeam as unknown as Team);
      const result = await teamRepository.findById({ id: 1 });
      expect(result).toEqual(mockTeam);
    });
  });

  describe("deleteById", () => {
    it("should delete team and related data", async () => {
      const mockDeletedTeam = { id: 1, name: "Deleted Team" };
      const deleteManyEventTypeMock = vi.fn();
      const deleteManyMembershipMock = vi.fn();
      const deleteTeamMock = vi.fn().mockResolvedValue(mockDeletedTeam as unknown as Team);
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          ...prismaMock,
          eventType: {
            ...prismaMock.eventType,
            deleteMany: deleteManyEventTypeMock,
          },
          membership: {
            ...prismaMock.membership,
            deleteMany: deleteManyMembershipMock,
          },
          team: {
            ...prismaMock.team,
            delete: deleteTeamMock,
          },
        };
        return callback(mockTx);
      });

      const result = await teamRepository.deleteById({ id: 1 });

      expect(deleteManyEventTypeMock).toHaveBeenCalledWith({
        where: {
          teamId: 1,
          schedulingType: "MANAGED",
        },
      });
      expect(deleteManyMembershipMock).toHaveBeenCalledWith({
        where: {
          teamId: 1,
        },
      });
      expect(deleteTeamMock).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(result).toEqual(mockDeletedTeam);
    });
  });

  describe("findAllByParentId", () => {
    it("should return all teams with given parentId", async () => {
      const mockTeams = [{ id: 1 }, { id: 2 }];
      prismaMock.team.findMany.mockResolvedValue(mockTeams as unknown as Team[]);
      const result = await teamRepository.findAllByParentId({ parentId: 1 });
      expect(prismaMock.team.findMany).toHaveBeenCalledWith({
        where: { parentId: 1 },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          parentId: true,
          metadata: true,
          isOrganization: true,
          organizationSettings: true,
          isPlatform: true,
        },
      });
      expect(result).toEqual(mockTeams);
    });
  });

  describe("findTeamWithMembers", () => {
    it("should return team with its members", async () => {
      const mockTeam = { id: 1, members: [] };
      prismaMock.team.findFirst.mockResolvedValue(mockTeam as unknown as Team & { members: [] });
      const result = await teamRepository.findTeamWithMembers(1);
      expect(prismaMock.team.findFirst).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          members: {
            select: {
              accepted: true,
            },
          },
          id: true,
          metadata: true,
          parentId: true,
          isOrganization: true,
        },
      });
      expect(result).toEqual(mockTeam);
    });
  });

  describe("softDelete", () => {
    it("should set deletedAt timestamp on the team", async () => {
      const now = new Date();
      vi.useFakeTimers();
      vi.setSystemTime(now);

      const mockSoftDeletedTeam = {
        id: 1,
        name: "Test Team",
        slug: "test-team",
        deletedAt: now,
      };
      prismaMock.team.update.mockResolvedValue(mockSoftDeletedTeam as unknown as Team);

      const result = await teamRepository.softDelete({ id: 1 });

      expect(prismaMock.team.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: now },
      });
      expect(result).toEqual(mockSoftDeletedTeam);
      expect(result.deletedAt).toEqual(now);

      vi.useRealTimers();
    });
  });

  describe("findSoftDeletedOlderThan", () => {
    it("should find teams soft-deleted older than specified days", async () => {
      const now = new Date("2026-01-26T12:00:00Z");
      vi.useFakeTimers();
      vi.setSystemTime(now);

      const oldDeletedTeam = {
        id: 1,
        name: "Old Deleted Team",
        slug: "old-deleted",
        isOrganization: false,
        deletedAt: new Date("2026-01-10T12:00:00Z"),
      };
      prismaMock.team.findMany.mockResolvedValue([oldDeletedTeam] as unknown as Team[]);

      const result = await teamRepository.findSoftDeletedOlderThan({ days: 15 });

      const expectedCutoffDate = new Date("2026-01-11T12:00:00Z");
      expect(prismaMock.team.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: {
            not: null,
            lt: expectedCutoffDate,
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          isOrganization: true,
          deletedAt: true,
        },
      });
      expect(result).toEqual([oldDeletedTeam]);

      vi.useRealTimers();
    });

    it("should return empty array when no soft-deleted teams exist", async () => {
      prismaMock.team.findMany.mockResolvedValue([]);

      const result = await teamRepository.findSoftDeletedOlderThan({ days: 0 });

      expect(result).toEqual([]);
    });

    it("should find teams for immediate deletion when days is 0", async () => {
      const now = new Date("2026-01-26T12:00:00Z");
      vi.useFakeTimers();
      vi.setSystemTime(now);

      const recentlyDeletedTeam = {
        id: 1,
        name: "Recently Deleted",
        slug: "recently-deleted",
        isOrganization: false,
        deletedAt: new Date("2026-01-26T10:00:00Z"),
      };
      prismaMock.team.findMany.mockResolvedValue([recentlyDeletedTeam] as unknown as Team[]);

      const result = await teamRepository.findSoftDeletedOlderThan({ days: 0 });

      expect(prismaMock.team.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: {
            not: null,
            lt: now,
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          isOrganization: true,
          deletedAt: true,
        },
      });
      expect(result).toEqual([recentlyDeletedTeam]);

      vi.useRealTimers();
    });
  });
});

describe("getOrg", () => {
  it("should return an Organization correctly by slug even if there is a team with the same slug", async () => {
    prismaMock.team.findMany.mockResolvedValue([
      {
        id: 101,
        name: "Test Team",
        slug: "test-slug",
        isOrganization: true,
      } as Team,
    ]);

    const org = await getOrg({
      lookupBy: {
        slug: "test-slug",
      },
      forOrgWithSlug: null,
      teamSelect: {
        id: true,
        slug: true,
      },
    });

    const firstFindManyCallArguments = prismaMock.team.findMany.mock.calls[0];

    expect(firstFindManyCallArguments[0]).toEqual({
      where: {
        slug: "test-slug",
        isOrganization: true,
      },
      select: {
        id: true,
        slug: true,
        metadata: true,
        isOrganization: true,
      },
    });
    expect(org?.isOrganization).toBe(true);
  });

  it("should not return an org result if metadata.isOrganization isn't true", async () => {
    prismaMock.team.findMany.mockResolvedValue([
      {
        ...sampleTeamProps,
        id: 101,
        name: "Test Team",
        slug: "test-slug",
        metadata: {},
      } as Team,
    ]);

    const org = await getOrg({
      lookupBy: {
        slug: "test-slug",
      },
      forOrgWithSlug: null,
      teamSelect: {
        id: true,
        slug: true,
      },
    });

    const firstFindManyCallArguments = prismaMock.team.findMany.mock.calls[0];

    expect(firstFindManyCallArguments[0]).toEqual({
      where: {
        slug: "test-slug",
        isOrganization: true,
      },
      select: {
        id: true,
        slug: true,
        metadata: true,
        isOrganization: true,
      },
    });
    expect(org).toBe(null);
  });

  it("should error if metadata isn't valid", async () => {
    prismaMock.team.findMany.mockResolvedValue([
      {
        ...sampleTeamProps,
        id: 101,
        name: "Test Team",
        slug: "test-slug",
        metadata: [],
      } as Team,
    ]);

    await expect(() =>
      getOrg({
        lookupBy: {
          slug: "test-slug",
        },
        forOrgWithSlug: null,
        teamSelect: {
          id: true,
          slug: true,
        },
      })
    ).rejects.toThrow("invalid_type");
  });
});

describe("getTeam", () => {
  it("should query a team correctly", async () => {
    prismaMock.team.findMany.mockResolvedValue([
      {
        ...sampleTeamProps,
        id: 101,
        name: "Test Team",
        slug: "test-slug",
        metadata: {
          anything: "here",
          paymentId: "1",
        },
      } as Team,
    ]);

    const team = await getTeam({
      lookupBy: {
        slug: "test-slug",
      },
      forOrgWithSlug: null,
      teamSelect: {
        id: true,
        slug: true,
        name: true,
      },
    });

    const firstFindManyCallArguments = prismaMock.team.findMany.mock.calls[0];

    expect(firstFindManyCallArguments[0]).toEqual({
      where: {
        slug: "test-slug",
      },
      select: {
        id: true,
        slug: true,
        name: true,
        metadata: true,
        isOrganization: true,
      },
    });
    expect(team).not.toBeNull();
    // 'anything' is not in the teamMetadata schema, so it should be stripped out
    expect(team?.metadata).toEqual({ paymentId: "1" });
  });

  it("should not return a team result if the queried result isn't a team", async () => {
    prismaMock.team.findMany.mockResolvedValue([
      {
        ...sampleTeamProps,
        id: 101,
        name: "Test Team",
        slug: "test-slug",
        isOrganization: true,
      } as Team,
    ]);

    const team = await getTeam({
      lookupBy: {
        slug: "test-slug",
      },
      forOrgWithSlug: null,
      teamSelect: {
        id: true,
        slug: true,
        name: true,
      },
    });

    const firstFindManyCallArguments = prismaMock.team.findMany.mock.calls[0];

    expect(firstFindManyCallArguments[0]).toEqual({
      where: {
        slug: "test-slug",
      },
      select: {
        id: true,
        slug: true,
        name: true,
        metadata: true,
        isOrganization: true,
      },
    });
    expect(team).toBe(null);
  });

  it("should return a team by slug within an org", async () => {
    prismaMock.team.findMany.mockResolvedValue([
      {
        ...sampleTeamProps,
        id: 101,
        name: "Test Team",
        slug: "test-slug",
        parentId: 100,
        metadata: null,
      } as Team,
    ]);

    await getTeam({
      lookupBy: {
        slug: "team-in-test-org",
      },
      forOrgWithSlug: "test-org",
      teamSelect: {
        id: true,
        slug: true,
        name: true,
      },
    });

    const firstFindManyCallArguments = prismaMock.team.findMany.mock.calls[0];

    expect(firstFindManyCallArguments[0]).toEqual({
      where: {
        slug: "team-in-test-org",
        parent: {
          OR: [
            {
              slug: "test-org",
            },
            {
              metadata: {
                path: ["requestedSlug"],
                equals: "test-org",
              },
            },
          ],
          isOrganization: true,
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        metadata: true,
        isOrganization: true,
      },
    });
  });

  it("should return a team by requestedSlug within an org", async () => {
    prismaMock.team.findMany.mockResolvedValue([]);
    await getTeam({
      lookupBy: {
        slug: "test-team",
      },
      forOrgWithSlug: "test-org",
      teamSelect: {
        id: true,
        slug: true,
        name: true,
      },
    });
    const firstFindManyCallArguments = prismaMock.team.findMany.mock.calls[0];

    expect(firstFindManyCallArguments[0]).toEqual({
      where: {
        slug: "test-team",
        parent: {
          isOrganization: true,
          OR: [
            {
              slug: "test-org",
            },
            {
              metadata: {
                path: ["requestedSlug"],
                equals: "test-org",
              },
            },
          ],
        },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        metadata: true,
        isOrganization: true,
      },
    });
  });
});
