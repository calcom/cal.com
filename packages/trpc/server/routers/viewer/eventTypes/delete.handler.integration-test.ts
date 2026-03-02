import prisma from "@calcom/prisma";
import type { EventType, User } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { deleteHandler } from "./delete.handler";

let user: User;
let eventTypeToDelete: EventType;
let eventTypeToKeep: EventType;
const timestamp = Date.now();

function createCtx(u: User) {
  return {
    user: {
      id: u.id,
      email: u.email,
      username: u.username,
      name: u.name,
      organizationId: null,
      organization: { id: null, isOrgAdmin: false, metadata: {}, requestedSlug: null },
      profile: {
        id: u.id,
        upId: `usr-${u.id}`,
        username: u.username ?? "",
        userId: u.id,
        organizationId: null,
        organization: null,
      },
    } as unknown as NonNullable<TrpcSessionUser>,
  };
}

describe("eventTypes.delete - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `et-delete-${timestamp}`,
        email: `et-delete-${timestamp}@example.com`,
        name: "EventType Delete Test User",
      },
    });

    eventTypeToDelete = await prisma.eventType.create({
      data: {
        title: `Delete Me Event ${timestamp}`,
        slug: `delete-me-event-${timestamp}`,
        length: 30,
        userId: user.id,
      },
    });

    eventTypeToKeep = await prisma.eventType.create({
      data: {
        title: `Keep Me Event ${timestamp}`,
        slug: `keep-me-event-${timestamp}`,
        length: 30,
        userId: user.id,
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.eventType.deleteMany({
        where: { id: { in: [eventTypeToKeep?.id].filter(Boolean) } },
      });
      await prisma.user.deleteMany({ where: { id: user?.id } });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should delete an event type and return its id", async () => {
    const result = await deleteHandler({
      ctx: createCtx(user),
      input: { id: eventTypeToDelete.id },
    });

    expect(result.id).toBe(eventTypeToDelete.id);

    const deleted = await prisma.eventType.findUnique({ where: { id: eventTypeToDelete.id } });
    expect(deleted).toBeNull();
  });

  it("should not affect other event types when one is deleted", async () => {
    const remaining = await prisma.eventType.findUnique({ where: { id: eventTypeToKeep.id } });
    expect(remaining).toBeDefined();
    expect(remaining?.title).toBe(eventTypeToKeep.title);
  });

  it("should also delete associated custom inputs", async () => {
    const eventWithCustomInputs = await prisma.eventType.create({
      data: {
        title: `Custom Input Event ${timestamp}`,
        slug: `custom-input-event-${timestamp}`,
        length: 30,
        userId: user.id,
        customInputs: {
          create: {
            label: "Test Input",
            type: "TEXT",
            required: false,
            placeholder: "Enter something",
          },
        },
      },
    });

    await deleteHandler({
      ctx: createCtx(user),
      input: { id: eventWithCustomInputs.id },
    });

    const customInputs = await prisma.eventTypeCustomInput.findMany({
      where: { eventTypeId: eventWithCustomInputs.id },
    });
    expect(customInputs).toHaveLength(0);
  });
});
