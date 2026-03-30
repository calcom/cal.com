import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

import { prisma } from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

import { PrismaUserFeatureRepository } from "../PrismaUserFeatureRepository";

const FEATURE_SLUG = "test-batch-feature";

const createTestUser = async (suffix: string) =>
  prisma.user.create({
    data: {
      username: `batch-ff-test-${suffix}`,
      name: `Batch FF Test ${suffix}`,
      email: `batch-ff-test-${suffix}@example.com`,
    },
  });

const createTestTeam = async (suffix: string) =>
  prisma.team.create({
    data: { name: `Batch FF Team ${suffix}`, slug: `batch-ff-team-${suffix}` },
  });

const enableFeatureForUser = async (userId: number) =>
  prisma.userFeatures.create({
    data: { userId, featureId: FEATURE_SLUG, enabled: true, assignedBy: "test" },
  });

const disableFeatureForUser = async (userId: number) =>
  prisma.userFeatures.create({
    data: { userId, featureId: FEATURE_SLUG, enabled: false, assignedBy: "test" },
  });

const enableFeatureForTeam = async (teamId: number) =>
  prisma.teamFeatures.create({
    data: { teamId, featureId: FEATURE_SLUG, enabled: true, assignedBy: "test" },
  });

const addTeamMember = async (userId: number, teamId: number, overrides?: { accepted?: boolean }) =>
  prisma.membership.create({
    data: {
      userId,
      teamId,
      role: MembershipRole.MEMBER,
      accepted: overrides?.accepted ?? true,
    },
  });

describe("PrismaUserFeatureRepository.checkIfUsersHaveFeatureNonHierarchical", () => {
  let testData: {
    repository: PrismaUserFeatureRepository;
    users: User[];
    team: Team;
  };

  beforeAll(async () => {
    const suffix = `batch-${Date.now()}`;
    const repository = new PrismaUserFeatureRepository(prisma);
    const users = await Promise.all([1, 2, 3, 4].map((i) => createTestUser(`${suffix}-${i}`)));
    await prisma.feature.upsert({
      where: { slug: FEATURE_SLUG },
      update: { enabled: true },
      create: {
        slug: FEATURE_SLUG,
        enabled: true,
        type: "OPERATIONAL",
        description: "Integration test feature",
      },
    });
    const team = await createTestTeam(suffix);
    testData = { repository, users, team };
  });

  afterEach(async () => {
    const userIds = testData.users.map((u) => u.id);
    await prisma.userFeatures.deleteMany({ where: { userId: { in: userIds }, featureId: FEATURE_SLUG } });
    await prisma.teamFeatures.deleteMany({ where: { teamId: testData.team.id, featureId: FEATURE_SLUG } });
    await prisma.membership.deleteMany({ where: { teamId: testData.team.id } });
  });

  afterAll(async () => {
    const userIds = testData.users.map((u) => u.id);
    await prisma.team.delete({ where: { id: testData.team.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.feature.delete({ where: { slug: FEATURE_SLUG } }).catch(() => {});
  });

  test("returns empty Set when no users have the feature", async () => {
    const result = await testData.repository.checkIfUsersHaveFeatureNonHierarchical(
      testData.users.map((u) => u.id),
      FEATURE_SLUG
    );

    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });

  test("returns empty Set when userIds array is empty", async () => {
    const result = await testData.repository.checkIfUsersHaveFeatureNonHierarchical([], FEATURE_SLUG);

    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });

  test("returns only user IDs that have the feature directly enabled", async () => {
    await Promise.all([
      enableFeatureForUser(testData.users[0].id),
      enableFeatureForUser(testData.users[2].id),
    ]);

    const result = await testData.repository.checkIfUsersHaveFeatureNonHierarchical(
      testData.users.map((u) => u.id),
      FEATURE_SLUG
    );

    expect(result.has(testData.users[0].id)).toBe(true);
    expect(result.has(testData.users[1].id)).toBe(false);
    expect(result.has(testData.users[2].id)).toBe(true);
    expect(result.has(testData.users[3].id)).toBe(false);
    expect(result.size).toBe(2);
  });

  test("excludes users whose feature is explicitly disabled", async () => {
    await Promise.all([
      enableFeatureForUser(testData.users[0].id),
      disableFeatureForUser(testData.users[1].id),
    ]);

    const result = await testData.repository.checkIfUsersHaveFeatureNonHierarchical(
      [testData.users[0].id, testData.users[1].id],
      FEATURE_SLUG
    );

    expect(result.has(testData.users[0].id)).toBe(true);
    expect(result.has(testData.users[1].id)).toBe(false);
  });

  test("includes users who inherit the feature from team membership", async () => {
    await Promise.all([
      addTeamMember(testData.users[1].id, testData.team.id),
      addTeamMember(testData.users[3].id, testData.team.id),
    ]);
    await enableFeatureForTeam(testData.team.id);

    const result = await testData.repository.checkIfUsersHaveFeatureNonHierarchical(
      testData.users.map((u) => u.id),
      FEATURE_SLUG
    );

    expect(result.has(testData.users[0].id)).toBe(false);
    expect(result.has(testData.users[1].id)).toBe(true);
    expect(result.has(testData.users[2].id)).toBe(false);
    expect(result.has(testData.users[3].id)).toBe(true);
  });

  test("user-level disabled overrides team-level enabled", async () => {
    await addTeamMember(testData.users[0].id, testData.team.id);
    await enableFeatureForTeam(testData.team.id);
    await disableFeatureForUser(testData.users[0].id);

    const result = await testData.repository.checkIfUsersHaveFeatureNonHierarchical(
      [testData.users[0].id],
      FEATURE_SLUG
    );

    expect(result.has(testData.users[0].id)).toBe(false);
  });

  test("unaccepted team membership does not grant the feature", async () => {
    await addTeamMember(testData.users[0].id, testData.team.id, { accepted: false });
    await enableFeatureForTeam(testData.team.id);

    const result = await testData.repository.checkIfUsersHaveFeatureNonHierarchical(
      [testData.users[0].id],
      FEATURE_SLUG
    );

    expect(result.has(testData.users[0].id)).toBe(false);
  });

  test("returns consistent results with the per-user method", async () => {
    await enableFeatureForUser(testData.users[0].id);
    await addTeamMember(testData.users[2].id, testData.team.id);
    await enableFeatureForTeam(testData.team.id);

    const batchResult = await testData.repository.checkIfUsersHaveFeatureNonHierarchical(
      testData.users.map((u) => u.id),
      FEATURE_SLUG
    );

    const perUserResults = await Promise.all(
      testData.users.map(async (user) => ({
        userId: user.id,
        enabled: await testData.repository.checkIfUserHasFeatureNonHierarchical(user.id, FEATURE_SLUG),
      }))
    );

    for (const { userId, enabled } of perUserResults) {
      expect(batchResult.has(userId)).toBe(enabled);
    }
  });
});
