import prisma from "@calcom/prisma";
import type { EventType, User } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bulkEventFetchHandler } from "./bulkEventFetch.handler";

let user: User;
let eventType1: EventType;
let eventType2: EventType;
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

describe("eventTypes.bulkEventFetch - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `et-bulk-${timestamp}`,
        email: `et-bulk-${timestamp}@example.com`,
        name: "BulkEventFetch Test User",
      },
    });

    eventType1 = await prisma.eventType.create({
      data: {
        title: `Bulk Event 1 ${timestamp}`,
        slug: `bulk-event-1-${timestamp}`,
        length: 30,
        userId: user.id,
      },
    });

    eventType2 = await prisma.eventType.create({
      data: {
        title: `Bulk Event 2 ${timestamp}`,
        slug: `bulk-event-2-${timestamp}`,
        length: 60,
        userId: user.id,
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.eventType.deleteMany({
        where: { id: { in: [eventType1?.id, eventType2?.id].filter(Boolean) } },
      });
      await prisma.user.deleteMany({ where: { id: user?.id } });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should fetch event types in bulk for the user", async () => {
    const result = await bulkEventFetchHandler({
      ctx: createCtx(user),
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.eventTypes)).toBe(true);

    const ids = result.eventTypes.map((et: { id: number }) => et.id);
    expect(ids).toContain(eventType1.id);
    expect(ids).toContain(eventType2.id);
  });
});
