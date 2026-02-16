import prisma from "@calcom/prisma";
import type { EventType, Team, User } from "@calcom/prisma/client";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { duplicateHandler } from "./duplicate.handler";

const timestamp = Date.now();

function createCtx(user: User) {
  return {
    user: {
      id: user.id,
      profile: {
        id: null,
      },
    } as NonNullable<TrpcSessionUser>,
  };
}

let user1: User;
let user2: User;
let user3: User;
let team1: Team;
let individualEventType: EventType;
let managedParentEventType: EventType;
const duplicatedEventTypeIds: number[] = [];

describe("duplicateHandler - integration", () => {
  beforeAll(async () => {
    user1 = await prisma.user.create({
      data: {
        username: `dup-test-user1-${timestamp}`,
        email: `dup-test-user1-${timestamp}@example.com`,
        name: "Dup Test User 1",
      },
    });

    user2 = await prisma.user.create({
      data: {
        username: `dup-test-user2-${timestamp}`,
        email: `dup-test-user2-${timestamp}@example.com`,
        name: "Dup Test User 2",
      },
    });

    user3 = await prisma.user.create({
      data: {
        username: `dup-test-user3-${timestamp}`,
        email: `dup-test-user3-${timestamp}@example.com`,
        name: "Dup Test User 3",
      },
    });

    team1 = await prisma.team.create({
      data: {
        name: `Dup Test Team ${timestamp}`,
        slug: `dup-test-team-${timestamp}`,
        members: {
          createMany: {
            data: [
              { userId: user1.id, role: MembershipRole.ADMIN, accepted: true },
              { userId: user2.id, role: MembershipRole.MEMBER, accepted: true },
            ],
          },
        },
      },
    });

    individualEventType = await prisma.eventType.create({
      data: {
        title: "Individual Event",
        slug: `dup-individual-${timestamp}`,
        length: 30,
        userId: user1.id,
      },
    });

    managedParentEventType = await prisma.eventType.create({
      data: {
        title: "Managed Parent Event",
        slug: `dup-managed-parent-${timestamp}`,
        length: 45,
        teamId: team1.id,
        schedulingType: SchedulingType.MANAGED,
        hosts: {
          create: {
            userId: user1.id,
            isFixed: false,
            priority: 2,
            weight: 100,
            weightAdjustment: 0,
          },
        },
      },
    });
  });

  afterAll(async () => {
    try {
      if (duplicatedEventTypeIds.length > 0) {
        await prisma.host.deleteMany({ where: { eventTypeId: { in: duplicatedEventTypeIds } } });
        await prisma.eventType.deleteMany({ where: { id: { in: duplicatedEventTypeIds } } });
      }

      const sourceIds = [individualEventType?.id, managedParentEventType?.id].filter(Boolean);
      if (sourceIds.length > 0) {
        await prisma.host.deleteMany({ where: { eventTypeId: { in: sourceIds } } });
        await prisma.eventType.deleteMany({ where: { id: { in: sourceIds } } });
      }

      if (team1?.id) {
        await prisma.membership.deleteMany({ where: { teamId: team1.id } });
        await prisma.team.deleteMany({ where: { id: team1.id } });
      }

      const userIds = [user1?.id, user2?.id, user3?.id].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should duplicate an individual event type", async () => {
    const result = await duplicateHandler({
      ctx: createCtx(user1),
      input: {
        id: individualEventType.id,
        slug: `dup-individual-copy-${timestamp}`,
        title: "Individual Event Copy",
        description: "A copy of the individual event",
        length: 30,
      },
    });

    duplicatedEventTypeIds.push(result.eventType.id);

    expect(result.eventType.id).not.toBe(individualEventType.id);
    expect(result.eventType.title).toBe("Individual Event Copy");
    expect(result.eventType.slug).toBe(`dup-individual-copy-${timestamp}`);
    expect(result.eventType.length).toBe(30);
  });

  it("should preserve schedulingType MANAGED when duplicating", async () => {
    const result = await duplicateHandler({
      ctx: createCtx(user1),
      input: {
        id: managedParentEventType.id,
        slug: `dup-managed-copy-${timestamp}`,
        title: "Managed Event Copy",
        description: "A copy of managed event",
        length: 45,
        teamId: team1.id,
      },
    });

    duplicatedEventTypeIds.push(result.eventType.id);

    expect(result.eventType.schedulingType).toBe(SchedulingType.MANAGED);
  });

  it("should copy hosts but not children when duplicating a managed event type", async () => {
    const result = await duplicateHandler({
      ctx: createCtx(user1),
      input: {
        id: managedParentEventType.id,
        slug: `dup-managed-hosts-${timestamp}`,
        title: "Managed Event Hosts Copy",
        description: "Copy to test hosts",
        length: 45,
        teamId: team1.id,
      },
    });

    duplicatedEventTypeIds.push(result.eventType.id);

    const duplicatedHosts = await prisma.host.findMany({
      where: { eventTypeId: result.eventType.id },
    });
    expect(duplicatedHosts.length).toBeGreaterThan(0);
    expect(duplicatedHosts[0].userId).toBe(user1.id);

    const children = await prisma.eventType.findMany({
      where: { parentId: result.eventType.id },
    });
    expect(children).toHaveLength(0);
  });

  it("should set parentId to null for duplicated managed event type", async () => {
    const result = await duplicateHandler({
      ctx: createCtx(user1),
      input: {
        id: managedParentEventType.id,
        slug: `dup-managed-parentid-${timestamp}`,
        title: "Managed Event ParentId Check",
        description: "Check parentId is null",
        length: 45,
        teamId: team1.id,
      },
    });

    duplicatedEventTypeIds.push(result.eventType.id);

    const duplicated = await prisma.eventType.findUnique({
      where: { id: result.eventType.id },
    });
    expect(duplicated?.parentId).toBeNull();
  });

  it("should allow team members to duplicate managed event types", async () => {
    const result = await duplicateHandler({
      ctx: createCtx(user2),
      input: {
        id: managedParentEventType.id,
        slug: `dup-managed-member-${timestamp}`,
        title: "Managed Event Member Copy",
        description: "Duplicated by team member",
        length: 45,
        teamId: team1.id,
      },
    });

    duplicatedEventTypeIds.push(result.eventType.id);

    expect(result.eventType).toBeDefined();
    expect(result.eventType.schedulingType).toBe(SchedulingType.MANAGED);
  });

  it("should throw FORBIDDEN when non-team member tries to duplicate managed event type", async () => {
    await expect(
      duplicateHandler({
        ctx: createCtx(user3),
        input: {
          id: managedParentEventType.id,
          slug: `dup-managed-nonmember-${timestamp}`,
          title: "Should Not Duplicate",
          description: "Non-member attempting to duplicate",
          length: 45,
          teamId: team1.id,
        },
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("should throw CONFLICT when duplicating with an existing slug", async () => {
    const conflictSlug = `dup-slug-conflict-${timestamp}`;
    const existingEventType = await prisma.eventType.create({
      data: {
        title: "Existing Event",
        slug: conflictSlug,
        length: 30,
        userId: user1.id,
      },
    });

    try {
      await expect(
        duplicateHandler({
          ctx: createCtx(user1),
          input: {
            id: individualEventType.id,
            slug: conflictSlug,
            title: "Should Conflict",
            description: "Slug conflict test",
            length: 30,
          },
        })
      ).rejects.toMatchObject({
        code: "CONFLICT",
      });
    } finally {
      await prisma.eventType.delete({ where: { id: existingEventType.id } });
    }
  });
});
