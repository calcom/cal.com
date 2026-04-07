import prisma from "@calcom/prisma";
import { WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { afterEach, describe, expect, it } from "vitest";
import { EventTypeRepository } from "../eventTypeRepository";

const repository = new EventTypeRepository(prisma);

let testUserIds: number[] = [];
let testEventTypeIds: number[] = [];
let testTeamIds: number[] = [];
let testWorkflowIds: number[] = [];
let testSecondaryEmailIds: number[] = [];
let testAIPhoneCallConfigEventTypeIds: number[] = [];
let testHostGroupIds: string[] = [];
let testMembershipIds: number[] = [];

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

const createTestTeam = async () => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);
  const team = await prisma.team.create({
    data: {
      name: `Test Team ${randomSuffix}`,
      slug: `test-team-${timestamp}-${randomSuffix}`,
    },
  });
  testTeamIds.push(team.id);
  return team;
};

const createTestEventType = async (userId: number, overrides?: Record<string, unknown>) => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);
  const et = await prisma.eventType.create({
    data: {
      title: "Test Event Type",
      slug: `test-et-${timestamp}-${randomSuffix}`,
      length: 30,
      userId,
      ...overrides,
    },
  });
  testEventTypeIds.push(et.id);
  return et;
};

const cleanup = async () => {
  if (testAIPhoneCallConfigEventTypeIds.length > 0) {
    await prisma.aIPhoneCallConfiguration.deleteMany({
      where: { eventTypeId: { in: testAIPhoneCallConfigEventTypeIds } },
    });
    testAIPhoneCallConfigEventTypeIds = [];
  }
  if (testMembershipIds.length > 0) {
    await prisma.membership.deleteMany({ where: { id: { in: testMembershipIds } } });
    testMembershipIds = [];
  }
  if (testHostGroupIds.length > 0) {
    await prisma.hostGroup.deleteMany({ where: { id: { in: testHostGroupIds } } });
    testHostGroupIds = [];
  }
  if (testWorkflowIds.length > 0) {
    await prisma.workflowsOnEventTypes.deleteMany({
      where: { workflowId: { in: testWorkflowIds } },
    });
    await prisma.workflowStep.deleteMany({ where: { workflowId: { in: testWorkflowIds } } });
    await prisma.workflow.deleteMany({ where: { id: { in: testWorkflowIds } } });
    testWorkflowIds = [];
  }
  if (testSecondaryEmailIds.length > 0) {
    await prisma.secondaryEmail.deleteMany({ where: { id: { in: testSecondaryEmailIds } } });
    testSecondaryEmailIds = [];
  }
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

    const team = await createTestTeam();

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

    const team = await createTestTeam();

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

describe("EventTypeRepository.findByIdWithFullDetail", () => {
  afterEach(cleanup);

  it("should return all selected fields for a personal event type", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const et = await createTestEventType(user.id, {
      title: "Full Detail Test",
      description: "A test event type",
      seatsPerTimeSlot: 5,
      successRedirectUrl: "https://example.com/thanks",
      isRRWeightsEnabled: false,
    });

    const result = await repository.findByIdWithFullDetail({ id: et.id });

    expect(result.title).toBe("Full Detail Test");
    expect(result.description).toBe("A test event type");
    expect(result.seatsPerTimeSlot).toBe(5);
    expect(result.successRedirectUrl).toBe("https://example.com/thanks");
    expect(result.isRRWeightsEnabled).toBe(false);
    expect(result.hosts).toEqual([]);
    expect(result.children).toEqual([]);
    expect(result.workflows).toEqual([]);
    expect(result.hostGroups).toEqual([]);
    expect(result.team).toBeNull();
    expect(result.aiPhoneCallConfig).toBeNull();
    expect(result.calVideoSettings).toBeNull();
  });

  it("should include hosts when they exist", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const team = await createTestTeam();

    const et = await prisma.eventType.create({
      data: {
        title: "Team Event",
        slug: `team-et-${Date.now()}`,
        length: 30,
        teamId: team.id,
        schedulingType: "ROUND_ROBIN",
        hosts: {
          create: { userId: user.id, isFixed: false, priority: 1, weight: 100 },
        },
      },
    });
    testEventTypeIds.push(et.id);

    const result = await repository.findByIdWithFullDetail({ id: et.id });

    expect(result.hosts).toHaveLength(1);
    expect(result.hosts[0]).toEqual({
      userId: user.id,
      isFixed: false,
      priority: 1,
      weight: 100,
    });
    expect(result.team).not.toBeNull();
    expect(result.team?.id).toBe(team.id);
  });

  it("should throw when event type does not exist", async () => {
    await expect(repository.findByIdWithFullDetail({ id: 999999 })).rejects.toThrow();
  });
});

