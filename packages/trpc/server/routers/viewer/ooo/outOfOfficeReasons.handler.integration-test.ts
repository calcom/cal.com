import prisma from "@calcom/prisma";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { outOfOfficeReasonList } from "./outOfOfficeReasons.handler";

describe("outOfOfficeReasonList integration", () => {
  const timestamp = Date.now();
  let createdReasonId: number | undefined;

  beforeAll(async () => {
    // Ensure at least one enabled reason exists for testing
    const existingReasons = await prisma.outOfOfficeReason.findMany({
      where: { enabled: true },
    });

    if (existingReasons.length === 0) {
      const reason = await prisma.outOfOfficeReason.create({
        data: {
          emoji: "🏖️",
          reason: `Test Vacation ${timestamp}`,
          enabled: true,
        },
      });
      createdReasonId = reason.id;
    }
  });

  afterAll(async () => {
    try {
      if (createdReasonId) {
        await prisma.outOfOfficeReason.delete({
          where: { id: createdReasonId },
        });
      }
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should return a list of enabled out-of-office reasons", async () => {
    const reasons = await outOfOfficeReasonList();

    expect(Array.isArray(reasons)).toBe(true);
    expect(reasons.length).toBeGreaterThan(0);

    // All returned reasons should be enabled
    for (const reason of reasons) {
      expect(reason.enabled).toBe(true);
    }
  });

  it("should not return disabled reasons", async () => {
    // Create a disabled reason
    const disabledReason = await prisma.outOfOfficeReason.create({
      data: {
        emoji: "🚫",
        reason: `Disabled Reason ${timestamp}`,
        enabled: false,
      },
    });

    try {
      const reasons = await outOfOfficeReasonList();
      const foundDisabled = reasons.find((r: { id: number }) => r.id === disabledReason.id);
      expect(foundDisabled).toBeUndefined();
    } finally {
      await prisma.outOfOfficeReason.delete({
        where: { id: disabledReason.id },
      });
    }
  });

  it("should return reasons with expected fields", async () => {
    const reasons = await outOfOfficeReasonList();

    expect(reasons.length).toBeGreaterThan(0);
    const firstReason = reasons[0];
    expect(firstReason).toHaveProperty("id");
    expect(firstReason).toHaveProperty("emoji");
    expect(firstReason).toHaveProperty("reason");
    expect(firstReason).toHaveProperty("enabled");
  });
});
