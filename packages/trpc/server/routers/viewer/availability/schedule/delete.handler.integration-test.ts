import prisma from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { deleteHandler } from "./delete.handler";

let user: User;
let schedule1Id: number;
let schedule2Id: number;
const timestamp = Date.now();

function createCtx(u: User) {
  return {
    user: {
      id: u.id,
      defaultScheduleId: u.defaultScheduleId,
      timeZone: u.timeZone ?? "UTC",
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

describe("availability.schedule.delete - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `avail-del-${timestamp}`,
        email: `avail-del-${timestamp}@example.com`,
        name: "Schedule Delete Test User",
      },
    });

    const schedule1 = await prisma.schedule.create({
      data: {
        name: `Delete Test Schedule 1 ${timestamp}`,
        userId: user.id,
        timeZone: "UTC",
      },
    });
    schedule1Id = schedule1.id;

    const schedule2 = await prisma.schedule.create({
      data: {
        name: `Delete Test Schedule 2 ${timestamp}`,
        userId: user.id,
        timeZone: "UTC",
      },
    });
    schedule2Id = schedule2.id;

    await prisma.user.update({
      where: { id: user.id },
      data: { defaultScheduleId: schedule1Id },
    });

    user = (await prisma.user.findUniqueOrThrow({ where: { id: user.id } }));
  });

  afterAll(async () => {
    try {
      await prisma.availability.deleteMany({
        where: { scheduleId: { in: [schedule1Id, schedule2Id].filter(Boolean) } },
      });
      await prisma.schedule.deleteMany({
        where: { id: { in: [schedule1Id, schedule2Id].filter(Boolean) } },
      });
      await prisma.user.deleteMany({ where: { id: user?.id } });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should throw UNAUTHORIZED when deleting another user's schedule", async () => {
    const otherUser = await prisma.user.create({
      data: {
        username: `avail-del-other-${timestamp}`,
        email: `avail-del-other-${timestamp}@example.com`,
        name: "Other User",
      },
    });

    try {
      await expect(
        deleteHandler({
          ctx: createCtx(otherUser),
          input: { scheduleId: schedule1Id },
        })
      ).rejects.toThrow();
    } finally {
      await prisma.user.deleteMany({ where: { id: otherUser.id } });
    }
  });

  it("should throw BAD_REQUEST when deleting the only remaining schedule (default)", async () => {
    // Delete schedule2 first so schedule1 is the only one
    await prisma.schedule.delete({ where: { id: schedule2Id } });

    await expect(
      deleteHandler({
        ctx: createCtx(user),
        input: { scheduleId: schedule1Id },
      })
    ).rejects.toThrow();

    // Re-create schedule2 for other tests
    const recreated = await prisma.schedule.create({
      data: {
        name: `Delete Test Schedule 2 recreated ${timestamp}`,
        userId: user.id,
        timeZone: "UTC",
      },
    });
    schedule2Id = recreated.id;
  });

  it("should delete a non-default schedule successfully", async () => {
    await deleteHandler({
      ctx: createCtx(user),
      input: { scheduleId: schedule2Id },
    });

    const deleted = await prisma.schedule.findUnique({ where: { id: schedule2Id } });
    expect(deleted).toBeNull();

    // Recreate for cleanup
    const recreated = await prisma.schedule.create({
      data: {
        name: `Delete Test Schedule 2 re2 ${timestamp}`,
        userId: user.id,
        timeZone: "UTC",
      },
    });
    schedule2Id = recreated.id;
  });
});
