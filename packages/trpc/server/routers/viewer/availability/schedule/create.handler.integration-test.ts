import prisma from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createHandler } from "./create.handler";

let user: User;
const timestamp = Date.now();
const createdScheduleIds: number[] = [];

function createCtx(u: User) {
  return {
    user: {
      id: u.id,
      timeZone: u.timeZone ?? "UTC",
      defaultScheduleId: u.defaultScheduleId,
    } as Pick<NonNullable<TrpcSessionUser>, "id" | "timeZone" | "defaultScheduleId">,
  };
}

describe("availability.schedule.create - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `avail-create-${timestamp}`,
        email: `avail-create-${timestamp}@example.com`,
        name: "Schedule Create Test User",
      },
    });
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

  it("should create a schedule with default availability", async () => {
    const result = await createHandler({
      ctx: createCtx(user),
      input: { name: `Test Schedule ${timestamp}` },
    });

    expect(result.schedule).toBeDefined();
    expect(result.schedule.id).toBeDefined();
    expect(result.schedule.userId).toBe(user.id);
    createdScheduleIds.push(result.schedule.id);
  });

  it("should set the first schedule as default", async () => {
    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updatedUser?.defaultScheduleId).toBe(createdScheduleIds[0]);
  });

  it("should create additional schedule without overriding default", async () => {
    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    const result = await createHandler({
      ctx: {
        user: {
          id: user.id,
          timeZone: user.timeZone ?? "UTC",
          defaultScheduleId: updatedUser?.defaultScheduleId ?? null,
        } as Pick<NonNullable<TrpcSessionUser>, "id" | "timeZone" | "defaultScheduleId">,
      },
      input: { name: `Second Schedule ${timestamp}` },
    });

    expect(result.schedule).toBeDefined();
    createdScheduleIds.push(result.schedule.id);

    const userAfter = await prisma.user.findUnique({ where: { id: user.id } });
    expect(userAfter?.defaultScheduleId).toBe(createdScheduleIds[0]);
  });

  it("should create availability entries for the schedule", async () => {
    const availability = await prisma.availability.findMany({
      where: { scheduleId: createdScheduleIds[0] },
    });
    expect(availability.length).toBeGreaterThan(0);
  });
});
