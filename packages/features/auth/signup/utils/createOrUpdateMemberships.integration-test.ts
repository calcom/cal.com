import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { prisma } from "@calcom/prisma";
import type { Team, User, OrganizationSettings } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

import { createOrUpdateMemberships } from "./createOrUpdateMemberships";

function generateUniqueId() {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

async function createTestUser(data: {
  email: string;
  username: string;
  organizationId?: number | null;
}): Promise<User> {
  const uniqueId = generateUniqueId();
  const uniqueEmail = data.email.includes("@")
    ? data.email.replace("@", `-${uniqueId}@`)
    : `${data.email}-${uniqueId}@example.com`;
  const uniqueUsername = `${data.username}-${uniqueId}`;

  return await prisma.user.create({
    data: {
      email: uniqueEmail,
      username: uniqueUsername,
      organizationId: data.organizationId ?? undefined,
    },
  });
}

async function createTestOrganization(data: {
  name: string;
  slug: string;
  orgAutoAcceptEmail?: string;
}): Promise<Team & { organizationSettings: OrganizationSettings | null }> {
  const uniqueId = generateUniqueId();
  const uniqueSlug = `${data.slug}-${uniqueId}`;

  const team = await prisma.team.create({
    data: {
      name: `${data.name} ${uniqueId}`,
      slug: uniqueSlug,
      isOrganization: true,
    },
  });

  let organizationSettings: OrganizationSettings | null = null;
  if (data.orgAutoAcceptEmail) {
    organizationSettings = await prisma.organizationSettings.create({
      data: {
        organizationId: team.id,
        orgAutoAcceptEmail: data.orgAutoAcceptEmail,
        isOrganizationVerified: true,
      },
    });
  }

  return { ...team, organizationSettings };
}

async function createTestSubteam(data: { name: string; slug: string; parentId: number }): Promise<Team> {
  const uniqueId = generateUniqueId();
  const uniqueSlug = `${data.slug}-${uniqueId}`;

  return await prisma.team.create({
    data: {
      name: `${data.name} ${uniqueId}`,
      slug: uniqueSlug,
      isOrganization: false,
      parentId: data.parentId,
    },
  });
}

describe("createOrUpdateMemberships Integration Tests", () => {
  let testUsers: User[] = [];
  let testTeams: Team[] = [];

  beforeEach(() => {
    testUsers = [];
    testTeams = [];
  });

  afterEach(async () => {
    const userIds = testUsers.map((u) => u.id);
    const teamIds = testTeams.map((t) => t.id);

    if (userIds.length > 0 || teamIds.length > 0) {
      // Clean up in reverse dependency order
      await prisma.profile.deleteMany({
        where: {
          OR: [{ userId: { in: userIds } }, { organizationId: { in: teamIds } }],
        },
      });
      await prisma.membership.deleteMany({
        where: {
          OR: [{ userId: { in: userIds } }, { teamId: { in: teamIds } }],
        },
      });
      await prisma.organizationSettings.deleteMany({
        where: { organizationId: { in: teamIds } },
      });
      await prisma.team.deleteMany({
        where: { id: { in: teamIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }
  });

  function trackUser(user: User): User {
    testUsers.push(user);
    return user;
  }

  function trackTeam(team: Team): Team {
    testTeams.push(team);
    return team;
  }

  describe("Organization Direct Membership", () => {
    it("should create membership and profile when joining an organization directly", async () => {
      // Setup
      const org = trackTeam(
        await createTestOrganization({
          name: "Test Org",
          slug: "test-org",
          orgAutoAcceptEmail: "example.com",
        })
      );

      const user = trackUser(
        await createTestUser({
          email: "user@example.com",
          username: "testuser",
          organizationId: org.id,
        })
      );

      // Act
      await createOrUpdateMemberships({
        user: { id: user.id },
        team: {
          id: org.id,
          parentId: org.parentId,
          isOrganization: org.isOrganization ?? false,
          organizationSettings: { orgAutoAcceptEmail: "example.com" },
        },
      });

      // Assert - membership created with accepted: true
      const membership = await prisma.membership.findUnique({
        where: { userId_teamId: { userId: user.id, teamId: org.id } },
      });
      expect(membership).toBeTruthy();
      expect(membership?.accepted).toBe(true);
      expect(membership?.role).toBe(MembershipRole.MEMBER);

      // Assert - profile created
      const profile = await prisma.profile.findUnique({
        where: {
          userId_organizationId: { userId: user.id, organizationId: org.id },
        },
      });
      expect(profile).toBeTruthy();
      expect(profile?.organizationId).toBe(org.id);
    });
  });

  describe("Sub-Team Membership (within organization)", () => {
    it("should create memberships for both team and parent org when joining a sub-team", async () => {
      // Setup
      const org = trackTeam(
        await createTestOrganization({
          name: "Test Org",
          slug: "test-org",
          orgAutoAcceptEmail: "example.com",
        })
      );

      const subteam = trackTeam(
        await createTestSubteam({
          name: "Sub Team",
          slug: "sub-team",
          parentId: org.id,
        })
      );

      const user = trackUser(
        await createTestUser({
          email: "user@example.com",
          username: "testuser",
          organizationId: org.id, // User already has organizationId set (as done in calcomSignupHandler)
        })
      );

      // Act
      await createOrUpdateMemberships({
        user: { id: user.id },
        team: {
          id: subteam.id,
          parentId: subteam.parentId,
          isOrganization: subteam.isOrganization ?? false,
          organizationSettings: null,
        },
      });

      // Assert - team membership created
      const teamMembership = await prisma.membership.findUnique({
        where: { userId_teamId: { userId: user.id, teamId: subteam.id } },
      });
      expect(teamMembership).toBeTruthy();
      expect(teamMembership?.accepted).toBe(true);

      // Assert - org membership created
      const orgMembership = await prisma.membership.findUnique({
        where: { userId_teamId: { userId: user.id, teamId: org.id } },
      });
      expect(orgMembership).toBeTruthy();
      expect(orgMembership?.accepted).toBe(true);
    });

    it("should create profile for parent org when joining a sub-team", async () => {
      // Setup
      const org = trackTeam(
        await createTestOrganization({
          name: "Test Org",
          slug: "test-org",
          orgAutoAcceptEmail: "example.com",
        })
      );

      const subteam = trackTeam(
        await createTestSubteam({
          name: "Sub Team",
          slug: "sub-team",
          parentId: org.id,
        })
      );

      const user = trackUser(
        await createTestUser({
          email: "user@example.com",
          username: "testuser",
          organizationId: org.id, // User already has organizationId set
        })
      );

      // Act - NOTE: We need to pass parent data for profile creation
      await createOrUpdateMemberships({
        user: { id: user.id },
        team: {
          id: subteam.id,
          parentId: subteam.parentId,
          isOrganization: subteam.isOrganization ?? false,
          organizationSettings: null,
          parent: {
            id: org.id,
            organizationSettings: { orgAutoAcceptEmail: "example.com" },
          },
        },
      });

      // Assert - profile should be created for the parent organization
      const profile = await prisma.profile.findUnique({
        where: {
          userId_organizationId: { userId: user.id, organizationId: org.id },
        },
      });

      // BUG: This assertion will FAIL because profile is not created for sub-team signup
      expect(profile).toBeTruthy();
      expect(profile?.organizationId).toBe(org.id);
    });

    it("should handle user invited to sub-team via invite link (new user flow)", async () => {
      // This simulates the API v2 invite link flow:
      // 1. Token created with identifier: "invite-link-for-teamId-${teamId}"
      // 2. User fills in their email and signs up
      // 3. User should be added to both team and org with proper profile

      // Setup
      const org = trackTeam(
        await createTestOrganization({
          name: "Acme Corp",
          slug: "acme",
          orgAutoAcceptEmail: "acme.com",
        })
      );

      const salesTeam = trackTeam(
        await createTestSubteam({
          name: "Sales Team",
          slug: "sales",
          parentId: org.id,
        })
      );

      // User is created during signup with organizationId already set
      // (this happens in calcomSignupHandler.ts:200-232)
      const newUser = trackUser(
        await createTestUser({
          email: "newuser@acme.com",
          username: "newuser",
          organizationId: org.id,
        })
      );

      // Act - simulate createOrUpdateMemberships call from calcomSignupHandler
      await createOrUpdateMemberships({
        user: { id: newUser.id },
        team: {
          id: salesTeam.id,
          parentId: salesTeam.parentId,
          isOrganization: salesTeam.isOrganization ?? false,
          organizationSettings: null,
          parent: {
            id: org.id,
            organizationSettings: { orgAutoAcceptEmail: "acme.com" },
          },
        },
      });

      // Assert - team membership exists
      const teamMembership = await prisma.membership.findUnique({
        where: { userId_teamId: { userId: newUser.id, teamId: salesTeam.id } },
      });
      expect(teamMembership).toBeTruthy();
      expect(teamMembership?.accepted).toBe(true);

      // Assert - org membership exists
      const orgMembership = await prisma.membership.findUnique({
        where: { userId_teamId: { userId: newUser.id, teamId: org.id } },
      });
      expect(orgMembership).toBeTruthy();
      expect(orgMembership?.accepted).toBe(true);

      // Assert - profile exists for the organization
      // BUG: This will FAIL - the profile is not created for sub-team invites
      const profile = await prisma.profile.findUnique({
        where: {
          userId_organizationId: { userId: newUser.id, organizationId: org.id },
        },
      });
      expect(profile).toBeTruthy();
      expect(profile?.organizationId).toBe(org.id);
      expect(profile?.username).toBe(newUser.username);
    });

    it("should upsert existing memberships when user was previously invited", async () => {
      // Setup - user was invited via email (membership created with accepted: false)
      const org = trackTeam(
        await createTestOrganization({
          name: "Test Org",
          slug: "test-org",
          orgAutoAcceptEmail: "example.com",
        })
      );

      const subteam = trackTeam(
        await createTestSubteam({
          name: "Sub Team",
          slug: "sub-team",
          parentId: org.id,
        })
      );

      const user = trackUser(
        await createTestUser({
          email: "invited@other.com",
          username: "inviteduser",
          organizationId: org.id,
        })
      );

      // Pre-create memberships as they would be created during invite
      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: subteam.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });
      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: org.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      // Act - user completes signup
      await createOrUpdateMemberships({
        user: { id: user.id },
        team: {
          id: subteam.id,
          parentId: subteam.parentId,
          isOrganization: subteam.isOrganization ?? false,
          organizationSettings: null,
          parent: {
            id: org.id,
            organizationSettings: null,
          },
        },
      });

      // Assert - memberships are now accepted
      const teamMembership = await prisma.membership.findUnique({
        where: { userId_teamId: { userId: user.id, teamId: subteam.id } },
      });
      expect(teamMembership?.accepted).toBe(true);

      const orgMembership = await prisma.membership.findUnique({
        where: { userId_teamId: { userId: user.id, teamId: org.id } },
      });
      expect(orgMembership?.accepted).toBe(true);
    });
  });

  describe("Regular Team Membership (not in organization)", () => {
    it("should create only team membership for regular teams", async () => {
      // Setup - regular team without parent org
      const uniqueId = generateUniqueId();
      const regularTeam = trackTeam(
        await prisma.team.create({
          data: {
            name: `Regular Team ${uniqueId}`,
            slug: `regular-team-${uniqueId}`,
            isOrganization: false,
            parentId: null,
          },
        })
      );

      const user = trackUser(
        await createTestUser({
          email: "user@example.com",
          username: "testuser",
        })
      );

      // Act
      await createOrUpdateMemberships({
        user: { id: user.id },
        team: {
          id: regularTeam.id,
          parentId: regularTeam.parentId,
          isOrganization: regularTeam.isOrganization ?? false,
          organizationSettings: null,
        },
      });

      // Assert - team membership created
      const teamMembership = await prisma.membership.findUnique({
        where: { userId_teamId: { userId: user.id, teamId: regularTeam.id } },
      });
      expect(teamMembership).toBeTruthy();
      expect(teamMembership?.accepted).toBe(true);

      // Assert - no profile should be created for regular teams
      const profiles = await prisma.profile.findMany({
        where: { userId: user.id },
      });
      expect(profiles.length).toBe(0);
    });
  });
});
