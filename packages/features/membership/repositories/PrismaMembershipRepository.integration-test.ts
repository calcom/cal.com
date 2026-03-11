import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { prisma } from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

import { PrismaMembershipRepository } from "./PrismaMembershipRepository";

const ts = Date.now();
const createdMembershipIds: number[] = [];
const createdUserIds: number[] = [];
const createdTeamIds: number[] = [];

async function createTestUser(suffix: string): Promise<User> {
  const user = await prisma.user.create({
    data: {
      email: `membership-repo-test-${suffix}-${ts}@example.com`,
      username: `membership-repo-test-${suffix}-${ts}`,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function createTestTeam(
  suffix: string,
  opts?: { slug?: string | null; isOrganization?: boolean; parentId?: number | null }
): Promise<Team> {
  const team = await prisma.team.create({
    data: {
      name: `MR Test Team ${suffix} ${ts}`,
      slug: opts?.slug !== undefined ? opts.slug : `mr-test-${suffix}-${ts}`,
      isOrganization: opts?.isOrganization ?? false,
      parentId: opts?.parentId ?? null,
    },
  });
  createdTeamIds.push(team.id);
  return team;
}

async function createMembership(
  userId: number,
  teamId: number,
  opts?: { role?: MembershipRole; accepted?: boolean }
) {
  const membership = await prisma.membership.create({
    data: {
      userId,
      teamId,
      role: opts?.role ?? MembershipRole.MEMBER,
      accepted: opts?.accepted ?? true,
    },
  });
  createdMembershipIds.push(membership.id);
  return membership;
}

async function clearTestMemberships() {
  if (createdMembershipIds.length > 0) {
    await prisma.membership.deleteMany({
      where: { id: { in: createdMembershipIds } },
    });
    createdMembershipIds.length = 0;
  }
}

describe("PrismaMembershipRepository (Integration Tests)", () => {
  let repository: PrismaMembershipRepository;
  let user1: User;
  let user2: User;
  let team1: Team;
  let team2: Team;

  beforeAll(async () => {
    repository = new PrismaMembershipRepository(prisma);
    user1 = await createTestUser("u1");
    user2 = await createTestUser("u2");
    team1 = await createTestTeam("t1");
    team2 = await createTestTeam("t2");
  });

  afterAll(async () => {
    await clearTestMemberships();
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    if (createdTeamIds.length > 0) {
      await prisma.membership.deleteMany({ where: { teamId: { in: createdTeamIds } } });
      await prisma.team.deleteMany({ where: { id: { in: createdTeamIds } } });
    }
  });

  afterEach(async () => {
    await clearTestMemberships();
  });

  // === INSTANCE METHODS ===

  describe("hasMembership", () => {
    it("returns true for an accepted membership", async () => {
      await createMembership(user1.id, team1.id, { accepted: true });

      const result = await repository.hasMembership({ userId: user1.id, teamId: team1.id });
      expect(result).toBe(true);
    });

    it("returns false for a pending membership", async () => {
      await createMembership(user1.id, team1.id, { accepted: false });

      const result = await repository.hasMembership({ userId: user1.id, teamId: team1.id });
      expect(result).toBe(false);
    });

    it("returns false when no membership exists", async () => {
      const result = await repository.hasMembership({ userId: user1.id, teamId: team1.id });
      expect(result).toBe(false);
    });
  });

  describe("listAcceptedTeamMemberIds", () => {
    it("returns user IDs of accepted members only", async () => {
      await createMembership(user1.id, team1.id, { accepted: true });
      await createMembership(user2.id, team1.id, { accepted: false });

      const result = await repository.listAcceptedTeamMemberIds({ teamId: team1.id });
      expect(result).toContain(user1.id);
      expect(result).not.toContain(user2.id);
    });

    it("returns empty array when no accepted members", async () => {
      await createMembership(user1.id, team1.id, { accepted: false });

      const result = await repository.listAcceptedTeamMemberIds({ teamId: team1.id });
      expect(result).toEqual([]);
    });
  });

  describe("findUniqueByUserIdAndTeamId", () => {
    it("returns the membership when it exists", async () => {
      await createMembership(user1.id, team1.id, { role: MembershipRole.ADMIN });

      const result = await repository.findUniqueByUserIdAndTeamId({ userId: user1.id, teamId: team1.id });
      expect(result).not.toBeNull();
      expect(result?.userId).toBe(user1.id);
      expect(result?.teamId).toBe(team1.id);
      expect(result?.role).toBe(MembershipRole.ADMIN);
    });

    it("returns null when no membership exists", async () => {
      const result = await repository.findUniqueByUserIdAndTeamId({ userId: user1.id, teamId: team1.id });
      expect(result).toBeNull();
    });
  });

  describe("findAllMembershipsByUserIdForBilling", () => {
    it("returns memberships with team and billing data", async () => {
      await createMembership(user1.id, team1.id);

      const result = await repository.findAllMembershipsByUserIdForBilling({ userId: user1.id });
      expect(result.length).toBeGreaterThanOrEqual(1);
      const m = result.find((r) => r.team.slug === team1.slug);
      expect(m).toBeDefined();
      expect(m).toHaveProperty("accepted");
      expect(m).toHaveProperty("team");
      expect(m?.team).toHaveProperty("slug");
      expect(m?.team).toHaveProperty("isOrganization");
    });

    it("returns empty array when user has no memberships", async () => {
      const result = await repository.findAllMembershipsByUserIdForBilling({ userId: user1.id });
      expect(result).toEqual([]);
    });
  });

  describe("findAllByUserId", () => {
    it("returns all memberships for a user", async () => {
      await createMembership(user1.id, team1.id, { accepted: true });
      await createMembership(user1.id, team2.id, { accepted: false });

      const result = await repository.findAllByUserId({ userId: user1.id });
      expect(result.length).toBe(2);
    });

    it("filters by accepted status", async () => {
      await createMembership(user1.id, team1.id, { accepted: true });
      await createMembership(user1.id, team2.id, { accepted: false });

      const result = await repository.findAllByUserId({
        userId: user1.id,
        filters: { accepted: true },
      });
      expect(result.length).toBe(1);
      expect(result[0].teamId).toBe(team1.id);
    });

    it("filters by roles", async () => {
      await createMembership(user1.id, team1.id, { role: MembershipRole.ADMIN });
      await createMembership(user1.id, team2.id, { role: MembershipRole.MEMBER });

      const result = await repository.findAllByUserId({
        userId: user1.id,
        filters: { roles: [MembershipRole.ADMIN] },
      });
      expect(result.length).toBe(1);
      expect(result[0].teamId).toBe(team1.id);
    });

    it("returns empty array when user has no memberships", async () => {
      const result = await repository.findAllByUserId({ userId: user1.id });
      expect(result).toEqual([]);
    });
  });

  describe("findTeamAdminsByTeamId", () => {
    it("returns ADMIN and OWNER members for a team with a parent", async () => {
      const parentTeam = await createTestTeam("parent");
      const childTeam = await createTestTeam("child", { parentId: parentTeam.id });
      await createMembership(user1.id, childTeam.id, { role: MembershipRole.ADMIN });
      await createMembership(user2.id, childTeam.id, { role: MembershipRole.MEMBER });

      const result = await repository.findTeamAdminsByTeamId({ teamId: childTeam.id });
      expect(result.length).toBe(1);
      expect(result[0].user.email).toBe(user1.email);
    });

    it("returns empty for a team without a parent", async () => {
      await createMembership(user1.id, team1.id, { role: MembershipRole.ADMIN });

      const result = await repository.findTeamAdminsByTeamId({ teamId: team1.id });
      expect(result).toEqual([]);
    });
  });

  describe("hasAcceptedMembershipByEmail", () => {
    it("returns true for accepted membership", async () => {
      await createMembership(user1.id, team1.id, { accepted: true });

      const result = await repository.hasAcceptedMembershipByEmail({
        email: user1.email,
        teamId: team1.id,
      });
      expect(result).toBe(true);
    });

    it("returns false for pending membership", async () => {
      await createMembership(user1.id, team1.id, { accepted: false });

      const result = await repository.hasAcceptedMembershipByEmail({
        email: user1.email,
        teamId: team1.id,
      });
      expect(result).toBe(false);
    });

    it("returns false when user email does not exist", async () => {
      const result = await repository.hasAcceptedMembershipByEmail({
        email: `nonexistent-${ts}@example.com`,
        teamId: team1.id,
      });
      expect(result).toBe(false);
    });

    it("handles case-insensitive email matching", async () => {
      await createMembership(user1.id, team1.id, { accepted: true });

      const result = await repository.hasAcceptedMembershipByEmail({
        email: user1.email.toUpperCase(),
        teamId: team1.id,
      });
      expect(result).toBe(true);
    });
  });

  // === STATIC METHODS ===

  describe("create", () => {
    it("creates a new membership record", async () => {
      const membership = await PrismaMembershipRepository.create({
        userId: user1.id,
        teamId: team1.id,
        role: MembershipRole.MEMBER,
        accepted: true,
      });
      createdMembershipIds.push(membership.id);

      expect(membership.userId).toBe(user1.id);
      expect(membership.teamId).toBe(team1.id);
      expect(membership.role).toBe(MembershipRole.MEMBER);
    });

    it("sets createdAt automatically", async () => {
      const before = new Date();
      const membership = await PrismaMembershipRepository.create({
        userId: user1.id,
        teamId: team1.id,
        role: MembershipRole.MEMBER,
        accepted: true,
      });
      createdMembershipIds.push(membership.id);

      expect(membership.createdAt).toBeDefined();
      expect(membership.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe("createMany", () => {
    it("creates multiple membership records", async () => {
      const result = await PrismaMembershipRepository.createMany([
        { userId: user1.id, teamId: team1.id, role: MembershipRole.MEMBER, accepted: true },
        { userId: user2.id, teamId: team1.id, role: MembershipRole.ADMIN, accepted: true },
      ]);
      expect(result.count).toBe(2);

      const memberships = await prisma.membership.findMany({
        where: { teamId: team1.id, userId: { in: [user1.id, user2.id] } },
      });
      for (const m of memberships) createdMembershipIds.push(m.id);
      expect(memberships.length).toBe(2);
    });
  });

  describe("hasAnyAcceptedMembershipByUserId", () => {
    it("returns true when an accepted membership for a team with a slug exists", async () => {
      await createMembership(user1.id, team1.id, { accepted: true });

      const result = await PrismaMembershipRepository.hasAnyAcceptedMembershipByUserId(user1.id);
      expect(result).toBe(true);
    });

    it("returns false when no accepted membership with slugged team exists", async () => {
      const noSlugTeam = await createTestTeam("noslug", { slug: null });
      await createMembership(user1.id, noSlugTeam.id, { accepted: true });

      const result = await PrismaMembershipRepository.hasAnyAcceptedMembershipByUserId(user1.id);
      expect(result).toBe(false);
    });
  });

  describe("findAcceptedMembershipsByUserIdsInTeam", () => {
    it("returns accepted memberships for given user IDs in a specific team", async () => {
      await createMembership(user1.id, team1.id, { accepted: true });
      await createMembership(user2.id, team1.id, { accepted: true });

      const result = await PrismaMembershipRepository.findAcceptedMembershipsByUserIdsInTeam({
        userIds: [user1.id, user2.id],
        teamId: team1.id,
      });
      expect(result.length).toBe(2);
    });

    it("excludes non-accepted memberships", async () => {
      await createMembership(user1.id, team1.id, { accepted: true });
      await createMembership(user2.id, team1.id, { accepted: false });

      const result = await PrismaMembershipRepository.findAcceptedMembershipsByUserIdsInTeam({
        userIds: [user1.id, user2.id],
        teamId: team1.id,
      });
      expect(result.length).toBe(1);
      expect(result[0].userId).toBe(user1.id);
    });
  });

  describe("getAdminOrOwnerMembership", () => {
    it("returns membership when user is ADMIN", async () => {
      await createMembership(user1.id, team1.id, { role: MembershipRole.ADMIN, accepted: true });

      const result = await PrismaMembershipRepository.getAdminOrOwnerMembership(user1.id, team1.id);
      expect(result).not.toBeNull();
    });

    it("returns membership when user is OWNER", async () => {
      await createMembership(user1.id, team1.id, { role: MembershipRole.OWNER, accepted: true });

      const result = await PrismaMembershipRepository.getAdminOrOwnerMembership(user1.id, team1.id);
      expect(result).not.toBeNull();
    });

    it("returns null when user is only MEMBER", async () => {
      await createMembership(user1.id, team1.id, { role: MembershipRole.MEMBER, accepted: true });

      const result = await PrismaMembershipRepository.getAdminOrOwnerMembership(user1.id, team1.id);
      expect(result).toBeNull();
    });

    it("returns null for non-accepted admin membership", async () => {
      await createMembership(user1.id, team1.id, { role: MembershipRole.ADMIN, accepted: false });

      const result = await PrismaMembershipRepository.getAdminOrOwnerMembership(user1.id, team1.id);
      expect(result).toBeNull();
    });
  });

  describe("findAllAcceptedPublishedTeamMemberships", () => {
    it("returns team IDs for accepted memberships of teams with slugs", async () => {
      await createMembership(user1.id, team1.id, { accepted: true });

      const result = await PrismaMembershipRepository.findAllAcceptedPublishedTeamMemberships(user1.id);
      const teamIds = result.map((r) => r.teamId);
      expect(teamIds).toContain(team1.id);
    });

    it("excludes teams without slugs", async () => {
      const noSlugTeam = await createTestTeam("noslug2", { slug: null });
      await createMembership(user1.id, noSlugTeam.id, { accepted: true });

      const result = await PrismaMembershipRepository.findAllAcceptedPublishedTeamMemberships(user1.id);
      const teamIds = result.map((r) => r.teamId);
      expect(teamIds).not.toContain(noSlugTeam.id);
    });

    it("excludes non-accepted memberships", async () => {
      await createMembership(user1.id, team1.id, { accepted: false });

      const result = await PrismaMembershipRepository.findAllAcceptedPublishedTeamMemberships(user1.id);
      const teamIds = result.map((r) => r.teamId);
      expect(teamIds).not.toContain(team1.id);
    });
  });

  describe("findUserTeamIds", () => {
    it("returns team IDs for accepted memberships", async () => {
      await createMembership(user1.id, team1.id, { accepted: true });
      await createMembership(user1.id, team2.id, { accepted: true });

      const result = await PrismaMembershipRepository.findUserTeamIds({ userId: user1.id });
      expect(result).toContain(team1.id);
      expect(result).toContain(team2.id);
    });

    it("excludes non-accepted memberships", async () => {
      await createMembership(user1.id, team1.id, { accepted: false });

      const result = await PrismaMembershipRepository.findUserTeamIds({ userId: user1.id });
      expect(result).not.toContain(team1.id);
    });

    it("returns empty array for user with no memberships", async () => {
      const result = await PrismaMembershipRepository.findUserTeamIds({ userId: user1.id });
      expect(result).toEqual([]);
    });
  });

  describe("findAllByTeamIds", () => {
    it("returns accepted members across multiple teams", async () => {
      await createMembership(user1.id, team1.id, { accepted: true });
      await createMembership(user2.id, team2.id, { accepted: true });

      const result = await PrismaMembershipRepository.findAllByTeamIds({
        teamIds: [team1.id, team2.id],
      });
      const userIds = result.map((r) => r.userId);
      expect(userIds).toContain(user1.id);
      expect(userIds).toContain(user2.id);
    });

    it("excludes non-accepted memberships", async () => {
      await createMembership(user1.id, team1.id, { accepted: false });

      const result = await PrismaMembershipRepository.findAllByTeamIds({
        teamIds: [team1.id],
      });
      const userIds = result.map((r) => r.userId);
      expect(userIds).not.toContain(user1.id);
    });
  });

  describe("findAllAcceptedTeamMemberships", () => {
    it("returns teams where user has accepted membership", async () => {
      await createMembership(user1.id, team1.id, { accepted: true });

      const result = await PrismaMembershipRepository.findAllAcceptedTeamMemberships(user1.id);
      const teamIds = result.map((r) => r.id);
      expect(teamIds).toContain(team1.id);
    });

    it("excludes non-accepted memberships", async () => {
      await createMembership(user1.id, team1.id, { accepted: false });

      const result = await PrismaMembershipRepository.findAllAcceptedTeamMemberships(user1.id);
      const teamIds = result.map((r) => r.id);
      expect(teamIds).not.toContain(team1.id);
    });
  });

  describe("hasAnyTeamMembershipByUserId", () => {
    it("returns true when user has a non-org team membership", async () => {
      await createMembership(user1.id, team1.id);

      const result = await PrismaMembershipRepository.hasAnyTeamMembershipByUserId({ userId: user1.id });
      expect(result).toBe(true);
    });

    it("returns false when user only has org membership", async () => {
      const orgTeam = await createTestTeam("org", { isOrganization: true });
      await createMembership(user1.id, orgTeam.id);

      const result = await PrismaMembershipRepository.hasAnyTeamMembershipByUserId({ userId: user1.id });
      expect(result).toBe(false);
    });

    it("returns false when user has no memberships", async () => {
      const result = await PrismaMembershipRepository.hasAnyTeamMembershipByUserId({ userId: user1.id });
      expect(result).toBe(false);
    });

    it("returns true for pending memberships too", async () => {
      await createMembership(user1.id, team1.id, { accepted: false });

      const result = await PrismaMembershipRepository.hasAnyTeamMembershipByUserId({ userId: user1.id });
      expect(result).toBe(true);
    });
  });

  describe("hasPendingInviteByUserId", () => {
    it("returns true when user has a pending invite", async () => {
      await createMembership(user1.id, team1.id, { accepted: false });

      const result = await PrismaMembershipRepository.hasPendingInviteByUserId({ userId: user1.id });
      expect(result).toBe(true);
    });

    it("returns false when all memberships are accepted", async () => {
      await createMembership(user1.id, team1.id, { accepted: true });

      const result = await PrismaMembershipRepository.hasPendingInviteByUserId({ userId: user1.id });
      expect(result).toBe(false);
    });

    it("returns false when user has no memberships", async () => {
      const result = await PrismaMembershipRepository.hasPendingInviteByUserId({ userId: user1.id });
      expect(result).toBe(false);
    });

    it("returns true when user has both accepted and pending invites", async () => {
      await createMembership(user1.id, team1.id, { accepted: true });
      await createMembership(user1.id, team2.id, { accepted: false });

      const result = await PrismaMembershipRepository.hasPendingInviteByUserId({ userId: user1.id });
      expect(result).toBe(true);
    });
  });
});