describe("EventTypeRepository.updateById", () => {
  afterEach(cleanup);

  it("should update event type fields and return selected fields", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const et = await createTestEventType(user.id, { title: "Original Title" });

    const result = await repository.updateById({
      id: et.id,
      data: { title: "Updated Title", description: "New description" },
      select: { id: true, title: true, description: true },
    });

    expect(result).toEqual({
      id: et.id,
      title: "Updated Title",
      description: "New description",
    });
  });

  it("should only return fields specified in select", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const et = await createTestEventType(user.id, { title: "Select Test" });

    const result = await repository.updateById({
      id: et.id,
      data: { title: "Updated" },
      select: { id: true },
    });

    expect(result).toEqual({ id: et.id });
    expect(result).not.toHaveProperty("title");
  });
});

describe("EventTypeRepository.syncHostGroups", () => {
  afterEach(cleanup);

  it("should create new host groups", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const et = await createTestEventType(user.id);

    const groupId = crypto.randomUUID();
    testHostGroupIds.push(groupId);

    await repository.syncHostGroups({
      eventTypeId: et.id,
      hostGroups: [{ id: groupId, name: "Group A" }],
    });

    const groups = await prisma.hostGroup.findMany({ where: { eventTypeId: et.id } });
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe(groupId);
    expect(groups[0].name).toBe("Group A");
  });

  it("should update existing host groups", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const et = await createTestEventType(user.id);

    const groupId = crypto.randomUUID();
    testHostGroupIds.push(groupId);

    await prisma.hostGroup.create({
      data: { id: groupId, name: "Old Name", eventTypeId: et.id },
    });

    await repository.syncHostGroups({
      eventTypeId: et.id,
      hostGroups: [{ id: groupId, name: "New Name" }],
    });

    const group = await prisma.hostGroup.findUnique({ where: { id: groupId } });
    expect(group?.name).toBe("New Name");
  });

  it("should delete host groups not in the new list", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const et = await createTestEventType(user.id);

    const groupToKeepId = crypto.randomUUID();
    const groupToDeleteId = crypto.randomUUID();
    testHostGroupIds.push(groupToKeepId);

    await prisma.hostGroup.createMany({
      data: [
        { id: groupToKeepId, name: "Keep", eventTypeId: et.id },
        { id: groupToDeleteId, name: "Delete", eventTypeId: et.id },
      ],
    });

    await repository.syncHostGroups({
      eventTypeId: et.id,
      hostGroups: [{ id: groupToKeepId, name: "Keep" }],
    });

    const remaining = await prisma.hostGroup.findMany({ where: { eventTypeId: et.id } });
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(groupToKeepId);
  });

  it("should handle create, update, and delete in a single sync", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const et = await createTestEventType(user.id);

    const existingId = crypto.randomUUID();
    const deleteId = crypto.randomUUID();
    const newId = crypto.randomUUID();
    testHostGroupIds.push(existingId, newId);

    await prisma.hostGroup.createMany({
      data: [
        { id: existingId, name: "Existing", eventTypeId: et.id },
        { id: deleteId, name: "ToDelete", eventTypeId: et.id },
      ],
    });

    await repository.syncHostGroups({
      eventTypeId: et.id,
      hostGroups: [
        { id: existingId, name: "Renamed" },
        { id: newId, name: "Brand New" },
      ],
    });

    const groups = await prisma.hostGroup.findMany({
      where: { eventTypeId: et.id },
      orderBy: { name: "asc" },
    });
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.name).sort()).toEqual(["Brand New", "Renamed"]);
  });
});

