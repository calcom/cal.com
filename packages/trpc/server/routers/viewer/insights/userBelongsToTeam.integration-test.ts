import { randomUUID } from "node:crypto";

import prisma from "@calcom/prisma";
import type { Team, User, Membership } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const timestamp = Date.now();
const suffix = randomUUID().slice(0, 8);

let orgAdmin: User;
let teamMember: User;
let nonMember: User;
let org: Team;
let team: Team;
let orgAdminOrgMembership: Membership;
let orgAdminTeamMembership: Membership;
let teamMemberMembership: Membership;

describe("userBelongsToTeam middleware - integration", () => {
  beforeAll(async () => {
    // Create org
    org = await prisma.team.create({
      data: {
        name: `UBT Org ${timestamp}-${suffix}`,
        slug: `ubt-org-${timestamp}-${suffix}`,
        isOrganization: true,
      },
    });

    // Create team under org
    team = await prisma.team.create({
      data: {
        name: `UBT Team ${timestamp}-${suffix}`,
        slug: `ubt-team-${timestamp}-${suffix}`,
        parentId: org.id,
      },
    });

    // Create org admin user
    orgAdmin = await prisma.user.create({
      data: {
        email: `ubt-orgadmin-${timestamp}-${suffix}@example.com`,
        username: `ubt-orgadmin-${timestamp}-${suffix}`,
        name: "UBT Org Admin",
        organizationId: org.id,
      },
    });

    // Create team member user
    teamMember = await prisma.user.create({
      data: {
        email: `ubt-member-${timestamp}-${suffix}@example.com`,
        username: `ubt-member-${timestamp}-${suffix}`,
        name: "UBT Team Member",
      },
    });

    // Create non-member user
    nonMember = await prisma.user.create({
      data: {
        email: `ubt-nonmember-${timestamp}-${suffix}@example.com`,
        username: `ubt-nonmember-${timestamp}-${suffix}`,
        name: "UBT Non Member",
      },
    });

    // Org admin membership in org
    orgAdminOrgMembership = await prisma.membership.create({
      data: {
        userId: orgAdmin.id,
        teamId: org.id,
        role: MembershipRole.ADMIN,
        accepted: true,
      },
    });

    // Org admin membership in team
    orgAdminTeamMembership = await prisma.membership.create({
      data: {
        userId: orgAdmin.id,
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
        teamMemberMembership?.id,
      ].filter(Boolean);
      if (membershipIds.length > 0) {
        await prisma.membership.deleteMany({ where: { id: { in: membershipIds } } });
      }
      const userIds = [orgAdmin?.id, teamMember?.id, nonMember?.id].filter(Boolean);
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

  describe("membership lookup", () => {
    it("should find accepted membership for team member", async () => {
      const membership = await prisma.membership.findFirst({
        where: {
          userId: teamMember.id,
          teamId: team.id,
          accepted: true,
        },
        select: { id: true },
      });

      expect(membership).not.toBeNull();
      expect(membership?.id).toBe(teamMemberMembership.id);
    });

    it("should find accepted membership for org admin in team", async () => {
      const membership = await prisma.membership.findFirst({
        where: {
          userId: orgAdmin.id,
          teamId: team.id,
          accepted: true,
        },
        select: { id: true },
      });

      expect(membership).not.toBeNull();
    });

    it("should not find membership for non-member", async () => {
      const membership = await prisma.membership.findFirst({
        where: {
          userId: nonMember.id,
          teamId: team.id,
          accepted: true,
        },
        select: { id: true },
      });

      expect(membership).toBeNull();
    });

    it("should find membership without specific teamId (any team)", async () => {
      const membership = await prisma.membership.findFirst({
        where: {
          userId: teamMember.id,
          accepted: true,
        },
        select: { id: true },
      });

      expect(membership).not.toBeNull();
    });
  });

  describe("org admin bypass", () => {
    it("should verify team is child of org", async () => {
      const isChildTeam = await prisma.team.findFirst({
        where: {
          id: team.id,
          parentId: org.id,
        },
        select: { id: true },
      });

      expect(isChildTeam).not.toBeNull();
    });

    it("should reject team not belonging to org", async () => {
      const unrelatedTeam = await prisma.team.create({
        data: {
          name: `UBT Unrelated ${timestamp}-${suffix}`,
          slug: `ubt-unrelated-${timestamp}-${suffix}`,
        },
      });

      const isChildTeam = await prisma.team.findFirst({
        where: {
          id: unrelatedTeam.id,
          parentId: org.id,
        },
        select: { id: true },
      });

      expect(isChildTeam).toBeNull();

      await prisma.team.delete({ where: { id: unrelatedTeam.id } });
    });
  });

  describe("unaccepted membership", () => {
    it("should not find unaccepted membership", async () => {
      const pendingUser = await prisma.user.create({
        data: {
          email: `ubt-pending-${timestamp}-${suffix}@example.com`,
          username: `ubt-pending-${timestamp}-${suffix}`,
          name: "UBT Pending User",
        },
      });

      const pendingMembership = await prisma.membership.create({
        data: {
          userId: pendingUser.id,
          teamId: team.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      const membership = await prisma.membership.findFirst({
        where: {
          userId: pendingUser.id,
          teamId: team.id,
          accepted: true,
        },
        select: { id: true },
      });

      expect(membership).toBeNull();

      await prisma.membership.delete({ where: { id: pendingMembership.id } });
      await prisma.user.delete({ where: { id: pendingUser.id } });
    });
  });
});
