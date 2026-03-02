import prisma from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { duplicateHandler } from "./duplicate.handler";

let user: User;
let sourceScheduleId: number;
const timestamp = Date.now();
const createdScheduleIds: number[] = [];

function createCtx(u: User) {
  return {
    user: {
      id: u.id,
      timeZone: u.timeZone ?? "UTC",
    } as Pick<NonNullable<TrpcSessionUser>, "id" | "timeZone">,
  };
}

describe("availability.schedule.duplicate - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `avail-dup-${timestamp}`,
        email: `avail-dup-${timestamp}@example.com`,
        name: "Schedule Duplicate Test User",
      },
    });

    const schedule = await prisma.schedule.create({
      data: {
        name: `Source Schedule ${timestamp}`,
        userId: user.id,
        timeZone: "America/New_York",
        availability: {
          createMany: {
            data: [
              {
                days: [1, 2, 3, 4, 5],
                startTime: new Date("1970-01-01T09:00:00.000Z"),
                endTime: new Date("1970-01-01T17:00:00.000Z"),
              },
            ],
          },
        },
      },
    });
    sourceScheduleId = schedule.id;
    createdScheduleIds.push(schedule.id);
  });

  afterAll(async () => {
    try {
      if (createdScheduleIds.length > 0) {
        await prisma.availability.deleteMany({ where: { scheduleId: { in: createdScheduleIds } } });
        await prisma.schedule.deleteMany({ where: { id: { in: createdScheduleIds } } });
      }
      await prisma.user.deleteMany({ where: { id: user?.id } });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should duplicate a schedule with (Copy) suffix", async () => {
    const result = await duplicateHandler({
      ctx: createCtx(user),
      input: { scheduleId: sourceScheduleId },
    });

    expect(result.schedule).toBeDefined();
    expect(result.schedule.name).toContain("(Copy)");
    expect(result.schedule.userId).toBe(user.id);
    createdScheduleIds.push(result.schedule.id);
  });

  it("should copy availability entries to duplicated schedule", async () => {
    const duplicatedId = createdScheduleIds[createdScheduleIds.length - 1];
    const availability = await prisma.availability.findMany({
      where: { scheduleId: duplicatedId },
    });

    expect(availability.length).toBeGreaterThan(0);
    expect(availability[0].days).toEqual([1, 2, 3, 4, 5]);
  });

  it("should throw when duplicating another user's schedule", async () => {
    const otherUser = await prisma.user.create({
      data: {
        username: `avail-dup-other-${timestamp}`,
        email: `avail-dup-other-${timestamp}@example.com`,
        name: "Other User",
      },
    });

    try {
      await expect(
        duplicateHandler({
          ctx: createCtx(otherUser),
          input: { scheduleId: sourceScheduleId },
        })
      ).rejects.toThrow();
    } finally {
      await prisma.user.deleteMany({ where: { id: otherUser.id } });
    }
  });
});