describe("EventTypeRepository.deleteEmptyHostGroups", () => {
  afterEach(cleanup);

  it("should delete host groups with no hosts", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const et = await createTestEventType(user.id);

    const emptyGroupId = crypto.randomUUID();
    await prisma.hostGroup.create({
      data: { id: emptyGroupId, name: "Empty Group", eventTypeId: et.id },
    });

    const result = await repository.deleteEmptyHostGroups({ eventTypeId: et.id });
    expect(result.count).toBe(1);

    const remaining = await prisma.hostGroup.findMany({ where: { eventTypeId: et.id } });
    expect(remaining).toHaveLength(0);
  });

  it("should not delete host groups that have hosts", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const team = await createTestTeam();

    const et = await prisma.eventType.create({
      data: {
        title: "Team ET",
        slug: `team-et-${Date.now()}`,
        length: 30,
        teamId: team.id,
        schedulingType: "ROUND_ROBIN",
      },
    });
    testEventTypeIds.push(et.id);

    const groupId = crypto.randomUUID();
    testHostGroupIds.push(groupId);

    await prisma.hostGroup.create({
      data: { id: groupId, name: "Non-Empty", eventTypeId: et.id },
    });

    await prisma.host.create({
      data: { userId: user.id, eventTypeId: et.id, isFixed: false, groupId },
    });

    const result = await repository.deleteEmptyHostGroups({ eventTypeId: et.id });
    expect(result.count).toBe(0);

    const remaining = await prisma.hostGroup.findMany({ where: { eventTypeId: et.id } });
    expect(remaining).toHaveLength(1);
  });
});

describe("EventTypeRepository.findWorkflowsByEventTypeIdAndTrigger", () => {
  afterEach(cleanup);

  it("should find workflows matching event type and trigger", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const et = await createTestEventType(user.id);

    const workflow = await prisma.workflow.create({
      data: {
        name: "Test Workflow",
        trigger: WorkflowTriggerEvents.NEW_EVENT,
        userId: user.id,
        steps: {
          create: { stepNumber: 1, action: "EMAIL_HOST" },
        },
        activeOn: {
          create: { eventTypeId: et.id },
        },
      },
    });
    testWorkflowIds.push(workflow.id);

    const result = await repository.findWorkflowsByEventTypeIdAndTrigger({
      eventTypeId: et.id,
      trigger: WorkflowTriggerEvents.NEW_EVENT,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(workflow.id);
    expect(result[0].trigger).toBe(WorkflowTriggerEvents.NEW_EVENT);
    expect(result[0].steps).toHaveLength(1);
    expect(result[0].steps[0].action).toBe("EMAIL_HOST");
  });

  it("should not return workflows with a different trigger", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const et = await createTestEventType(user.id);

    const workflow = await prisma.workflow.create({
      data: {
        name: "Before Event Workflow",
        trigger: WorkflowTriggerEvents.BEFORE_EVENT,
        userId: user.id,
        activeOn: {
          create: { eventTypeId: et.id },
        },
      },
    });
    testWorkflowIds.push(workflow.id);

    const result = await repository.findWorkflowsByEventTypeIdAndTrigger({
      eventTypeId: et.id,
      trigger: WorkflowTriggerEvents.NEW_EVENT,
    });

    expect(result).toHaveLength(0);
  });

  it("should not return workflows not active on the event type", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const et = await createTestEventType(user.id);
    const otherEt = await createTestEventType(user.id);

    const workflow = await prisma.workflow.create({
      data: {
        name: "Other Workflow",
        trigger: WorkflowTriggerEvents.NEW_EVENT,
        userId: user.id,
        activeOn: {
          create: { eventTypeId: otherEt.id },
        },
      },
    });
    testWorkflowIds.push(workflow.id);

    const result = await repository.findWorkflowsByEventTypeIdAndTrigger({
      eventTypeId: et.id,
      trigger: WorkflowTriggerEvents.NEW_EVENT,
    });

    expect(result).toHaveLength(0);
  });
});

