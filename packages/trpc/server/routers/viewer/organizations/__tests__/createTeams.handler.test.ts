import prismock from "../../../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, beforeEach } from "vitest";

import slugify from "@calcom/lib/slugify";
import { MembershipRole, UserPermissionRole, CreationSource } from "@calcom/prisma/enums";

import { createTeamsHandler } from "../createTeams.handler";

// Helper functions for creating test data
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
}) {
  return prismock.team.create({
    data: {
      name: data.name,
      slug: data.slug || slugify(data.name),
      parentId: data.parentId,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      metadata: data.metadata || {},
      isPlatform: data.isPlatform ?? false,
    },
  });
}

async function createTestMembership(data: { userId: number; teamId: number; role?: MembershipRole }) {
  return prismock.membership.create({
    data: {
      userId: data.userId,
      teamId: data.teamId,
      role: data.role || MembershipRole.MEMBER,
      accepted: true,
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
  // Create organization owner
  const owner = await createTestUser({
    email: options.organizationOwner?.email || "owner@example.com",
    role: options.organizationOwner?.role || UserPermissionRole.USER,
  });

  // Create organization
  const organization = await createTestTeam({
    name: options.organization?.name || "Test Organization",
    slug: options.organization?.slug,
    metadata: options.organization?.metadata || { requestedSlug: "test-org" },
  });

  // Set owner's organizationId
  await prismock.user.update({
    where: { id: owner.id },
    data: { organizationId: organization.id },
  });

  // Create organization membership for owner
  await createTestMembership({
    userId: owner.id,
    teamId: organization.id,
    role: MembershipRole.OWNER,
  });

  // Create teams if specified
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

describe("createTeams handler", () => {
  beforeEach(async () => {
    // @ts-expect-error reset is a method on Prismock
    await prismock.reset();
  });

  it("should create teams successfully", async () => {
    const { owner, organization } = await createScenario();

    const result = await createTeamsHandler({
      ctx: {
        user: {
          id: owner.id,
          organizationId: organization.id,
        },
      },
      input: {
        teamNames: ["Team 1", "Team 2"],
        orgId: organization.id,
        moveTeams: [],
        creationSource: CreationSource.WEBAPP,
      },
    });

    expect(result).toEqual({ duplicatedSlugs: [] });

    // Verify teams were created
    const createdTeams = await prismock.team.findMany({
      where: { parentId: organization.id },
    });

    expect(createdTeams).toHaveLength(2);
    expect(createdTeams[0].name).toBe("Team 1");
    expect(createdTeams[0].slug).toBe("team-1");
    expect(createdTeams[1].name).toBe("Team 2");
    expect(createdTeams[1].slug).toBe("team-2");
  });

  it("should handle creation of team in Organization that has same slug as a team already in the same org", async () => {
    const { owner, organization } = await createScenario({
      teams: [{ name: "Team 1", slug: "team-1", addToParentId: "createdOrganization" }],
    });

    const result = await createTeamsHandler({
      ctx: {
        user: {
          id: owner.id,
          organizationId: organization.id,
        },
      },
      input: {
        // Team 1 -> team-1 slug
        // Team 2 -> team-2 slug
        teamNames: ["Team 1", "Team 2"],
        orgId: organization.id,
        moveTeams: [],
        creationSource: CreationSource.WEBAPP,
      },
    });

    // Because team-1 already exists in org, it will not be created again.
    expect(result).toEqual({ duplicatedSlugs: ["team-1"] });

    // Verify only non-duplicate team was created
    const createdTeams = await prismock.team.findMany({
      where: { parentId: organization.id },
    });

    expect(createdTeams).toHaveLength(2); // Original team + Team 2
    expect(createdTeams.map((t) => t.name).sort()).toEqual(["Team 1", "Team 2"]);
  });

  it("should move teams to organization successfully", async () => {
    const { owner, organization, teams } = await createScenario({
      teams: [
        { name: "Team To Move 1", slug: "team-to-move-1", addToParentId: "createdOrganization" },
        { name: "Team To Move 2", slug: "team-to-move-2", addToParentId: "createdOrganization" },
      ],
    });

    const result = await createTeamsHandler({
      ctx: {
        user: {
          id: owner.id,
          organizationId: organization.id,
        },
      },
      input: {
        teamNames: [],
        orgId: organization.id,
        moveTeams: teams.map((team) => ({
          id: team.id,
          shouldMove: true,
          newSlug: `moved-${team.slug}`,
        })),
        creationSource: CreationSource.WEBAPP,
      },
    });

    expect(result).toEqual({ duplicatedSlugs: [] });

    // Verify teams were moved
    const allTeams = await prismock.team.findMany({
      where: { parentId: organization.id },
    });

    expect(allTeams).toHaveLength(2);
    expect(allTeams[0].slug).toBe("moved-team-to-move-1");
    expect(allTeams[1].slug).toBe("moved-team-to-move-2");
  });

  it("should ignore empty team names, for creation", async () => {
    const { owner, organization } = await createScenario();

    const result = await createTeamsHandler({
      ctx: {
        user: {
          id: owner.id,
          organizationId: organization.id,
        },
      },
      input: {
        teamNames: ["", "  ", "Team 1"],
        orgId: organization.id,
        moveTeams: [],
        creationSource: CreationSource.WEBAPP,
      },
    });

    expect(result).toEqual({ duplicatedSlugs: [] });

    // Verify only non-empty team was created
    const createdTeams = await prismock.team.findMany({
      where: { parentId: organization.id },
    });

    expect(createdTeams).toHaveLength(1);
    expect(createdTeams[0].name).toBe("Team 1");
  });

  it("should not move teams belonging to a platform organization", async () => {
    // First create a platform organization
    const platformOrg = await createTestTeam({
      name: "Platform Organization",
      slug: "platform-org",
      metadata: {},
      isPlatform: true,
    });

    const { owner, organization, teams } = await createScenario({
      teams: [
        { name: "Regular Team", addToParentId: "createdOrganization" },
        { name: "Platform Team", addToParentId: platformOrg.id },
      ],
    });

    const result = await createTeamsHandler({
      ctx: {
        user: {
          id: owner.id,
          organizationId: organization.id,
        },
      },
      input: {
        teamNames: [],
        orgId: organization.id,
        moveTeams: teams.map((team) => ({
          id: team.id,
          shouldMove: true,
          newSlug: `moved-${team.slug}`,
        })),
        creationSource: CreationSource.WEBAPP,
      },
    });

    expect(result).toEqual({ duplicatedSlugs: [] });

    // Verify only non-platform team was moved
    const movedTeams = await prismock.team.findMany({
      where: { parentId: organization.id },
    });

    expect(movedTeams).toHaveLength(1);
    expect(movedTeams[0].slug).toBe("moved-regular-team");

    // Verify platform team was not moved
    const platformTeam = await prismock.team.findFirst({
      where: { name: "Platform Team" },
      include: { parent: true },
    });

    expect(platformTeam?.parent?.isPlatform).toBe(true);
    expect(platformTeam?.slug).toBe("platform-team"); // Original slug unchanged
  });
});
