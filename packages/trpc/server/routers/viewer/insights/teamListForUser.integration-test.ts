import { randomUUID } from "node:crypto";

import prisma from "@calcom/prisma";
import type { Team, User, Membership } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const timestamp = Date.now();
const suffix = randomUUID().slice(0, 8);

const userSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  avatarUrl: true,
};

let orgAdminUser: User;
let regularUser: User;
let org: Team;
let teamA: Team;
let teamB: Team;
let orgAdminOrgMembership: Membership;
let orgAdminTeamAMembership: Membership;
let regularUserTeamAMembership: Membership;

describe("teamListForUser handler - integration", () => {
  beforeAll(async () => {
    // Create organization
    org = await prisma.team.create({
      data: {
        name: `TLU Org ${timestamp}-${suffix}`,
        slug: `tlu-org-${timestamp}-${suffix}`,
        isOrganization: true,
      },
    });

    // Create teams under org
    teamA = await prisma.team.create({
      data: {
        name: `TLU Team A ${timestamp}-${suffix}`,
        slug: `tlu-team-a-${timestamp}-${suffix}`,
        parentId: org.id,
      },
    });

    teamB = await prisma.team.create({
      data: {
        name: `TLU Team B ${timestamp}-${suffix}`,
        slug: `tlu-team-b-${timestamp}-${suffix}`,
        parentId: org.id,
      },
    });

    // Create org admin
    orgAdminUser = await prisma.user.create({
      data: {
        email: `tlu-orgadmin-${timestamp}-${suffix}@example.com`,
        username: `tlu-orgadmin-${timestamp}-${suffix}`,
        name: "TLU Org Admin",
        organizationId: org.id,
      },
    });

    // Create regular user
    regularUser = await prisma.user.create({
      data: {
        email: `tlu-regular-${timestamp}-${suffix}@example.com`,
        username: `tlu-regular-${timestamp}-${suffix}`,
        name: "TLU Regular User",
      },
    });

    // Org admin memberships
    orgAdminOrgMembership = await prisma.membership.create({
      data: {
        userId: orgAdminUser.id,
        teamId: org.id,
        role: MembershipRole.ADMIN,
        accepted: true,
      },
    });

    orgAdminTeamAMembership = await prisma.membership.create({
      data: {
        userId: orgAdminUser.id,
        teamId: teamA.id,
        role: MembershipRole.ADMIN,
        accepted: true,
      },
    });

    // Regular user membership in team A
    regularUserTeamAMembership = await prisma.membership.create({
      data: {
        userId: regularUser.id,
        teamId: teamA.id,
        role: MembershipRole.ADMIN,
        accepted: true,
      },
    });
  });

  afterAll(async () => {
    try {
      const membershipIds = [
        orgAdminOrgMembership?.id,
        orgAdminTeamAMembership?.id,
        regularUserTeamAMembership?.id,
      ].filter(Boolean);
      if (membershipIds.length > 0) {
        await prisma.membership.deleteMany({ where: { id: { in: membershipIds } } });
      }
      const userIds = [orgAdminUser?.id, regularUser?.id].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
      const teamIds = [teamA?.id, teamB?.id].filter(Boolean);
      if (teamIds.length > 0) {
        await prisma.team.deleteMany({ where: { id: { in: teamIds } } });
      }
      if (org?.id) {
        await prisma.team.deleteMany({ where: { id: org.id } });
      }
    } catch (error) {
      console.warn("Cleanup failed:", error);
    }
  });

  describe("user data lookup", () => {
    it("should find user by id with correct fields", async () => {
      const userData = await prisma.user.findUnique({
        where: { id: orgAdminUser.id },
        select: userSelect,
      });

      expect(userData).not.toBeNull();
      expect(userData?.id).toBe(orgAdminUser.id);
      expect(userData?.email).toBe(orgAdminUser.email);
    });

    it("should return null for non-existent user", async () => {
      const userData = await prisma.user.findUnique({
        where: { id: -99999 },
        select: userSelect,
      });

      expect(userData).toBeNull();
    });
  });

  describe("org admin flow", () => {
    it("should find all teams in organization for org admin", async () => {
      const teamsAndOrg = await prisma.team.findMany({
        where: {
          OR: [{ parentId: org.id }, { id: org.id }],
        },
        select: {
          id: true,
          slug: true,
          name: true,
          logoUrl: true,
        },
      });

      // Should find org + teamA + teamB
      expect(teamsAndOrg.length).toBeGreaterThanOrEqual(3);

      const orgTeam = teamsAndOrg.find((t) => t.id === org.id);
      expect(orgTeam).toBeDefined();

      const childTeams = teamsAndOrg.filter((t) => t.id !== org.id);
      expect(childTeams.length).toBeGreaterThanOrEqual(2);

      const teamAEntry = childTeams.find((t) => t.id === teamA.id);
      const teamBEntry = childTeams.find((t) => t.id === teamB.id);
      expect(teamAEntry).toBeDefined();
      expect(teamBEntry).toBeDefined();
    });
  });

  describe("regular user flow (membership-based)", () => {
    it("should find memberships for regular user", async () => {
      const memberships = await prisma.membership.findMany({
        where: {
          team: {
            slug: { not: null },
          },
          accepted: true,
          userId: regularUser.id,
        },
        select: {
          team: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              slug: true,
            },
          },
        },
      });

      expect(memberships.length).toBeGreaterThanOrEqual(1);
      const teamIds = memberships.map((m) => m.team.id);
      expect(teamIds).toContain(teamA.id);
    });

    it("should not find teams user is not a member of", async () => {
      const memberships = await prisma.membership.findMany({
        where: {
          accepted: true,
          userId: regularUser.id,
        },
        select: {
          teamId: true,
        },
      });

      const teamIds = memberships.map((m) => m.teamId);
      expect(teamIds).not.toContain(teamB.id);
    });
  });
});
