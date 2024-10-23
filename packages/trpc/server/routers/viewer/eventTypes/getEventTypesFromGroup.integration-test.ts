import { describe, it, expect } from "vitest";

import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { getEventTypesFromGroup } from "./getEventTypesFromGroup.handler";

describe("getEventTypesFromGroup", async () => {
  const proUser = await prisma.user.findFirstOrThrow({ where: { email: "pro@example.com" } });
  const proUserEventTypes = await prisma.eventType.findMany({ where: { userId: proUser.id } });

  it("should return personal event types for a user", async () => {
    const ctx = {
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
});
