import prisma from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { describe, expect, it } from "vitest";
import { getEventTypesFromGroup } from "./getEventTypesFromGroup.handler";

describe("getEventTypesFromGroup", async () => {
  const proUser = await prisma.user.findFirstOrThrow({ where: { email: "pro@example.com" } });
  const proUserEventTypes = await prisma.eventType.findMany({ where: { userId: proUser.id } });

  const teamProUser = await prisma.user.findFirstOrThrow({ where: { email: "teampro@example.com" } });
  const teamProMembership = await prisma.membership.findFirstOrThrow({
    where: { userId: teamProUser.id, accepted: true },
  });

  const teamId = teamProMembership.teamId;

  const proUserCtx = {
    user: {
      id: proUser.id,
      name: proUser.name,
      profile: {
        name: proUser.name,
        organizationId: null,
        organization: null,
        username: proUser.username,
        id: null,
        upId: "usr-4",
      },
    } as NonNullable<TrpcSessionUser>,
    prisma,
  };

  const teamProUserCtx = {
    user: {
      id: teamProUser.id,
      name: teamProUser.name,
      profile: {
        name: teamProUser.name,
        organizationId: null,
        organization: null,
        username: teamProUser.username,
        id: null,
        upId: "usr-9",
      },
    } as NonNullable<TrpcSessionUser>,
    prisma,
  };

  const createManagedEventTypes = async () => {
    const childEventType = await prisma.eventType.create({
      data: {
        title: "Child Event Type",
        slug: "managed-event-type",
        schedulingType: null,
        length: 30,
        userId: teamProUser.id,
      },
    });

    const parentEventType = await prisma.eventType.create({
      data: {
        title: "Managed Event Type",
        slug: "managed-event-type",
        schedulingType: SchedulingType.MANAGED,
        length: 30,
        teamId,
      },
    });

    // Connect child event type to parent event type
    await prisma.eventType.update({
      where: {
        id: childEventType.id,
      },
      data: {
        parent: {
          connect: {
            id: parentEventType.id,
          },
        },
      },
    });

    return {
      parentEventType,
      childEventType,
    };
  };

  it("should return personal event types for a user", async () => {
    const ctx = proUserCtx;

    const res = await getEventTypesFromGroup({
      ctx,
      input: {
        group: {
          teamId: null,
          parentId: null,
        },
        limit: 10,
        cursor: null,
      },
    });

    const resEventTypeIds = res.eventTypes.map((et) => et.id);
    const proUserEventTypeIds = proUserEventTypes.map((et) => et.id);

    expect(res.eventTypes).toBeDefined();
    expect(res.eventTypes.length).toBeGreaterThan(0);
    expect(resEventTypeIds).toEqual(expect.arrayContaining(proUserEventTypeIds));
    expect(resEventTypeIds.length).toBe(proUserEventTypeIds.length);
  });

  it("should return team event types for a user", async () => {
    const response = await getEventTypesFromGroup({
      ctx: teamProUserCtx,
      input: {
        group: {
          teamId,
          parentId: null,
        },
        limit: 10,
        cursor: null,
      },
    });

    const resEventTypeIds = response.eventTypes.map((et) => et.id);

    const seededTeamEventTypes = await prisma.eventType.findMany({ where: { teamId } });
    const teamProUserEventTypeIds = seededTeamEventTypes.map((et) => et.id);

    expect(response.eventTypes).toBeDefined();
    expect(response.eventTypes.length).toBeGreaterThan(0);
    expect(resEventTypeIds).toEqual(expect.arrayContaining(teamProUserEventTypeIds));
    expect(resEventTypeIds.length).toBe(teamProUserEventTypeIds.length);
  });

  it("should return managed event types event types", async () => {
    const { parentEventType, childEventType } = await createManagedEventTypes();

    const res = await getEventTypesFromGroup({
      ctx: teamProUserCtx,
      input: {
        group: {
          teamId: null,
          parentId: null,
        },
        limit: 10,
        cursor: null,
      },
    });

    const resEventTypeIds = res.eventTypes.map((et) => et.id);

    const managedEventType = await prisma.eventType.findFirstOrThrow({
      where: {
        parentId: {
          not: null,
        },
        schedulingType: null,
        userId: teamProUser.id,
      },
    });

    expect(res.eventTypes).toBeDefined();
    expect(resEventTypeIds).toContain(managedEventType.id);

    await deleteEventTypes({ ids: [parentEventType.id, childEventType.id] });
  });
});

const deleteEventTypes = async ({ ids }: { ids: number[] }) => {
  await prisma.eventType.deleteMany({ where: { id: { in: ids } } });
};
