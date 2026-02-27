import "@calcom/testing/lib/__mocks__/prisma";
import { describe, it, expect } from "vitest";

import { prisma } from "@calcom/prisma";

import { getTeamIdFromEventType } from "./getTeamIdFromEventType";

describe("getTeamIdFromEventType integration tests", () => {
  it("returns team ID when event type has a direct team", async () => {
    const team = await prisma.team.create({
      data: {
        name: "Direct Team",
        slug: `direct-team-${Date.now()}`,
      },
    });

    const result = await getTeamIdFromEventType({
      eventType: { team: { id: team.id }, parentId: null },
    });
    expect(result).toBe(team.id);
  });

  it("resolves parent team ID for managed event type", async () => {
    const team = await prisma.team.create({
      data: {
        name: "Parent Team",
        slug: `parent-team-${Date.now()}`,
      },
    });

    const user = await prisma.user.create({
      data: {
        email: `teamet-${Date.now()}@test.com`,
        username: `teamet-${Date.now()}`,
      },
    });

    const parentET = await prisma.eventType.create({
      data: {
        title: "Parent Event",
        slug: `parent-event-${Date.now()}`,
        length: 30,
        teamId: team.id,
      },
    });

    await prisma.eventType.create({
      data: {
        title: "Child Event",
        slug: `child-event-${Date.now()}`,
        length: 30,
        parentId: parentET.id,
        userId: user.id,
      },
    });

    const result = await getTeamIdFromEventType({
      eventType: { team: null, parentId: parentET.id },
    });
    expect(result).toBe(team.id);
  });

  it("returns undefined when event type has no team and no parent", async () => {
    const result = await getTeamIdFromEventType({
      eventType: { team: null, parentId: null },
    });
    expect(result).toBeUndefined();
  });

  it("returns null when event type is null", async () => {
    const result = await getTeamIdFromEventType({
      eventType: null as unknown as { team: { id: number | null } | null; parentId: number | null },
    });
    expect(result).toBeNull();
  });
});