describe("EventTypeRepository.findVerifiedSecondaryEmail", () => {
  afterEach(cleanup);

  it("should return secondary email with id and emailVerified fields", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const verifiedDate = new Date("2026-01-01T00:00:00Z");
    const secondaryEmail = await prisma.secondaryEmail.create({
      data: {
        userId: user.id,
        email: `secondary-${Date.now()}@example.com`,
        emailVerified: verifiedDate,
      },
    });
    testSecondaryEmailIds.push(secondaryEmail.id);

    const result = await repository.findVerifiedSecondaryEmail({
      id: secondaryEmail.id,
      userId: user.id,
    });

    expect(result).not.toBeNull();
    expect(result?.id).toBe(secondaryEmail.id);
    expect(result?.emailVerified).toEqual(verifiedDate);
  });

  it("should return null when userId does not match", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const otherUser = await createTestUser();
    testUserIds.push(otherUser.id);

    const secondaryEmail = await prisma.secondaryEmail.create({
      data: {
        userId: user.id,
        email: `secondary-${Date.now()}@example.com`,
        emailVerified: new Date(),
      },
    });
    testSecondaryEmailIds.push(secondaryEmail.id);

    const result = await repository.findVerifiedSecondaryEmail({
      id: secondaryEmail.id,
      userId: otherUser.id,
    });

    expect(result).toBeNull();
  });

  it("should return null for non-existent id", async () => {
    const result = await repository.findVerifiedSecondaryEmail({
      id: 999999,
      userId: 999999,
    });

    expect(result).toBeNull();
  });
});

describe("EventTypeRepository.upsertAIPhoneCallConfig", () => {
  afterEach(cleanup);

  it("should create a new AI phone call config", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const et = await createTestEventType(user.id);
    testAIPhoneCallConfigEventTypeIds.push(et.id);

    const result = await repository.upsertAIPhoneCallConfig({
      eventTypeId: et.id,
      config: {
        generalPrompt: "Hello, how can I help?",
        beginMessage: "Hi there",
        enabled: true,
        llmId: "gpt-4",
        yourPhoneNumber: "+1234567890",
        numberToCall: "+0987654321",
      },
    });

    expect(result.eventTypeId).toBe(et.id);
    expect(result.generalPrompt).toBe("Hello, how can I help?");
    expect(result.enabled).toBe(true);
  });

  it("should update an existing AI phone call config", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const et = await createTestEventType(user.id);
    testAIPhoneCallConfigEventTypeIds.push(et.id);

    await prisma.aIPhoneCallConfiguration.create({
      data: {
        eventTypeId: et.id,
        generalPrompt: "Old prompt",
        enabled: false,
        yourPhoneNumber: "+1234567890",
        numberToCall: "+0987654321",
      },
    });

    const result = await repository.upsertAIPhoneCallConfig({
      eventTypeId: et.id,
      config: {
        generalPrompt: "New prompt",
        enabled: true,
        yourPhoneNumber: "+1234567890",
        numberToCall: "+0987654321",
      },
    });

    expect(result.generalPrompt).toBe("New prompt");
    expect(result.enabled).toBe(true);

    const configs = await prisma.aIPhoneCallConfiguration.findMany({
      where: { eventTypeId: et.id },
    });
    expect(configs).toHaveLength(1);
  });
});

