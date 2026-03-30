import { describe, expect, it, afterEach } from "vitest";

import prisma from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";

import { updateNewTeamMemberEventTypes, addNewMembersToEventTypes } from "./queries";

const createTestUser = async () => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);

  return prisma.user.create({
    data: {
      email: `test-user-${timestamp}-${randomSuffix}@example.com`,
      username: `testuser-${timestamp}-${randomSuffix}`,
      name: "Test User",
    },
  });
};

const createTestTeam = async () => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);

  return prisma.team.create({
    data: {
      name: `Test Team ${timestamp}-${randomSuffix}`,
      slug: `test-team-${timestamp}-${randomSuffix}`,
    },
  });
};

let testTeamIds: number[] = [];
let testUserIds: number[] = [];
let testEventTypeIds: number[] = [];

const cleanup = async () => {
  // Delete child event types first (they reference parent via parentId)
  if (testEventTypeIds.length > 0) {
    await prisma.eventType.deleteMany({
      where: {
        parentId: { in: testEventTypeIds },
      },
    });
  }

  // Delete user's personal event types
  if (testUserIds.length > 0) {
    await prisma.eventType.deleteMany({
      where: {
        userId: { in: testUserIds },
        teamId: null,
      },
    });
  }

  // Delete team event types
  if (testTeamIds.length > 0) {
    await prisma.host.deleteMany({
      where: { eventType: { teamId: { in: testTeamIds } } },
    });
    await prisma.eventType.deleteMany({
      where: { teamId: { in: testTeamIds } },
    });
    await prisma.membership.deleteMany({
      where: { teamId: { in: testTeamIds } },
    });
  }

  if (testUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: testUserIds } },
    });
  }

  if (testTeamIds.length > 0) {
    await prisma.team.deleteMany({
      where: { id: { in: testTeamIds } },
    });
  }

  testTeamIds = [];
  testUserIds = [];
  testEventTypeIds = [];
};

describe("updateNewTeamMemberEventTypes", () => {
  afterEach(cleanup);

  it("should hide and rename personal event type when slugs conflict with managed", async () => {
    const team = await createTestTeam();
    testTeamIds.push(team.id);

    const user = await createTestUser();
    testUserIds.push(user.id);

    const slug = "consultation";

    // Create a MANAGED event type on the team with assignAllTeamMembers=true
    const managedParentEventType = await prisma.eventType.create({
      data: {
        title: "Consultation",
        slug,
        length: 30,
        locations: [],
        teamId: team.id,
        schedulingType: SchedulingType.MANAGED,
        assignAllTeamMembers: true,
      },
    });
    testEventTypeIds.push(managedParentEventType.id);

    // Create a personal event type for the user with the SAME slug
    const personalEventType = await prisma.eventType.create({
      data: {
        title: "My Consultation",
        slug,
        length: 30,
        userId: user.id,
      },
    });
    testEventTypeIds.push(personalEventType.id);

    await updateNewTeamMemberEventTypes(user.id, team.id);

    // Managed child event type should be created
    const childEventType = await prisma.eventType.findFirst({
      where: {
        userId: user.id,
        parentId: managedParentEventType.id,
      },
    });
    expect(childEventType).not.toBeNull();
    expect(childEventType?.slug).toBe(slug);

    // Personal event type should still exist but be hidden and renamed
    const renamedPersonal = await prisma.eventType.findUnique({
      where: { id: personalEventType.id },
    });
    expect(renamedPersonal).not.toBeNull();
    expect(renamedPersonal?.slug).toBe(`${slug}-personal-${personalEventType.id}`);
    expect(renamedPersonal?.title).toBe("My Consultation [Personal]");
    expect(renamedPersonal?.hidden).toBe(true);
  });

  it("should create managed event type when no conflict exists", async () => {
    const team = await createTestTeam();
    testTeamIds.push(team.id);

    const user = await createTestUser();
    testUserIds.push(user.id);

    const managedParentEventType = await prisma.eventType.create({
      data: {
        title: "Consultation",
        slug: "consultation",
        length: 30,
        locations: [],
        teamId: team.id,
        schedulingType: SchedulingType.MANAGED,
        assignAllTeamMembers: true,
      },
    });
    testEventTypeIds.push(managedParentEventType.id);

    await updateNewTeamMemberEventTypes(user.id, team.id);

    const childEventType = await prisma.eventType.findFirst({
      where: {
        userId: user.id,
        parentId: managedParentEventType.id,
      },
    });
    expect(childEventType).not.toBeNull();
    expect(childEventType?.slug).toBe("consultation");
  });
});

