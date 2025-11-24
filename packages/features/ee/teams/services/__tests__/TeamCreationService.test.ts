import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, beforeEach, vi } from "vitest";

import { CreditService } from "@calcom/features/ee/billing/credit-service";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import { MembershipRole, UserPermissionRole, CreationSource, RedirectType } from "@calcom/prisma/enums";

import { TeamCreationService } from "../TeamCreationService";

async function createTestUser(data: {
  email: string;
  name?: string;
  username?: string;
  role?: UserPermissionRole;
  organizationId?: number | null;
}) {
  return prismock.user.create({
    data: {
      email: data.email,
      name: data.name || "Test User",
      username: data.username || "testuser",
      role: data.role || UserPermissionRole.USER,
      organizationId: data.organizationId,
    },
  });
}

async function createTestTeam(data: {
  name: string;
  slug?: string | null;
  parentId?: number | null;
  metadata?: Record<string, unknown>;
  isPlatform?: boolean;
  isOrganization?: boolean;
}) {
  return prismock.team.create({
    data: {
      name: data.name,
      slug: data.slug || slugify(data.name),
      parentId: data.parentId,
      isOrganization: data.isOrganization ?? false,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      metadata: data.metadata || {},
      isPlatform: data.isPlatform ?? false,
    },
  });
}

async function createTestMembership(data: {
  userId: number;
  teamId: number;
  role?: MembershipRole;
  accepted?: boolean;
}) {
  return prismock.membership.create({
    data: {
      userId: data.userId,
      teamId: data.teamId,
      role: data.role || MembershipRole.MEMBER,
      accepted: data.accepted ?? true,
    },
  });
}

async function createTestProfile(data: { userId: number; organizationId: number; username?: string }) {
  return prismock.profile.create({
    data: {
      userId: data.userId,
      organizationId: data.organizationId,
      username: data.username || `user-${data.userId}`,
      uid: `uid-${data.userId}`,
    },
  });
}

type CreateScenarioOptions = {
  organization?: {
    name: string;
    slug?: string;
    metadata?: Record<string, unknown>;
  };
  organizationOwner?: {
    email?: string;
    role?: UserPermissionRole;
  };
  teams?: Array<{
    name: string;
    slug?: string;
    metadata?: Record<string, unknown>;
    addToParentId: "createdOrganization" | number | null;
  }>;
};

async function createScenario(options: CreateScenarioOptions = {}) {
  const owner = await createTestUser({
    email: options.organizationOwner?.email || "owner@example.com",
    role: options.organizationOwner?.role || UserPermissionRole.USER,
  });

  const organization = await createTestTeam({
    name: options.organization?.name || "Test Organization",
    slug: options.organization?.slug,
    metadata: options.organization?.metadata || { requestedSlug: "test-org" },
    isOrganization: true,
  });

  await prismock.user.update({
    where: { id: owner.id },
    data: { organizationId: organization.id },
  });

  await createTestMembership({
    userId: owner.id,
    teamId: organization.id,
    role: MembershipRole.OWNER,
  });

  const teams: Awaited<ReturnType<typeof createTestTeam>>[] = [];
  if (options.teams) {
    for (const team of options.teams) {
      const createdTeam = await createTestTeam({
        name: team.name,
        slug: team.slug,
        parentId: team.addToParentId === "createdOrganization" ? organization.id : team.addToParentId,
        metadata: team.metadata,
      });
      teams.push(createdTeam);
    }
  }

  return {
    owner,
    organization,
    teams,
  };
}

function createTeamCreationService() {
  const teamRepository = new TeamRepository(prisma);
  const creditService = new CreditService();
  const permissionCheckService = new PermissionCheckService();
  const userRepository = new UserRepository(prisma);
  return new TeamCreationService(teamRepository, creditService, permissionCheckService, userRepository);
}

