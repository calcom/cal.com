import "@calcom/testing/lib/__mocks__/prisma";
import { describe, it, expect } from "vitest";

import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { hasEditPermissionForUserID, hasReadPermissionsForUserId } from "./hasEditPermissionForUser";

describe("hasEditPermissionForUser integration tests", () => {
  describe("hasEditPermissionForUserID", () => {
    it("returns true when admin of shared team edits a member", async () => {
      const admin = await prisma.user.create({
        data: { email: `admin-${Date.now()}@test.com`, username: `admin-${Date.now()}` },
      });
      const member = await prisma.user.create({
        data: { email: `member-${Date.now()}@test.com`, username: `member-${Date.now()}` },
      });
      const team = await prisma.team.create({
        data: { name: "Shared Team", slug: `shared-${Date.now()}` },
      });

      await prisma.membership.create({
        data: { userId: admin.id, teamId: team.id, role: MembershipRole.ADMIN, accepted: true },
      });
      await prisma.membership.create({
        data: { userId: member.id, teamId: team.id, role: MembershipRole.MEMBER, accepted: true },
      });

      const result = await hasEditPermissionForUserID({
        ctx: { user: { id: admin.id } },
        input: { memberId: member.id },
      });
      expect(result).toBe(true);
    });

    it("returns false when member (non-admin) tries to edit another member", async () => {
      const memberA = await prisma.user.create({
        data: { email: `ma-${Date.now()}@test.com`, username: `ma-${Date.now()}` },
      });
      const memberB = await prisma.user.create({
        data: { email: `mb-${Date.now()}@test.com`, username: `mb-${Date.now()}` },
      });
      const team = await prisma.team.create({
        data: { name: "No Admin Team", slug: `noadmin-${Date.now()}` },
      });

      await prisma.membership.create({
        data: { userId: memberA.id, teamId: team.id, role: MembershipRole.MEMBER, accepted: true },
      });
      await prisma.membership.create({
        data: { userId: memberB.id, teamId: team.id, role: MembershipRole.MEMBER, accepted: true },
      });

      const result = await hasEditPermissionForUserID({
        ctx: { user: { id: memberA.id } },
        input: { memberId: memberB.id },
      });
      expect(result).toBe(false);
    });

    it("returns false when users have no shared teams", async () => {
      const userA = await prisma.user.create({
        data: { email: `ua-${Date.now()}@test.com`, username: `ua-${Date.now()}` },
      });
      const userB = await prisma.user.create({
        data: { email: `ub-${Date.now()}@test.com`, username: `ub-${Date.now()}` },
      });
      const teamA = await prisma.team.create({
        data: { name: "Team A", slug: `ta-${Date.now()}` },
      });
      const teamB = await prisma.team.create({
        data: { name: "Team B", slug: `tb-${Date.now()}` },
      });

      await prisma.membership.create({
        data: { userId: userA.id, teamId: teamA.id, role: MembershipRole.ADMIN, accepted: true },
      });
      await prisma.membership.create({
        data: { userId: userB.id, teamId: teamB.id, role: MembershipRole.MEMBER, accepted: true },
      });

      const result = await hasEditPermissionForUserID({
        ctx: { user: { id: userA.id } },
        input: { memberId: userB.id },
      });
      expect(result).toBe(false);
    });

    it("returns true when owner of shared team edits a member", async () => {
      const owner = await prisma.user.create({
        data: { email: `owner-${Date.now()}@test.com`, username: `owner-${Date.now()}` },
      });
      const target = await prisma.user.create({
        data: { email: `target-${Date.now()}@test.com`, username: `target-${Date.now()}` },
      });
      const team = await prisma.team.create({
        data: { name: "Owned Team", slug: `owned-${Date.now()}` },
      });

      await prisma.membership.create({
        data: { userId: owner.id, teamId: team.id, role: MembershipRole.OWNER, accepted: true },
      });
      await prisma.membership.create({
        data: { userId: target.id, teamId: team.id, role: MembershipRole.MEMBER, accepted: true },
      });

      const result = await hasEditPermissionForUserID({
        ctx: { user: { id: owner.id } },
        input: { memberId: target.id },
      });
      expect(result).toBe(true);
    });
  });

  describe("hasReadPermissionsForUserId", () => {
    it("returns true when users share a team", async () => {
      const readerA = await prisma.user.create({
        data: { email: `ra-${Date.now()}@test.com`, username: `ra-${Date.now()}` },
      });
      const readerB = await prisma.user.create({
        data: { email: `rb-${Date.now()}@test.com`, username: `rb-${Date.now()}` },
      });
      const team = await prisma.team.create({
        data: { name: "Read Team", slug: `read-${Date.now()}` },
      });

      await prisma.membership.create({
        data: { userId: readerA.id, teamId: team.id, role: MembershipRole.MEMBER, accepted: true },
      });
      await prisma.membership.create({
        data: { userId: readerB.id, teamId: team.id, role: MembershipRole.MEMBER, accepted: true },
      });

      const result = await hasReadPermissionsForUserId({
        userId: readerA.id,
        memberId: readerB.id,
      });
      expect(result).toBe(true);
    });

    it("returns false when users are in different teams", async () => {
      const iso1 = await prisma.user.create({
        data: { email: `iso1-${Date.now()}@test.com`, username: `iso1-${Date.now()}` },
      });
      const iso2 = await prisma.user.create({
        data: { email: `iso2-${Date.now()}@test.com`, username: `iso2-${Date.now()}` },
      });
      const team1 = await prisma.team.create({
        data: { name: "Iso Team 1", slug: `iso1-${Date.now()}` },
      });
      const team2 = await prisma.team.create({
        data: { name: "Iso Team 2", slug: `iso2-${Date.now()}` },
      });

      await prisma.membership.create({
        data: { userId: iso1.id, teamId: team1.id, role: MembershipRole.MEMBER, accepted: true },
      });
      await prisma.membership.create({
        data: { userId: iso2.id, teamId: team2.id, role: MembershipRole.MEMBER, accepted: true },
      });

      const result = await hasReadPermissionsForUserId({
        userId: iso1.id,
        memberId: iso2.id,
      });
      expect(result).toBe(false);
    });

    it("returns false when user has no memberships", async () => {
      const loner = await prisma.user.create({
        data: { email: `loner-${Date.now()}@test.com`, username: `loner-${Date.now()}` },
      });
      const other = await prisma.user.create({
        data: { email: `other-${Date.now()}@test.com`, username: `other-${Date.now()}` },
      });
      const team = await prisma.team.create({
        data: { name: "Other Team", slug: `other-${Date.now()}` },
      });

      await prisma.membership.create({
        data: { userId: other.id, teamId: team.id, role: MembershipRole.MEMBER, accepted: true },
      });

      const result = await hasReadPermissionsForUserId({
        userId: loner.id,
        memberId: other.id,
      });
      expect(result).toBe(false);
    });
  });
});
