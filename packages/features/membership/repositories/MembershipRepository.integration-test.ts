import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { MembershipRepository } from "./MembershipRepository";

const createdMembershipIds: number[] = [];
let testTeamId: number;
let createdTeamId: number | null = null;

async function clearTestMemberships() {
  if (createdMembershipIds.length > 0) {
    await prisma.membership.deleteMany({
      where: { id: { in: createdMembershipIds } },
    });
    createdMembershipIds.length = 0;
  }
}

describe("MembershipRepository (Integration Tests)", () => {
  beforeAll(async () => {
    let testTeam = await prisma.team.findFirst({
      where: { slug: { not: null } },
    });

    if (!testTeam) {
      testTeam = await prisma.team.create({
        data: {
          name: "Test Team for MembershipRepository",
          slug: `test-team-membership-repo-${Date.now()}`,
        },
      });
      createdTeamId = testTeam.id;
    }
    testTeamId = testTeam.id;
  });

  afterAll(async () => {
    if (createdTeamId) {
      await prisma.team.delete({ where: { id: createdTeamId } });
    }
  });

  afterEach(async () => {
    await clearTestMemberships();
  });

  describe("hasPendingInviteByUserId", () => {
    it("should return true when user has a pending invite (accepted: false)", async () => {
      const newUser = await prisma.user.create({
        data: {
          email: `test-pending-invite-${Date.now()}@example.com`,
          username: `test-pending-${Date.now()}`,
        },
      });

      const membership = await prisma.membership.create({
        data: {
          userId: newUser.id,
          teamId: testTeamId,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });
      createdMembershipIds.push(membership.id);

      const result = await MembershipRepository.hasPendingInviteByUserId({ userId: newUser.id });

      expect(result).toBe(true);

      await prisma.membership.delete({ where: { id: membership.id } });
      createdMembershipIds.length = 0;
      await prisma.user.delete({ where: { id: newUser.id } });
    });

    it("should return false when user has no pending invites (all accepted)", async () => {
      const newUser = await prisma.user.create({
        data: {
          email: `test-accepted-invite-${Date.now()}@example.com`,
          username: `test-accepted-${Date.now()}`,
        },
      });

      const membership = await prisma.membership.create({
        data: {
          userId: newUser.id,
          teamId: testTeamId,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });
      createdMembershipIds.push(membership.id);

      const result = await MembershipRepository.hasPendingInviteByUserId({ userId: newUser.id });

      expect(result).toBe(false);

      await prisma.membership.delete({ where: { id: membership.id } });
      createdMembershipIds.length = 0;
      await prisma.user.delete({ where: { id: newUser.id } });
    });

    it("should return false when user has no memberships at all", async () => {
      const newUser = await prisma.user.create({
        data: {
          email: `test-no-membership-${Date.now()}@example.com`,
          username: `test-no-membership-${Date.now()}`,
        },
      });

      const result = await MembershipRepository.hasPendingInviteByUserId({ userId: newUser.id });

      expect(result).toBe(false);

      await prisma.user.delete({ where: { id: newUser.id } });
    });

    it("should return true when user has both accepted and pending invites", async () => {
      const newUser = await prisma.user.create({
        data: {
          email: `test-mixed-invites-${Date.now()}@example.com`,
          username: `test-mixed-${Date.now()}`,
        },
      });

      const team2 = await prisma.team.findFirst({
        where: {
          slug: { not: null },
          id: { not: testTeamId },
        },
      });

      const acceptedMembership = await prisma.membership.create({
        data: {
          userId: newUser.id,
          teamId: testTeamId,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });
      createdMembershipIds.push(acceptedMembership.id);

      if (team2) {
        const pendingMembership = await prisma.membership.create({
          data: {
            userId: newUser.id,
            teamId: team2.id,
            role: MembershipRole.MEMBER,
            accepted: false,
          },
        });
        createdMembershipIds.push(pendingMembership.id);
      }

      const result = await MembershipRepository.hasPendingInviteByUserId({ userId: newUser.id });

      expect(result).toBe(team2 ? true : false);

      await clearTestMemberships();
      await prisma.user.delete({ where: { id: newUser.id } });
    });
  });
});