describe("TeamCreationService - Comprehensive Tests", () => {
  beforeEach(async () => {
    // @ts-expect-error reset is a method on Prismock
    await prismock.reset();
  });

  describe("Organization Validation", () => {
    it("should throw NoOrganizationError when organization does not exist", async () => {
      const service = createTeamCreationService();

      const error = await service
        .createTeamsForOrganization({
          orgId: 99999,
          teamNames: ["Team 1"],
          moveTeams: [],
          creationSource: CreationSource.WEBAPP,
          ownerId: 1,
        })
        .catch((e) => e);

      expect(error).toBeInstanceOf(ErrorWithCode);
      expect(error.code).toBe(ErrorCode.NoOrganizationFound);
      expect(error.message).toBe("no_organization_found");
    });

    it("should throw InvalidMetadataError when organization metadata is invalid", async () => {
      const { owner, organization } = await createScenario({
        organization: {
          name: "Test Org",
          metadata: { invalid: "metadata" },
        },
      });

      await prismock.team.update({
        where: { id: organization.id },
        data: {
          metadata: "invalid-json-string",
        },
      });

      const service = createTeamCreationService();

      const error = await service
        .createTeamsForOrganization({
          orgId: organization.id,
          teamNames: ["Team 1"],
          moveTeams: [],
          creationSource: CreationSource.WEBAPP,
          ownerId: owner.id,
        })
        .catch((e) => e);

      expect(error).toBeInstanceOf(ErrorWithCode);
      expect(error.code).toBe(ErrorCode.InvalidOrganizationMetadata);
      expect(error.message).toBe("invalid_organization_metadata");
    });

    it("should throw NoOrganizationSlugError when organization has no slug or requestedSlug", async () => {
      const { owner, organization } = await createScenario();

      await prismock.team.update({
        where: { id: organization.id },
        data: {
          slug: null,
          metadata: {},
        },
      });

      const service = createTeamCreationService();

      const error = await service
        .createTeamsForOrganization({
          orgId: organization.id,
          teamNames: ["Team 1"],
          moveTeams: [],
          creationSource: CreationSource.WEBAPP,
          ownerId: owner.id,
        })
        .catch((e) => e);

      expect(error).toBeInstanceOf(ErrorWithCode);
      expect(error.code).toBe(ErrorCode.NoOrganizationSlug);
      expect(error.message).toBe("no_organization_slug");
    });

    it("should work when organization has requestedSlug but no slug", async () => {
      const { owner, organization } = await createScenario({
        organization: {
          name: "Test Org",
          slug: undefined,
          metadata: { requestedSlug: "test-org" },
        },
      });

      const service = createTeamCreationService();

      const result = await service.createTeamsForOrganization({
        orgId: organization.id,
        teamNames: ["Team 1"],
        moveTeams: [],
        creationSource: CreationSource.WEBAPP,
        ownerId: owner.id,
      });

      expect(result).toEqual({ duplicatedSlugs: [] });
    });
  });

  describe("Slug Validation", () => {
    it("should detect duplicate slugs from existing teams", async () => {
      const { owner, organization } = await createScenario({
        teams: [{ name: "Existing Team", slug: "existing-team", addToParentId: "createdOrganization" }],
      });

      const service = createTeamCreationService();

      const result = await service.createTeamsForOrganization({
        orgId: organization.id,
        teamNames: ["Existing Team", "New Team"],
        moveTeams: [],
        creationSource: CreationSource.WEBAPP,
        ownerId: owner.id,
      });

      expect(result.duplicatedSlugs).toContain("existing-team");
      expect(result.duplicatedSlugs.length).toBe(1);

      const teams = await prismock.team.findMany({
        where: { parentId: organization.id },
      });

      expect(teams).toHaveLength(2);
    });

    it("should detect duplicate slugs from user usernames in organization", async () => {
      const { owner, organization } = await createScenario();

      const orgUser = await createTestUser({
        email: "orguser@example.com",
        username: "team-name",
        organizationId: organization.id,
      });

      await createTestProfile({
        userId: orgUser.id,
        organizationId: organization.id,
        username: "team-name",
      });

      const service = createTeamCreationService();

      const result = await service.createTeamsForOrganization({
        orgId: organization.id,
        teamNames: ["Team Name", "Another Team"],
        moveTeams: [],
        creationSource: CreationSource.WEBAPP,
        ownerId: owner.id,
      });

      expect(result.duplicatedSlugs).toContain("team-name");
      expect(result.duplicatedSlugs.length).toBe(1);

      const teams = await prismock.team.findMany({
        where: { parentId: organization.id },
      });

      expect(teams).toHaveLength(1);
      expect(teams[0].name).toBe("Another Team");
    });

    it("should return early when all slugs are duplicated", async () => {
      const { owner, organization } = await createScenario({
        teams: [{ name: "Team 1", slug: "team-1", addToParentId: "createdOrganization" }],
      });

      const orgUser = await createTestUser({
        email: "orguser@example.com",
        username: "team-2",
        organizationId: organization.id,
      });

      await createTestProfile({
        userId: orgUser.id,
        organizationId: organization.id,
        username: "team-2",
      });

      const service = createTeamCreationService();

      const result = await service.createTeamsForOrganization({
        orgId: organization.id,
        teamNames: ["Team 1", "Team 2"],
        moveTeams: [],
        creationSource: CreationSource.WEBAPP,
        ownerId: owner.id,
      });

      expect(result.duplicatedSlugs.length).toBe(2);
      expect(result.duplicatedSlugs).toContain("team-1");
      expect(result.duplicatedSlugs).toContain("team-2");

      const teams = await prismock.team.findMany({
        where: { parentId: organization.id },
      });

      expect(teams).toHaveLength(1);
    });
  });

  describe("Team Creation", () => {
    it("should create multiple teams in a transaction", async () => {
      const { owner, organization } = await createScenario();

      const service = createTeamCreationService();

      const result = await service.createTeamsForOrganization({
        orgId: organization.id,
        teamNames: ["Team A", "Team B", "Team C"],
        moveTeams: [],
        creationSource: CreationSource.WEBAPP,
        ownerId: owner.id,
      });

      expect(result).toEqual({ duplicatedSlugs: [] });

      const teams = await prismock.team.findMany({
        where: { parentId: organization.id },
      });

      expect(teams).toHaveLength(3);
      expect(teams.map((t) => t.name).sort()).toEqual(["Team A", "Team B", "Team C"]);

      const memberships = await prismock.membership.findMany({
        where: {
          teamId: { in: teams.map((t) => t.id) },
          userId: owner.id,
        },
      });

      expect(memberships).toHaveLength(3);
      memberships.forEach((membership) => {
        expect(membership.role).toBe(MembershipRole.OWNER);
        expect(membership.accepted).toBe(true);
      });
    });

    it("should filter out empty team names", async () => {
      const { owner, organization } = await createScenario();

      const service = createTeamCreationService();

      const result = await service.createTeamsForOrganization({
        orgId: organization.id,
        teamNames: ["", "  ", "   ", "Valid Team"],
        moveTeams: [],
        creationSource: CreationSource.WEBAPP,
        ownerId: owner.id,
      });

      expect(result).toEqual({ duplicatedSlugs: [] });

      const teams = await prismock.team.findMany({
        where: { parentId: organization.id },
      });

      expect(teams).toHaveLength(1);
      expect(teams[0].name).toBe("Valid Team");
    });
  });

  describe("Team Migration", () => {
    it("should move team and update parentId and slug", async () => {
      const { owner, organization } = await createScenario();

      const teamToMove = await createTestTeam({
        name: "Team To Move",
        slug: "team-to-move",
        parentId: null,
      });

      await createTestMembership({
        userId: owner.id,
        teamId: teamToMove.id,
        role: MembershipRole.OWNER,
      });

      const service = createTeamCreationService();

      await service.moveTeamToOrganization({
        teamId: teamToMove.id,
        newSlug: "moved-team",
        org: {
          id: organization.id,
          slug: organization.slug,
          ownerId: owner.id,
          metadata: organization.metadata,
        },
        creationSource: CreationSource.WEBAPP,
      });

      const movedTeam = await prismock.team.findUnique({
        where: { id: teamToMove.id },
      });

      expect(movedTeam?.parentId).toBe(organization.id);
      expect(movedTeam?.slug).toBe("moved-team");
    });

    it("should use existing slug when newSlug is null", async () => {
      const { owner, organization } = await createScenario();

      const teamToMove = await createTestTeam({
        name: "Team To Move",
        slug: "original-slug",
        parentId: null,
      });

      await createTestMembership({
        userId: owner.id,
        teamId: teamToMove.id,
        role: MembershipRole.OWNER,
      });

      const service = createTeamCreationService();

      await service.moveTeamToOrganization({
        teamId: teamToMove.id,
        newSlug: null,
        org: {
          id: organization.id,
          slug: organization.slug,
          ownerId: owner.id,
          metadata: organization.metadata,
        },
        creationSource: CreationSource.WEBAPP,
      });

      const movedTeam = await prismock.team.findUnique({
        where: { id: teamToMove.id },
      });

      expect(movedTeam?.slug).toBe("original-slug");
    });

    it("should skip teams that should not be moved", async () => {
      const { owner, organization } = await createScenario();

      const team1 = await createTestTeam({
        name: "Team 1",
        slug: "team-1",
        parentId: null,
      });

      const team2 = await createTestTeam({
        name: "Team 2",
        slug: "team-2",
        parentId: null,
      });

      await createTestMembership({
        userId: owner.id,
        teamId: team1.id,
        role: MembershipRole.OWNER,
      });

      await createTestMembership({
        userId: owner.id,
        teamId: team2.id,
        role: MembershipRole.OWNER,
      });

      const service = createTeamCreationService();

      await service.createTeamsForOrganization({
        orgId: organization.id,
        teamNames: [],
        moveTeams: [
          {
            id: team1.id,
            shouldMove: true,
            newSlug: "moved-team-1",
          },
          {
            id: team2.id,
            shouldMove: false,
            newSlug: "moved-team-2",
          },
        ],
        creationSource: CreationSource.WEBAPP,
        ownerId: owner.id,
      });

      const movedTeam1 = await prismock.team.findUnique({
        where: { id: team1.id },
      });
      expect(movedTeam1?.parentId).toBe(organization.id);

      const movedTeam2 = await prismock.team.findUnique({
        where: { id: team2.id },
      });
      expect(movedTeam2?.parentId).toBeNull();
    });

    it("should not move teams belonging to a platform organization", async () => {
      const platformOrg = await createTestTeam({
        name: "Platform Organization",
        slug: "platform-org",
        metadata: {},
        isPlatform: true,
      });

      const { owner, organization } = await createScenario();

      const regularTeam = await createTestTeam({
        name: "Regular Team",
        slug: "regular-team",
        parentId: null,
      });

      const platformTeam = await createTestTeam({
        name: "Platform Team",
        slug: "platform-team",
        parentId: platformOrg.id,
      });

      await createTestMembership({
        userId: owner.id,
        teamId: regularTeam.id,
        role: MembershipRole.OWNER,
      });

      await createTestMembership({
        userId: owner.id,
        teamId: platformTeam.id,
        role: MembershipRole.OWNER,
      });

      const service = createTeamCreationService();

      await service.createTeamsForOrganization({
        orgId: organization.id,
        teamNames: [],
        moveTeams: [
          {
            id: regularTeam.id,
            shouldMove: true,
            newSlug: "moved-regular-team",
          },
          {
            id: platformTeam.id,
            shouldMove: true,
            newSlug: "moved-platform-team",
          },
        ],
        creationSource: CreationSource.WEBAPP,
        ownerId: owner.id,
      });

      const movedTeams = await prismock.team.findMany({
        where: { parentId: organization.id },
      });

      expect(movedTeams).toHaveLength(1);
      expect(movedTeams[0].slug).toBe("moved-regular-team");

      const platformTeamAfter = await prismock.team.findFirst({
        where: { id: platformTeam.id },
        include: { parent: true },
      });

      expect(platformTeamAfter?.parent?.isPlatform).toBe(true);
      expect(platformTeamAfter?.slug).toBe("platform-team");
    });

    it("should handle moving non-existent teams gracefully", async () => {
      const { owner, organization } = await createScenario({
        teams: [{ name: "Existing Team", slug: "existing-team", addToParentId: "createdOrganization" }],
      });

      const nonExistentTeamId = 99999;

      const service = createTeamCreationService();

      const result = await service.createTeamsForOrganization({
        orgId: organization.id,
        teamNames: ["New Team"],
        moveTeams: [
          {
            id: nonExistentTeamId,
            shouldMove: true,
            newSlug: "moved-non-existent",
          },
        ],
        creationSource: CreationSource.WEBAPP,
        ownerId: owner.id,
      });

      expect(result).toEqual({ duplicatedSlugs: [] });

      const createdTeams = await prismock.team.findMany({
        where: { parentId: organization.id },
      });

      expect(createdTeams).toHaveLength(2);
      expect(createdTeams.map((t) => t.name).sort()).toEqual(["Existing Team", "New Team"]);

      const nonExistentTeam = await prismock.team.findFirst({
        where: { slug: "moved-non-existent" },
      });

      expect(nonExistentTeam).toBeNull();
    });

    it("should transfer credits from team to organization when moving team", async () => {
      const { owner, organization, teams } = await createScenario({
        teams: [{ name: "Team With Credits", slug: "team-with-credits", addToParentId: null }],
      });

      const teamToMove = teams[0];

      await prismock.creditBalance.create({
        data: {
          teamId: teamToMove.id,
          additionalCredits: 500,
          limitReachedAt: null,
          warningSentAt: null,
        },
      });

      const service = createTeamCreationService();

      await service.moveTeamToOrganization({
        teamId: teamToMove.id,
        newSlug: "moved-team-with-credits",
        org: {
          id: organization.id,
          slug: organization.slug,
          ownerId: owner.id,
          metadata: organization.metadata,
        },
        creationSource: CreationSource.WEBAPP,
      });

      const teamCreditBalance = await prismock.creditBalance.findFirst({
        where: { teamId: teamToMove.id },
      });
      expect(teamCreditBalance?.additionalCredits).toBe(0);

      const orgCreditBalance = await prismock.creditBalance.findFirst({
        where: { teamId: organization.id },
      });
      expect(orgCreditBalance?.additionalCredits).toBe(500);
    });
  });

  describe("Redirect Creation", () => {
    it("should create redirect when moving team with slug", async () => {
      const { owner, organization } = await createScenario({
        organization: {
          name: "Test Org",
          slug: "test-org",
        },
      });

      const teamToMove = await createTestTeam({
        name: "Team To Move",
        slug: "old-slug",
        parentId: null,
      });

      await createTestMembership({
        userId: owner.id,
        teamId: teamToMove.id,
        role: MembershipRole.OWNER,
      });

      const service = createTeamCreationService();

      await service.moveTeamToOrganization({
        teamId: teamToMove.id,
        newSlug: "new-slug",
        org: {
          id: organization.id,
          slug: organization.slug,
          ownerId: owner.id,
          metadata: organization.metadata,
        },
        creationSource: CreationSource.WEBAPP,
      });

      const redirect = await prismock.tempOrgRedirect.findFirst({
        where: {
          from: "old-slug",
          type: RedirectType.Team,
        },
      });

      expect(redirect).toBeTruthy();
      expect(redirect?.toUrl).toContain("test-org");
      expect(redirect?.toUrl).toContain("new-slug");
    });

    it("should not create redirect for unpublished teams", async () => {
      const { owner, organization } = await createScenario({
        organization: {
          name: "Test Org",
          slug: "test-org",
        },
      });

      const unpublishedTeam = await createTestTeam({
        name: "Unpublished Team",
        slug: null,
        parentId: null,
      });

      await createTestMembership({
        userId: owner.id,
        teamId: unpublishedTeam.id,
        role: MembershipRole.OWNER,
      });

      const service = createTeamCreationService();

      await service.moveTeamToOrganization({
        teamId: unpublishedTeam.id,
        newSlug: "new-slug",
        org: {
          id: organization.id,
          slug: organization.slug,
          ownerId: owner.id,
          metadata: organization.metadata,
        },
        creationSource: CreationSource.WEBAPP,
      });

      const movedTeam = await prismock.team.findFirst({
        where: { id: unpublishedTeam.id },
      });

      expect(movedTeam).toBeTruthy();
      expect(movedTeam?.parentId).toBe(organization.id);
      expect(movedTeam?.slug).toBe("new-slug");

      const redirects = await prismock.tempOrgRedirect.findMany({
        where: {
          // @ts-expect-error - intentionally null
          from: null,
        },
      });

      expect(redirects.length).toBe(0);
    });
  });

  describe("Combined Operations", () => {
    it("should handle creating teams and moving teams in the same call", async () => {
      const { owner, organization } = await createScenario();

      const teamToMove = await createTestTeam({
        name: "Team To Move",
        slug: "team-to-move",
        parentId: null,
      });

      await createTestMembership({
        userId: owner.id,
        teamId: teamToMove.id,
        role: MembershipRole.OWNER,
      });

      const service = createTeamCreationService();

      const result = await service.createTeamsForOrganization({
        orgId: organization.id,
        teamNames: ["New Team 1", "New Team 2"],
        moveTeams: [
          {
            id: teamToMove.id,
            shouldMove: true,
            newSlug: "moved-team",
          },
        ],
        creationSource: CreationSource.WEBAPP,
        ownerId: owner.id,
      });

      expect(result).toEqual({ duplicatedSlugs: [] });

      const allTeams = await prismock.team.findMany({
        where: { parentId: organization.id },
      });

      expect(allTeams).toHaveLength(3);
      expect(allTeams.map((t) => t.name).sort()).toEqual(["New Team 1", "New Team 2", "Team To Move"]);
    });

    it("should process team migrations sequentially", async () => {
      const { owner, organization } = await createScenario();

      const team1 = await createTestTeam({
        name: "Team 1",
        slug: "team-1",
        parentId: null,
      });

      const team2 = await createTestTeam({
        name: "Team 2",
        slug: "team-2",
        parentId: null,
      });

      await createTestMembership({
        userId: owner.id,
        teamId: team1.id,
        role: MembershipRole.OWNER,
      });

      await createTestMembership({
        userId: owner.id,
        teamId: team2.id,
        role: MembershipRole.OWNER,
      });

      const service = createTeamCreationService();

      const result = await service.createTeamsForOrganization({
        orgId: organization.id,
        teamNames: [],
        moveTeams: [
          {
            id: team1.id,
            shouldMove: true,
            newSlug: "moved-team-1",
          },
          {
            id: team2.id,
            shouldMove: true,
            newSlug: "moved-team-2",
          },
        ],
        creationSource: CreationSource.WEBAPP,
        ownerId: owner.id,
      });

      expect(result).toEqual({ duplicatedSlugs: [] });

      const movedTeams = await prismock.team.findMany({
        where: { parentId: organization.id },
      });

      expect(movedTeams).toHaveLength(2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle team with subscription metadata", async () => {
      const { owner, organization } = await createScenario();

      const teamToMove = await createTestTeam({
        name: "Team With Subscription",
        slug: "team-with-sub",
        parentId: null,
        metadata: {
          subscriptionId: "sub_test_123",
        },
      });

      await createTestMembership({
        userId: owner.id,
        teamId: teamToMove.id,
        role: MembershipRole.OWNER,
      });

      const stripeModule = await import("@calcom/features/ee/payments/server/stripe");
      const cancelSpy = vi.spyOn(stripeModule.default.subscriptions, "cancel").mockResolvedValue({} as any);

      const service = createTeamCreationService();

      await service.moveTeamToOrganization({
        teamId: teamToMove.id,
        newSlug: "moved-team",
        org: {
          id: organization.id,
          slug: organization.slug,
          ownerId: owner.id,
          metadata: organization.metadata,
        },
        creationSource: CreationSource.WEBAPP,
      });

      expect(cancelSpy).toHaveBeenCalledWith("sub_test_123");
      cancelSpy.mockRestore();
    });

    it("should handle moving team with multiple members", async () => {
      const { owner, organization } = await createScenario();

      const teamToMove = await createTestTeam({
        name: "Team With Members",
        slug: "team-with-members",
        parentId: null,
      });

      const member1 = await createTestUser({
        email: "member1@example.com",
        organizationId: null,
      });

      const member2 = await createTestUser({
        email: "member2@example.com",
        organizationId: null,
      });

      await createTestMembership({
        userId: owner.id,
        teamId: teamToMove.id,
        role: MembershipRole.OWNER,
      });

      await createTestMembership({
        userId: member1.id,
        teamId: teamToMove.id,
        role: MembershipRole.MEMBER,
      });

      await createTestMembership({
        userId: member2.id,
        teamId: teamToMove.id,
        role: MembershipRole.ADMIN,
      });

      const inviteModule = await import(
        "@calcom/trpc/server/routers/viewer/teams/inviteMember/inviteMember.handler"
      );
      const inviteSpy = vi
        .spyOn(inviteModule, "inviteMembersWithNoInviterPermissionCheck")
        .mockResolvedValue({
          usernameOrEmail: ["member1@example.com", "member2@example.com"],
          numUsersInvited: 2,
        });

      const service = createTeamCreationService();

      await service.moveTeamToOrganization({
        teamId: teamToMove.id,
        newSlug: "moved-team",
        org: {
          id: organization.id,
          slug: organization.slug,
          ownerId: owner.id,
          metadata: organization.metadata,
        },
        creationSource: CreationSource.WEBAPP,
      });

      expect(inviteSpy).toHaveBeenCalled();
      const inviteCall = inviteSpy.mock.calls[0][0];
      expect(inviteCall.invitations).toHaveLength(2);
      expect(inviteCall.invitations.map((i: { usernameOrEmail: string }) => i.usernameOrEmail)).toEqual([
        "member1@example.com",
        "member2@example.com",
      ]);
      inviteSpy.mockRestore();
    });
  });
});
