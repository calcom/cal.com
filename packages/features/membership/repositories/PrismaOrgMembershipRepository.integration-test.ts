import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { afterEach, describe, expect, it } from "vitest";
import { PrismaOrgMembershipRepository } from "./PrismaOrgMembershipRepository";

const repository: PrismaOrgMembershipRepository = new PrismaOrgMembershipRepository(prisma);
const createdMembershipIds: number[] = [];
const createdUserIds: number[] = [];
const createdTeamIds: number[] = [];

const uniqueSuffix = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function createTestUser(overrides: Record<string, unknown> = {}) {
  const suffix = uniqueSuffix();
  const user = await prisma.user.create({
    data: {
      email: `test-orgmember-${suffix}@example.com`,
      username: `test-orgmember-${suffix}`,
      ...overrides,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function createTestTeam(overrides: Record<string, unknown> = {}) {
  const suffix = uniqueSuffix();
  const team = await prisma.team.create({
    data: {
      name: `Test Org Team ${suffix}`,
      slug: `test-org-team-${suffix}`,
      ...overrides,
    },
  });
  createdTeamIds.push(team.id);
  return team;
}

async function createTestMembership(data: {
  userId: number;
  teamId: number;
  role?: MembershipRole;
  accepted?: boolean;
}) {
  const membership = await prisma.membership.create({
    data: {
      role: MembershipRole.MEMBER,
      accepted: true,
      ...data,
    },
  });
  createdMembershipIds.push(membership.id);
  return membership;
}

async function fullCleanup() {
  if (createdMembershipIds.length > 0) {
    await prisma.membership.deleteMany({
      where: { id: { in: createdMembershipIds } },
    });
    createdMembershipIds.length = 0;
  }
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds } },
    });
    createdUserIds.length = 0;
  }
  if (createdTeamIds.length > 0) {
    // Delete sub-teams first, then parent orgs
    await prisma.team.deleteMany({
      where: { id: { in: createdTeamIds }, parentId: { not: null } },
    });
    await prisma.team.deleteMany({
      where: { id: { in: createdTeamIds } },
    });
    createdTeamIds.length = 0;
  }
}

describe("PrismaOrgMembershipRepository (Integration Tests)", () => {
  afterEach(async () => {
    await fullCleanup();
  });

  describe("getOrgIdsWhereAdmin", () => {
    it("should return org IDs where user is ADMIN", async () => {
      const user = await createTestUser();
      const org = await createTestTeam({ isOrganization: true, parentId: null });
      await createTestMembership({
        userId: user.id,
        teamId: org.id,
        role: MembershipRole.ADMIN,
      });

      const result = await repository.getOrgIdsWhereAdmin(user.id);
      expect(result).toContain(org.id);
    });

    it("should return org IDs where user is OWNER", async () => {
      const user = await createTestUser();
      const org = await createTestTeam({ isOrganization: true, parentId: null });
      await createTestMembership({
        userId: user.id,
        teamId: org.id,
        role: MembershipRole.OWNER,
      });

      const result = await repository.getOrgIdsWhereAdmin(user.id);
      expect(result).toContain(org.id);
    });

    it("should not return org IDs where user is MEMBER", async () => {
      const user = await createTestUser();
      const org = await createTestTeam({ isOrganization: true, parentId: null });
      await createTestMembership({
        userId: user.id,
        teamId: org.id,
        role: MembershipRole.MEMBER,
      });

      const result = await repository.getOrgIdsWhereAdmin(user.id);
      expect(result).not.toContain(org.id);
    });

    it("should not return sub-team IDs (only top-level orgs with parentId: null)", async () => {
      const user = await createTestUser();
      const org = await createTestTeam({ isOrganization: true, parentId: null });
      const subTeam = await createTestTeam({ parentId: org.id });
      await createTestMembership({
        userId: user.id,
        teamId: subTeam.id,
        role: MembershipRole.ADMIN,
      });

      const result = await repository.getOrgIdsWhereAdmin(user.id);
      expect(result).not.toContain(subTeam.id);
    });

    it("should return empty array when user has no admin/owner memberships", async () => {
      const user = await createTestUser();

      const result = await repository.getOrgIdsWhereAdmin(user.id);
      expect(result).toEqual([]);
    });
  });

  describe("isLoggedInUserOrgAdminOfBookingHost", () => {
    it("should return true when admin's org directly contains booking host", async () => {
      const admin = await createTestUser();
      const host = await createTestUser();
      const org = await createTestTeam({ isOrganization: true, parentId: null });

      await createTestMembership({
        userId: admin.id,
        teamId: org.id,
        role: MembershipRole.ADMIN,
      });
      await createTestMembership({
        userId: host.id,
        teamId: org.id,
        role: MembershipRole.MEMBER,
      });

      const result = await repository.isLoggedInUserOrgAdminOfBookingHost(
        admin.id,
        host.id
      );
      expect(result).toBe(true);
    });

    it("should return true when host is in a sub-team of the admin's org", async () => {
      const admin = await createTestUser();
      const host = await createTestUser();
      const org = await createTestTeam({ isOrganization: true, parentId: null });
      const subTeam = await createTestTeam({ parentId: org.id });

      await createTestMembership({
        userId: admin.id,
        teamId: org.id,
        role: MembershipRole.OWNER,
      });
      await createTestMembership({
        userId: host.id,
        teamId: subTeam.id,
        role: MembershipRole.MEMBER,
      });

      const result = await repository.isLoggedInUserOrgAdminOfBookingHost(
        admin.id,
        host.id
      );
      expect(result).toBe(true);
    });

    it("should return false when logged-in user is not an org admin", async () => {
      const member = await createTestUser();
      const host = await createTestUser();
      const org = await createTestTeam({ isOrganization: true, parentId: null });

      await createTestMembership({
        userId: member.id,
        teamId: org.id,
        role: MembershipRole.MEMBER,
      });
      await createTestMembership({
        userId: host.id,
        teamId: org.id,
        role: MembershipRole.MEMBER,
      });

      const result = await repository.isLoggedInUserOrgAdminOfBookingHost(
        member.id,
        host.id
      );
      expect(result).toBe(false);
    });

    it("should return false when host is in a different org", async () => {
      const admin = await createTestUser();
      const host = await createTestUser();
      const org1 = await createTestTeam({ isOrganization: true, parentId: null });
      const org2 = await createTestTeam({ isOrganization: true, parentId: null });

      await createTestMembership({
        userId: admin.id,
        teamId: org1.id,
        role: MembershipRole.ADMIN,
      });
      await createTestMembership({
        userId: host.id,
        teamId: org2.id,
        role: MembershipRole.MEMBER,
      });

      const result = await repository.isLoggedInUserOrgAdminOfBookingHost(
        admin.id,
        host.id
      );
      expect(result).toBe(false);
    });

    it("should return false when host has no memberships at all", async () => {
      const admin = await createTestUser();
      const host = await createTestUser();
      const org = await createTestTeam({ isOrganization: true, parentId: null });

      await createTestMembership({
        userId: admin.id,
        teamId: org.id,
        role: MembershipRole.ADMIN,
      });

      const result = await repository.isLoggedInUserOrgAdminOfBookingHost(
        admin.id,
        host.id
      );
      expect(result).toBe(false);
    });
  });
});
