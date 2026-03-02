import prisma from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { reserveSlotHandler } from "./reserveSlot.handler";

let user: User;
let eventTypeId: number;
const timestamp = Date.now();

describe("slots.reserveSlot - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `slots-reserve-${timestamp}`,
        email: `slots-reserve-${timestamp}@example.com`,
        name: "Reserve Slot Test User",
      },
    });

    const eventType = await prisma.eventType.create({
      data: {
        title: `Reserve Slot Event ${timestamp}`,
        slug: `reserve-slot-${timestamp}`,
        length: 30,
        userId: user.id,
        users: {
          connect: { id: user.id },
        },
      },
    });
    eventTypeId = eventType.id;
  });

  afterAll(async () => {
    try {
      await prisma.selectedSlots.deleteMany({ where: { eventTypeId } });
      await prisma.eventType.deleteMany({ where: { userId: user?.id } });
      await prisma.user.deleteMany({ where: { id: user?.id } });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should throw NOT_FOUND for non-existent event type", async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const endDate = new Date(futureDate.getTime() + 30 * 60 * 1000);

    await expect(
      reserveSlotHandler({
        ctx: {
          prisma: prisma as unknown as PrismaClient,
        },
        input: {
          eventTypeId: 999999999,
          slotUtcStartDate: futureDate.toISOString(),
          slotUtcEndDate: endDate.toISOString(),
        },
      })
    ).rejects.toThrow();
  });

  it("should reserve a slot and return uid", async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const endDate = new Date(futureDate.getTime() + 30 * 60 * 1000);

    const result = await reserveSlotHandler({
      ctx: {
        prisma: prisma as unknown as PrismaClient,
      },
      input: {
        eventTypeId,
        slotUtcStartDate: futureDate.toISOString(),
        slotUtcEndDate: endDate.toISOString(),
      },
    });

    expect(result).toHaveProperty("uid");
    expect(typeof result.uid).toBe("string");

    // Verify the slot was created in DB
    const slots = await prisma.selectedSlots.findMany({
      where: { eventTypeId },
    });
    expect(slots.length).toBeGreaterThanOrEqual(1);
  });

  it("should support dry run mode without creating slots", async () => {
    const futureDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    const endDate = new Date(futureDate.getTime() + 30 * 60 * 1000);

    // Clean existing slots first
    await prisma.selectedSlots.deleteMany({ where: { eventTypeId } });

    const result = await reserveSlotHandler({
      ctx: {
        prisma: prisma as unknown as PrismaClient,
      },
      input: {
        eventTypeId,
        slotUtcStartDate: futureDate.toISOString(),
        slotUtcEndDate: endDate.toISOString(),
        _isDryRun: true,
      },
    });

    expect(result).toHaveProperty("uid");

    // Verify no new slots were created
    const slots = await prisma.selectedSlots.findMany({
      where: {
        eventTypeId,
        slotUtcStartDate: futureDate.toISOString(),
      },
    });
    expect(slots.length).toBe(0);
  });
});
