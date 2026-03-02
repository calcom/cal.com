import prisma from "@calcom/prisma";
import type { EventType, Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { listHandler } from "./list.handler";

let user: User;
let otherUser: User;
let team: Team;
let eventType1: EventType;
let eventType2: EventType;
let teamEventType: EventType;
let otherEventType: EventType;
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

describe("eventTypes.list - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `et-list-${timestamp}`,
        email: `et-list-${timestamp}@example.com`,
        name: "EventType List Test User",
      },
    });

    otherUser = await prisma.user.create({
      data: {
        username: `et-list-other-${timestamp}`,
        email: `et-list-other-${timestamp}@example.com`,
        name: "Other User",
      },
    });

    team = await prisma.team.create({
      data: {
        name: `ET List Team ${timestamp}`,
        slug: `et-list-team-${timestamp}`,
        members: {
          create: {
            userId: user.id,
            role: MembershipRole.ADMIN,
            accepted: true,
          },
        },
      },
    });

    eventType1 = await prisma.eventType.create({
      data: {
        title: `List Event 1 ${timestamp}`,
        slug: `list-event-1-${timestamp}`,
        length: 30,
        userId: user.id,
      },
    });

    eventType2 = await prisma.eventType.create({
      data: {
        title: `List Event 2 ${timestamp}`,
        slug: `list-event-2-${timestamp}`,
        length: 60,
        userId: user.id,
      },
    });

    teamEventType = await prisma.eventType.create({
      data: {
        title: `Team Event ${timestamp}`,
        slug: `team-event-${timestamp}`,
        length: 30,
        teamId: team.id,
      },
    });

    otherEventType = await prisma.eventType.create({
      data: {
        title: `Other Event ${timestamp}`,
        slug: `other-event-${timestamp}`,
        length: 30,
        userId: otherUser.id,
      },
    });
  });

  afterAll(async () => {
    try {
      const etIds = [eventType1?.id, eventType2?.id, teamEventType?.id, otherEventType?.id].filter(Boolean);
      if (etIds.length > 0) {
        await prisma.eventType.deleteMany({ where: { id: { in: etIds } } });
      }
      if (team?.id) {
        await prisma.team.deleteMany({ where: { id: team.id } });
      }
      const userIds = [user?.id, otherUser?.id].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should return only user's individual event types (not team events)", async () => {
    const result = await listHandler({ ctx: createCtx(user) });

    const ids = result.map((et) => et.id);
    expect(ids).toContain(eventType1.id);
    expect(ids).toContain(eventType2.id);
    expect(ids).not.toContain(teamEventType.id);
  });

  it("should not return other users' event types", async () => {
    const result = await listHandler({ ctx: createCtx(user) });

    const ids = result.map((et) => et.id);
    expect(ids).not.toContain(otherEventType.id);
  });

  it("should return correct fields for each event type", async () => {
    const result = await listHandler({ ctx: createCtx(user) });

    const et = result.find((e) => e.id === eventType1.id);
    expect(et).toBeDefined();
    expect(et?.title).toBe(eventType1.title);
    expect(et?.slug).toBe(eventType1.slug);
    expect(et?.length).toBe(30);
  });

  it("should return empty array for user with no event types", async () => {
    const emptyUser = await prisma.user.create({
      data: {
        username: `et-list-empty-${timestamp}`,
        email: `et-list-empty-${timestamp}@example.com`,
        name: "Empty User",
      },
    });

    try {
      const result = await listHandler({ ctx: createCtx(emptyUser) });
      expect(result).toHaveLength(0);
    } finally {
      await prisma.user.deleteMany({ where: { id: emptyUser.id } });
    }
  });
});
