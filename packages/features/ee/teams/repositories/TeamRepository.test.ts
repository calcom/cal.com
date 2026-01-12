import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { Team } from "@calcom/prisma/client";
import { RedirectType } from "@calcom/prisma/enums";

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
      prismaMock.team.findUnique.mockResolvedValue(null);
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
      prismaMock.team.findUnique.mockResolvedValue(mockTeam as unknown as Team);
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
      prismaMock.team.findUnique.mockResolvedValue(mockTeam as unknown as Team & { members: [] });
      const result = await teamRepository.findTeamWithMembers(1);
      expect(prismaMock.team.findUnique).toHaveBeenCalledWith({
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

  describe("findTeamForMigration", () => {
    it("should return team with parent and members for migration", async () => {
      const mockTeam = {
        id: 1,
        slug: "test-team",
        metadata: {},
        parent: {
          id: 10,
          isPlatform: false,
        },
        members: [
          {
            role: "OWNER",
            userId: 1,
            user: {
              email: "owner@example.com",
            },
          },
        ],
      };
      prismaMock.team.findUnique.mockResolvedValue(mockTeam as unknown as Team);
      const result = await teamRepository.findTeamForMigration({ teamId: 1 });
      expect(prismaMock.team.findUnique).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        select: {
          id: true,
          slug: true,
          metadata: true,
          parent: {
            select: {
              id: true,
              isPlatform: true,
            },
          },
          members: {
            select: {
              role: true,
              userId: true,
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
      });
      expect(result).toEqual(mockTeam);
    });

    it("should return null if team is not found", async () => {
      prismaMock.team.findUnique.mockResolvedValue(null);
      const result = await teamRepository.findTeamForMigration({ teamId: 999 });
      expect(result).toBeNull();
    });
  });

  describe("updateTeamSlugAndParent", () => {
    it("should update team slug and parentId", async () => {
      const mockUpdatedTeam = {
        id: 1,
        slug: "new-slug",
        parentId: 10,
      };
      prismaMock.team.update.mockResolvedValue(mockUpdatedTeam as unknown as Team);
      const result = await teamRepository.updateTeamSlugAndParent({
        teamId: 1,
        slug: "new-slug",
        parentId: 10,
      });
      expect(prismaMock.team.update).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: {
          slug: "new-slug",
          parentId: 10,
        },
      });
      expect(result).toEqual(mockUpdatedTeam);
    });

    it("should handle null slug", async () => {
      const mockUpdatedTeam = {
        id: 1,
        slug: null,
        parentId: 10,
      };
      prismaMock.team.update.mockResolvedValue(mockUpdatedTeam as unknown as Team);
      const result = await teamRepository.updateTeamSlugAndParent({
        teamId: 1,
        slug: null,
        parentId: 10,
      });
      expect(prismaMock.team.update).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: {
          slug: null,
          parentId: 10,
        },
      });
      expect(result).toEqual(mockUpdatedTeam);
    });
  });

  describe("upsertTeamRedirect", () => {
    it("should create redirect when it doesn't exist", async () => {
      const mockRedirect = {
        id: 1,
        type: RedirectType.Team,
        from: "old-slug",
        fromOrgId: 0,
        toUrl: "https://test-org.cal.com/new-slug",
      };
      prismaMock.tempOrgRedirect.upsert.mockResolvedValue(mockRedirect as any);
      const result = await teamRepository.upsertTeamRedirect({
        oldTeamSlug: "old-slug",
        teamSlug: "new-slug",
        orgSlug: "test-org",
      });
      expect(prismaMock.tempOrgRedirect.upsert).toHaveBeenCalledWith({
        where: {
          from_type_fromOrgId: {
            type: RedirectType.Team,
            from: "old-slug",
            fromOrgId: 0,
          },
        },
        create: {
          type: RedirectType.Team,
          from: "old-slug",
          fromOrgId: 0,
          toUrl: expect.stringContaining("test-org"),
        },
        update: {
          toUrl: expect.stringContaining("test-org"),
        },
      });
      expect(result).toEqual(mockRedirect);
    });

    it("should update redirect when it already exists", async () => {
      const mockRedirect = {
        id: 1,
        type: RedirectType.Team,
        from: "old-slug",
        fromOrgId: 0,
        toUrl: "https://test-org.cal.com/updated-slug",
      };
      prismaMock.tempOrgRedirect.upsert.mockResolvedValue(mockRedirect as any);
      const result = await teamRepository.upsertTeamRedirect({
        oldTeamSlug: "old-slug",
        teamSlug: "updated-slug",
        orgSlug: "test-org",
      });
      expect(prismaMock.tempOrgRedirect.upsert).toHaveBeenCalled();
      expect(result.toUrl).toContain("updated-slug");
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