describe("EventTypeRepository.deleteAIPhoneCallConfig", () => {
  afterEach(cleanup);

  it("should delete an existing AI phone call config", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const et = await createTestEventType(user.id);

    await prisma.aIPhoneCallConfiguration.create({
      data: {
        eventTypeId: et.id,
        generalPrompt: "Test",
        enabled: false,
        yourPhoneNumber: "+1234567890",
        numberToCall: "+0987654321",
      },
    });

    await repository.deleteAIPhoneCallConfig({ eventTypeId: et.id });

    const config = await prisma.aIPhoneCallConfiguration.findUnique({
      where: { eventTypeId: et.id },
    });
    expect(config).toBeNull();
  });

  it("should throw when config does not exist", async () => {
    await expect(repository.deleteAIPhoneCallConfig({ eventTypeId: 999999 })).rejects.toThrow();
  });
});

describe("EventTypeRepository.deleteHostLocations", () => {
  afterEach(cleanup);

  it("should delete host locations matching the given user and event type pairs", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const team = await createTestTeam();

    const et = await prisma.eventType.create({
      data: {
        title: "Host Loc ET",
        slug: `host-loc-${Date.now()}`,
        length: 30,
        teamId: team.id,
        schedulingType: "ROUND_ROBIN",
        hosts: {
          create: { userId: user.id, isFixed: false },
        },
      },
    });
    testEventTypeIds.push(et.id);

    await prisma.hostLocation.create({
      data: {
        userId: user.id,
        eventTypeId: et.id,
        type: "integrations:google:meet",
      },
    });

    const before = await prisma.hostLocation.findMany({
      where: { userId: user.id, eventTypeId: et.id },
    });
    expect(before).toHaveLength(1);

    const result = await repository.deleteHostLocations([{ userId: user.id, eventTypeId: et.id }]);
    expect(result.count).toBe(1);

    const after = await prisma.hostLocation.findMany({
      where: { userId: user.id, eventTypeId: et.id },
    });
    expect(after).toHaveLength(0);
  });

  it("should be a no-op when no matching host locations exist", async () => {
    const result = await repository.deleteHostLocations([{ userId: 999999, eventTypeId: 999999 }]);
    expect(result.count).toBe(0);
  });
});

