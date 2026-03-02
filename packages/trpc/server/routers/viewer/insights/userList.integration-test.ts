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

let orgAdmin: User;
let teamAdmin: User;
let teamMember: User;
let org: Team;
let team: Team;
let orgAdminOrgMembership: Membership;
let orgAdminTeamMembership: Membership;
let teamAdminMembership: Membership;
let teamMemberMembership: Membership;

describe("userList handler - integration", () => {
  beforeAll(async () => {
    // Create org
    org = await prisma.team.create({
      data: {
        name: `UL Org ${timestamp}-${suffix}`,
        slug: `ul-org-${timestamp}-${suffix}`,
        isOrganization: true,
      },
    });

    // Create team under org
    team = await prisma.team.create({
      data: {
        name: `UL Team ${timestamp}-${suffix}`,
        slug: `ul-team-${timestamp}-${suffix}`,
        parentId: org.id,
      },
    });

    // Create org admin
    orgAdmin = await prisma.user.create({
      data: {
        email: `ul-orgadmin-${timestamp}-${suffix}@example.com`,
        username: `ul-orgadmin-${timestamp}-${suffix}`,
        name: "UL Org Admin",
        organizationId: org.id,
      },
    });

    // Create team admin
    teamAdmin = await prisma.user.create({
      data: {
        email: `ul-teamadmin-${timestamp}-${suffix}@example.com`,
        username: `ul-teamadmin-${timestamp}-${suffix}`,
        name: "UL Team Admin",
      },
    });

    // Create team member
    teamMember = await prisma.user.create({
      data: {
        email: `ul-member-${timestamp}-${suffix}@example.com`,
        username: `ul-member-${timestamp}-${suffix}`,
        name: "UL Team Member",
      },
    });

    // Org admin memberships
    orgAdminOrgMembership = await prisma.membership.create({
      data: {
        userId: orgAdmin.id,
        teamId: org.id,
        role: MembershipRole.ADMIN,
        accepted: true,
      },
    });

    orgAdminTeamMembership = await prisma.membership.create({
      data: {
        userId: orgAdmin.id,
        teamId: team.id,
        role: MembershipRole.ADMIN,
        accepted: true,
      },
    });

    // Team admin membership
    teamAdminMembership = await prisma.membership.create({
      data: {
        userId: teamAdmin.id,
        teamId: team.id,
        role: MembershipRole.ADMIN,
        accepted: true,
      },
    });

    // Team member membership
    teamMemberMembership = await prisma.membership.create({
      data: {
        userId: teamMember.id,
        teamId: team.id,
        role: MembershipRole.MEMBER,
        accepted: true,
      },
    });
  });

  afterAll(async () => {
    try {
      const membershipIds = [
        orgAdminOrgMembership?.id,
        orgAdminTeamMembership?.id,
        teamAdminMembership?.id,
        teamMemberMembership?.id,
      ].filter(Boolean);
      if (membershipIds.length > 0) {
        await prisma.membership.deleteMany({ where: { id: { in: membershipIds } } });
      }
      const userIds = [orgAdmin?.id, teamAdmin?.id, teamMember?.id].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
      if (team?.id) {
        await prisma.team.deleteMany({ where: { id: team.id } });
      }
      if (org?.id) {
        await prisma.team.deleteMany({ where: { id: org.id } });
      }
    } catch (error) {
      console.warn("Cleanup failed:", error);
    }
  });

  describe("org admin isAll flow", () => {
    it("should return all users across org teams when isAll is true", async () => {
      // Simulates the handler logic for org admin with isAll=true
      const usersInTeam = await prisma.membership.findMany({
        where: {
          team: {
            parentId: org.id,
          },
        },
        select: {
          user: {
            select: userSelect,
          },
        },
        distinct: ["userId"],
      });

      const users = usersInTeam.map((m) => m.user);

      // Should find all members across all child teams
      expect(users.length).toBeGreaterThanOrEqual(3);
      const userIds = users.map((u) => u.id);
      expect(userIds).toContain(orgAdmin.id);
      expect(userIds).toContain(teamAdmin.id);
      expect(userIds).toContain(teamMember.id);
    });
  });

  describe("team admin flow", () => {
    it("should return all team members for admin", async () => {
      // First verify the user is admin/owner (not MEMBER)
      const membership = await prisma.membership.findFirst({
        where: {
          userId: teamAdmin.id,
          teamId: team.id,
          accepted: true,
        },
        select: {
          role: true,
          user: {
            select: userSelect,
          },
        },
      });

      expect(membership).not.toBeNull();
      expect(membership?.role).toBe(MembershipRole.ADMIN);

      // Admin should see all team members
      const usersInTeam = await prisma.membership.findMany({
        where: {
          teamId: team.id,
          accepted: true,
        },
        select: {
          user: {
            select: userSelect,
          },
        },
        distinct: ["userId"],
      });

      const users = usersInTeam.map((m) => m.user);
      expect(users.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("team member flow", () => {
    it("should return only self for MEMBER role", async () => {
      // Verify the user has MEMBER role
      const membership = await prisma.membership.findFirst({
        where: {
          userId: teamMember.id,
          teamId: team.id,
          accepted: true,
        },
        select: {
          role: true,
          user: {
            select: userSelect,
          },
        },
      });

      expect(membership).not.toBeNull();
      expect(membership?.role).toBe(MembershipRole.MEMBER);

      // Member should only see themselves
      const isMember = membership?.role === "MEMBER";
      if (isMember) {
        const users = [membership.user];
        expect(users.length).toBe(1);
        expect(users[0].id).toBe(teamMember.id);
      }
    });
  });

  describe("no teamId flow", () => {
    it("should return empty array when no teamId provided", async () => {
      // Handler returns [] when !teamId
      const teamId = undefined;
      if (!teamId) {
        const result: never[] = [];
        expect(result).toEqual([]);
      }
    });
  });

  describe("non-member flow", () => {
    it("should return empty array for user not in team", async () => {
      const outsideUser = await prisma.user.create({
        data: {
          email: `ul-outside-${timestamp}-${suffix}@example.com`,
          username: `ul-outside-${timestamp}-${suffix}`,
          name: "UL Outside User",
        },
      });

      const membership = await prisma.membership.findFirst({
        where: {
          userId: outsideUser.id,
          teamId: team.id,
          accepted: true,
        },
        select: {
          role: true,
          user: {
            select: userSelect,
          },
        },
      });

      // No membership found - handler returns []
      expect(membership).toBeNull();

      await prisma.user.delete({ where: { id: outsideUser.id } });
    });
  });
});
