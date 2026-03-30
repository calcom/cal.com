import { describe, expect, it, afterEach } from "vitest";

import prisma from "@calcom/prisma";

import { EventTypeRepository } from "../eventTypeRepository";

const repository = new EventTypeRepository(prisma);

let testUserIds: number[] = [];
let testEventTypeIds: number[] = [];
let testTeamIds: number[] = [];

const createTestUser = async () => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);
  return prisma.user.create({
    data: {
      email: `test-repo-${timestamp}-${randomSuffix}@example.com`,
      username: `testrepo-${timestamp}-${randomSuffix}`,
      name: "Test User",
    },
  });
};

const cleanup = async () => {
  if (testEventTypeIds.length > 0) {
    await prisma.eventType.deleteMany({ where: { id: { in: testEventTypeIds } } });
  }
  if (testUserIds.length > 0) {
    await prisma.eventType.deleteMany({ where: { userId: { in: testUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: testUserIds } } });
  }
  if (testTeamIds.length > 0) {
    await prisma.eventType.deleteMany({ where: { teamId: { in: testTeamIds } } });
    await prisma.team.deleteMany({ where: { id: { in: testTeamIds } } });
  }
  testUserIds = [];
  testEventTypeIds = [];
  testTeamIds = [];
};

describe("EventTypeRepository.hideAndRenamePersonalByUserIdsAndSlugs", () => {
  afterEach(cleanup);

  it("should rename slug to {slug}-personal-{id}, append [Personal] to title, set hidden=true", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const et = await prisma.eventType.create({
      data: { title: "My Consultation", slug: "consultation", length: 30, userId: user.id },
    });
    testEventTypeIds.push(et.id);

    const result = await repository.hideAndRenamePersonalByUserIdsAndSlugs({
      userIds: [user.id],
      slugs: ["consultation"],
    });

    expect(result.count).toBe(1);

    const updated = await prisma.eventType.findUnique({ where: { id: et.id } });
    expect(updated).not.toBeNull();
    expect(updated?.slug).toBe(`consultation-personal-${et.id}`);
    expect(updated?.title).toBe("My Consultation [Personal]");
    expect(updated?.hidden).toBe(true);
  });

  it("should not touch event types with a parentId (managed children)", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const team = await prisma.team.create({
      data: { name: "Test Team", slug: `test-team-${Date.now()}` },
    });
    testTeamIds.push(team.id);

    const parent = await prisma.eventType.create({
      data: {
        title: "Parent",
        slug: "consultation",
        length: 30,
        teamId: team.id,
        schedulingType: "MANAGED",
      },
    });
    testEventTypeIds.push(parent.id);

    const child = await prisma.eventType.create({
      data: {
        title: "Consultation",
        slug: "consultation",
        length: 30,
        userId: user.id,
        parentId: parent.id,
      },
    });
    testEventTypeIds.push(child.id);

    await repository.hideAndRenamePersonalByUserIdsAndSlugs({
      userIds: [user.id],
      slugs: ["consultation"],
    });

    const unchanged = await prisma.eventType.findUnique({ where: { id: child.id } });
    expect(unchanged?.slug).toBe("consultation");
    expect(unchanged?.hidden).toBe(false);
  });

  it("should not touch event types for users not in userIds", async () => {
    const targetUser = await createTestUser();
    testUserIds.push(targetUser.id);

    const otherUser = await createTestUser();
    testUserIds.push(otherUser.id);

    const targetEt = await prisma.eventType.create({
      data: { title: "Consultation", slug: "consultation", length: 30, userId: targetUser.id },
    });
    testEventTypeIds.push(targetEt.id);

    const otherEt = await prisma.eventType.create({
      data: { title: "Consultation", slug: "consultation", length: 30, userId: otherUser.id },
    });
    testEventTypeIds.push(otherEt.id);

    await repository.hideAndRenamePersonalByUserIdsAndSlugs({
      userIds: [targetUser.id],
      slugs: ["consultation"],
    });

    const updated = await prisma.eventType.findUnique({ where: { id: targetEt.id } });
    expect(updated?.slug).toBe(`consultation-personal-${targetEt.id}`);

    const untouched = await prisma.eventType.findUnique({ where: { id: otherEt.id } });
    expect(untouched?.slug).toBe("consultation");
    expect(untouched?.hidden).toBe(false);
  });

  it("should not touch team event types with the same slug", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const team = await prisma.team.create({
      data: { name: "Test Team", slug: `test-team-${Date.now()}` },
    });
    testTeamIds.push(team.id);

    // Team event type (ROUND_ROBIN) — owned by the team, not the user
    const teamEt = await prisma.eventType.create({
      data: {
        title: "Consultation",
        slug: "consultation",
        length: 30,
        teamId: team.id,
        schedulingType: "ROUND_ROBIN",
      },
    });
    testEventTypeIds.push(teamEt.id);

    // Personal event type with same slug — should be the only one affected
    const personalEt = await prisma.eventType.create({
      data: { title: "Consultation", slug: "consultation", length: 30, userId: user.id },
    });
    testEventTypeIds.push(personalEt.id);

    const result = await repository.hideAndRenamePersonalByUserIdsAndSlugs({
      userIds: [user.id],
      slugs: ["consultation"],
    });

    expect(result.count).toBe(1);

    const teamUnchanged = await prisma.eventType.findUnique({ where: { id: teamEt.id } });
    expect(teamUnchanged?.slug).toBe("consultation");
    expect(teamUnchanged?.hidden).toBe(false);

    const personalUpdated = await prisma.eventType.findUnique({ where: { id: personalEt.id } });
    expect(personalUpdated?.slug).toBe(`consultation-personal-${personalEt.id}`);
    expect(personalUpdated?.hidden).toBe(true);
  });

  it("should return count of affected rows", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const et1 = await prisma.eventType.create({
      data: { title: "Consultation", slug: "consultation", length: 30, userId: user.id },
    });
    testEventTypeIds.push(et1.id);

    const et2 = await prisma.eventType.create({
      data: { title: "Follow Up", slug: "follow-up", length: 15, userId: user.id },
    });
    testEventTypeIds.push(et2.id);

    const result = await repository.hideAndRenamePersonalByUserIdsAndSlugs({
      userIds: [user.id],
      slugs: ["consultation", "follow-up"],
    });

    expect(result.count).toBe(2);
  });

  it("should be a no-op when no matching event types exist", async () => {
    const result = await repository.hideAndRenamePersonalByUserIdsAndSlugs({
      userIds: [999999],
      slugs: ["nonexistent"],
    });

    expect(result.count).toBe(0);
  });
});