describe("addNewMembersToEventTypes", () => {
  afterEach(cleanup);

  it("should hide and rename personal event types when slugs conflict with managed", async () => {
    const team = await createTestTeam();
    testTeamIds.push(team.id);

    const user = await createTestUser();
    testUserIds.push(user.id);

    const slug = "consultation";

    const managedParentEventType = await prisma.eventType.create({
      data: {
        title: "Consultation",
        slug,
        length: 30,
        locations: [],
        teamId: team.id,
        schedulingType: SchedulingType.MANAGED,
        assignAllTeamMembers: true,
      },
    });
    testEventTypeIds.push(managedParentEventType.id);

    const personalEventType = await prisma.eventType.create({
      data: {
        title: "My Consultation",
        slug,
        length: 30,
        userId: user.id,
      },
    });
    testEventTypeIds.push(personalEventType.id);

    await addNewMembersToEventTypes({ userIds: [user.id], teamId: team.id });

    const childEventType = await prisma.eventType.findFirst({
      where: {
        userId: user.id,
        parentId: managedParentEventType.id,
      },
    });
    expect(childEventType).not.toBeNull();
    expect(childEventType?.slug).toBe(slug);

    // Personal event type should still exist but be hidden and renamed
    const renamedPersonal = await prisma.eventType.findUnique({
      where: { id: personalEventType.id },
    });
    expect(renamedPersonal).not.toBeNull();
    expect(renamedPersonal?.slug).toBe(`${slug}-personal-${personalEventType.id}`);
    expect(renamedPersonal?.title).toBe("My Consultation [Personal]");
    expect(renamedPersonal?.hidden).toBe(true);
  });

  it("should create managed event types when no conflicts exist", async () => {
    const team = await createTestTeam();
    testTeamIds.push(team.id);

    const user = await createTestUser();
    testUserIds.push(user.id);

    const managedParentEventType = await prisma.eventType.create({
      data: {
        title: "Consultation",
        slug: "consultation",
        length: 30,
        locations: [],
        teamId: team.id,
        schedulingType: SchedulingType.MANAGED,
        assignAllTeamMembers: true,
      },
    });
    testEventTypeIds.push(managedParentEventType.id);

    await addNewMembersToEventTypes({ userIds: [user.id], teamId: team.id });

    const childEventType = await prisma.eventType.findFirst({
      where: {
        userId: user.id,
        parentId: managedParentEventType.id,
      },
    });
    expect(childEventType).not.toBeNull();
    expect(childEventType?.slug).toBe("consultation");
  });

  it("should handle multiple users with different conflict scenarios", async () => {
    const team = await createTestTeam();
    testTeamIds.push(team.id);

    const userWithConflict = await createTestUser();
    testUserIds.push(userWithConflict.id);

    const userWithoutConflict = await createTestUser();
    testUserIds.push(userWithoutConflict.id);

    const slug = "consultation";

    const managedParentEventType = await prisma.eventType.create({
      data: {
        title: "Consultation",
        slug,
        length: 30,
        locations: [],
        teamId: team.id,
        schedulingType: SchedulingType.MANAGED,
        assignAllTeamMembers: true,
      },
    });
    testEventTypeIds.push(managedParentEventType.id);

    // Only one user has a conflicting personal event type
    const personalEventType = await prisma.eventType.create({
      data: {
        title: "My Consultation",
        slug,
        length: 30,
        userId: userWithConflict.id,
      },
    });
    testEventTypeIds.push(personalEventType.id);

    await addNewMembersToEventTypes({
      userIds: [userWithConflict.id, userWithoutConflict.id],
      teamId: team.id,
    });

    // Both users should have managed child event types
    const childForConflictUser = await prisma.eventType.findFirst({
      where: { userId: userWithConflict.id, parentId: managedParentEventType.id },
    });
    expect(childForConflictUser).not.toBeNull();
    expect(childForConflictUser?.slug).toBe(slug);

    const childForCleanUser = await prisma.eventType.findFirst({
      where: { userId: userWithoutConflict.id, parentId: managedParentEventType.id },
    });
    expect(childForCleanUser).not.toBeNull();
    expect(childForCleanUser?.slug).toBe(slug);

    // Personal event type should still exist but be hidden and renamed
    const renamedPersonal = await prisma.eventType.findUnique({
      where: { id: personalEventType.id },
    });
    expect(renamedPersonal).not.toBeNull();
    expect(renamedPersonal?.slug).toBe(`${slug}-personal-${personalEventType.id}`);
    expect(renamedPersonal?.hidden).toBe(true);
  });

  it("should handle multiple managed event types with conflicts on different slugs", async () => {
    const team = await createTestTeam();
    testTeamIds.push(team.id);

    const user = await createTestUser();
    testUserIds.push(user.id);

    const managedEventType1 = await prisma.eventType.create({
      data: {
        title: "Consultation",
        slug: "consultation",
        length: 30,
        locations: [],
        teamId: team.id,
        schedulingType: SchedulingType.MANAGED,
        assignAllTeamMembers: true,
      },
    });
    testEventTypeIds.push(managedEventType1.id);

    const managedEventType2 = await prisma.eventType.create({
      data: {
        title: "Follow Up",
        slug: "follow-up",
        length: 15,
        locations: [],
        teamId: team.id,
        schedulingType: SchedulingType.MANAGED,
        assignAllTeamMembers: true,
      },
    });
    testEventTypeIds.push(managedEventType2.id);

    // User has personal events conflicting with both managed slugs
    const personal1 = await prisma.eventType.create({
      data: { title: "My Consultation", slug: "consultation", length: 60, userId: user.id },
    });
    testEventTypeIds.push(personal1.id);

    const personal2 = await prisma.eventType.create({
      data: { title: "My Follow Up", slug: "follow-up", length: 20, userId: user.id },
    });
    testEventTypeIds.push(personal2.id);

    await addNewMembersToEventTypes({ userIds: [user.id], teamId: team.id });

    const child1 = await prisma.eventType.findFirst({
      where: { userId: user.id, parentId: managedEventType1.id },
    });
    expect(child1).not.toBeNull();
    expect(child1?.slug).toBe("consultation");

    const child2 = await prisma.eventType.findFirst({
      where: { userId: user.id, parentId: managedEventType2.id },
    });
    expect(child2).not.toBeNull();
    expect(child2?.slug).toBe("follow-up");

    // Personal event types should still exist but be hidden and renamed
    const renamedPersonal1 = await prisma.eventType.findUnique({ where: { id: personal1.id } });
    expect(renamedPersonal1).not.toBeNull();
    expect(renamedPersonal1?.slug).toBe(`consultation-personal-${personal1.id}`);
    expect(renamedPersonal1?.title).toBe("My Consultation [Personal]");
    expect(renamedPersonal1?.hidden).toBe(true);

    const renamedPersonal2 = await prisma.eventType.findUnique({ where: { id: personal2.id } });
    expect(renamedPersonal2).not.toBeNull();
    expect(renamedPersonal2?.slug).toBe(`follow-up-personal-${personal2.id}`);
    expect(renamedPersonal2?.title).toBe("My Follow Up [Personal]");
    expect(renamedPersonal2?.hidden).toBe(true);
  });

  it("should add users as hosts for ROUND_ROBIN team event types", async () => {
    const team = await createTestTeam();
    testTeamIds.push(team.id);

    const user = await createTestUser();
    testUserIds.push(user.id);

    const roundRobinEventType = await prisma.eventType.create({
      data: {
        title: "Round Robin Meeting",
        slug: "round-robin-meeting",
        length: 30,
        teamId: team.id,
        schedulingType: SchedulingType.ROUND_ROBIN,
        assignAllTeamMembers: true,
      },
    });
    testEventTypeIds.push(roundRobinEventType.id);

    await addNewMembersToEventTypes({ userIds: [user.id], teamId: team.id });

    const host = await prisma.host.findFirst({
      where: { userId: user.id, eventTypeId: roundRobinEventType.id },
    });
    expect(host).not.toBeNull();
    expect(host?.isFixed).toBe(false);
  });

  it("should add users as fixed hosts for COLLECTIVE team event types", async () => {
    const team = await createTestTeam();
    testTeamIds.push(team.id);

    const user = await createTestUser();
    testUserIds.push(user.id);

    const collectiveEventType = await prisma.eventType.create({
      data: {
        title: "Collective Meeting",
        slug: "collective-meeting",
        length: 30,
        teamId: team.id,
        schedulingType: SchedulingType.COLLECTIVE,
        assignAllTeamMembers: true,
      },
    });
    testEventTypeIds.push(collectiveEventType.id);

    await addNewMembersToEventTypes({ userIds: [user.id], teamId: team.id });

    const host = await prisma.host.findFirst({
      where: { userId: user.id, eventTypeId: collectiveEventType.id },
    });
    expect(host).not.toBeNull();
    expect(host?.isFixed).toBe(true);
  });

  it("should handle mixed managed and team event types together", async () => {
    const team = await createTestTeam();
    testTeamIds.push(team.id);

    const user = await createTestUser();
    testUserIds.push(user.id);

    const managedEventType = await prisma.eventType.create({
      data: {
        title: "Consultation",
        slug: "consultation",
        length: 30,
        locations: [],
        teamId: team.id,
        schedulingType: SchedulingType.MANAGED,
        assignAllTeamMembers: true,
      },
    });
    testEventTypeIds.push(managedEventType.id);

    const roundRobinEventType = await prisma.eventType.create({
      data: {
        title: "Round Robin Meeting",
        slug: "round-robin-meeting",
        length: 30,
        teamId: team.id,
        schedulingType: SchedulingType.ROUND_ROBIN,
        assignAllTeamMembers: true,
      },
    });
    testEventTypeIds.push(roundRobinEventType.id);

    await addNewMembersToEventTypes({ userIds: [user.id], teamId: team.id });

    const child = await prisma.eventType.findFirst({
      where: { userId: user.id, parentId: managedEventType.id },
    });
    expect(child).not.toBeNull();

    const host = await prisma.host.findFirst({
      where: { userId: user.id, eventTypeId: roundRobinEventType.id },
    });
    expect(host).not.toBeNull();
    expect(host?.isFixed).toBe(false);
  });

  it("should only hide personal event types, not existing managed children, when resolving conflicts", async () => {
    const team = await createTestTeam();
    testTeamIds.push(team.id);

    const existingUser = await createTestUser();
    testUserIds.push(existingUser.id);

    const newUser = await createTestUser();
    testUserIds.push(newUser.id);

    const slug = "consultation";

    const managedParentEventType = await prisma.eventType.create({
      data: {
        title: "Consultation",
        slug,
        length: 30,
        locations: [],
        teamId: team.id,
        schedulingType: SchedulingType.MANAGED,
        assignAllTeamMembers: true,
      },
    });
    testEventTypeIds.push(managedParentEventType.id);

    // Existing user already has a managed child from a previous add
    const existingChild = await prisma.eventType.create({
      data: {
        title: "Consultation",
        slug,
        length: 30,
        userId: existingUser.id,
        parentId: managedParentEventType.id,
      },
    });
    testEventTypeIds.push(existingChild.id);

    // New user has a personal event type with conflicting slug
    const personalEventType = await prisma.eventType.create({
      data: {
        title: "My Consultation",
        slug,
        length: 30,
        userId: newUser.id,
      },
    });
    testEventTypeIds.push(personalEventType.id);

    await addNewMembersToEventTypes({ userIds: [newUser.id], teamId: team.id });

    // Existing user's managed child should be untouched
    const existingChildAfter = await prisma.eventType.findUnique({
      where: { id: existingChild.id },
    });
    expect(existingChildAfter).not.toBeNull();

    // New user should get a managed child
    const newChild = await prisma.eventType.findFirst({
      where: { userId: newUser.id, parentId: managedParentEventType.id },
    });
    expect(newChild).not.toBeNull();

    // Personal event type should still exist but be hidden and renamed
    const renamedPersonal = await prisma.eventType.findUnique({
      where: { id: personalEventType.id },
    });
    expect(renamedPersonal).not.toBeNull();
    expect(renamedPersonal?.slug).toBe(`${slug}-personal-${personalEventType.id}`);
    expect(renamedPersonal?.hidden).toBe(true);
  });
});