describe("EventTypeRepository.findById", () => {
  afterEach(cleanup);

  it("should return event type when user owns it (userId match)", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const et = await createTestEventType(user.id);

    const result = await repository.findById({ id: et.id, userId: user.id });

    expect(result).not.toBeNull();
    expect(result?.id).toBe(et.id);
    expect(result?.title).toBe("Test Event Type");
    expect(result?.userId).toBe(user.id);
  });

  it("should return event type when user is a team member (teamId match)", async () => {
    const owner = await createTestUser();
    testUserIds.push(owner.id);

    const member = await createTestUser();
    testUserIds.push(member.id);

    const team = await createTestTeam();

    const membership = await prisma.membership.create({
      data: { teamId: team.id, userId: member.id, role: "MEMBER", accepted: true },
    });
    testMembershipIds.push(membership.id);

    const et = await prisma.eventType.create({
      data: {
        title: "Team Event",
        slug: `team-et-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        length: 30,
        teamId: team.id,
        schedulingType: "ROUND_ROBIN",
      },
    });
    testEventTypeIds.push(et.id);

    const result = await repository.findById({ id: et.id, userId: member.id });

    expect(result).not.toBeNull();
    expect(result?.id).toBe(et.id);
    expect(result?.teamId).toBe(team.id);
  });

  it("should return event type when user is linked via junction table only", async () => {
    const owner = await createTestUser();
    testUserIds.push(owner.id);

    const linkedUser = await createTestUser();
    testUserIds.push(linkedUser.id);

    // Create event type owned by owner, with no team
    const et = await prisma.eventType.create({
      data: {
        title: "Junction Table Event",
        slug: `junction-et-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        length: 30,
        userId: owner.id,
        users: {
          connect: [{ id: linkedUser.id }],
        },
      },
    });
    testEventTypeIds.push(et.id);

    // linkedUser is NOT the owner (userId != linkedUser.id) and there's no team,
    // so access must go through the junction table fallback
    const result = await repository.findById({ id: et.id, userId: linkedUser.id });

    expect(result).not.toBeNull();
    expect(result?.id).toBe(et.id);
  });

  it("should return null when user has no access", async () => {
    const owner = await createTestUser();
    testUserIds.push(owner.id);

    const stranger = await createTestUser();
    testUserIds.push(stranger.id);

    const et = await createTestEventType(owner.id);

    const result = await repository.findById({ id: et.id, userId: stranger.id });

    expect(result).toBeNull();
  });

  it("should return null for non-existent event type", async () => {
    const result = await repository.findById({ id: 999999, userId: 999999 });

    expect(result).toBeNull();
  });

  it("should deny access when user is not a member of the event type's team", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const team = await createTestTeam();

    const et = await prisma.eventType.create({
      data: {
        title: "Team Only Event",
        slug: `team-only-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        length: 30,
        teamId: team.id,
        schedulingType: "ROUND_ROBIN",
      },
    });
    testEventTypeIds.push(et.id);

    // user has no membership in this team
    const result = await repository.findById({ id: et.id, userId: user.id });

    expect(result).toBeNull();
  });

  it("should return complete event type data with all relations", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const team = await createTestTeam();

    const membership = await prisma.membership.create({
      data: { teamId: team.id, userId: user.id, role: "ADMIN", accepted: true },
    });
    testMembershipIds.push(membership.id);

    const et = await prisma.eventType.create({
      data: {
        title: "Full Data Event",
        slug: `full-data-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        length: 45,
        description: "A complete event type",
        teamId: team.id,
        schedulingType: "ROUND_ROBIN",
        hosts: {
          create: { userId: user.id, isFixed: false, priority: 1, weight: 100 },
        },
      },
    });
    testEventTypeIds.push(et.id);

    const result = await repository.findById({ id: et.id, userId: user.id });

    expect(result).not.toBeNull();
    expect(result?.id).toBe(et.id);
    expect(result?.title).toBe("Full Data Event");
    expect(result?.description).toBe("A complete event type");
    expect(result?.length).toBe(45);
    expect(result?.teamId).toBe(team.id);
    expect(result?.team).not.toBeNull();
    expect(result?.team?.id).toBe(team.id);
    expect(result?.hosts).toHaveLength(1);
    expect(result?.hosts[0].userId).toBe(user.id);
    expect(result?.workflows).toBeDefined();
    expect(result?.webhooks).toBeDefined();
    expect(result?.children).toBeDefined();
    expect(result?.users).toBeDefined();
  });

  it("should not include members in workflow.team select", async () => {
    const user = await createTestUser();
    testUserIds.push(user.id);

    const team = await createTestTeam();

    const membership = await prisma.membership.create({
      data: { teamId: team.id, userId: user.id, role: "MEMBER", accepted: true },
    });
    testMembershipIds.push(membership.id);

    const et = await prisma.eventType.create({
      data: {
        title: "Workflow Team Event",
        slug: `wf-team-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        length: 30,
        teamId: team.id,
        schedulingType: "ROUND_ROBIN",
      },
    });
    testEventTypeIds.push(et.id);

    const workflow = await prisma.workflow.create({
      data: {
        name: "Test Workflow",
        trigger: WorkflowTriggerEvents.NEW_EVENT,
        userId: user.id,
        teamId: team.id,
        activeOn: {
          create: { eventTypeId: et.id },
        },
      },
    });
    testWorkflowIds.push(workflow.id);

    const result = await repository.findById({ id: et.id, userId: user.id });

    expect(result).not.toBeNull();
    expect(result?.workflows).toHaveLength(1);
    expect(result?.workflows[0].workflow.team).not.toBeNull();
    expect(result?.workflows[0].workflow.team?.id).toBe(team.id);
    expect(result?.workflows[0].workflow.team?.slug).toBeDefined();
    expect(result?.workflows[0].workflow.team?.name).toBeDefined();
    // Verify members is NOT included in workflow.team (perf optimization)
    expect(result?.workflows[0].workflow.team).not.toHaveProperty("members");
  });
});
