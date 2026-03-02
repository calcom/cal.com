import { randomString } from "@calcom/lib/random";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@calcom/prisma";
import { DunningStatus } from "@calcom/prisma/enums";

import { TeamRepository } from "../../../teams/repositories/TeamRepository";
import { TeamDunningRepository } from "./TeamDunningRepository";


let testBillingId: string;
let secondBillingId: string;
let thirdBillingId: string;
const createdTeamIds: number[] = [];
const createdBillingIds: string[] = [];

async function cleanup() {
  if (createdBillingIds.length > 0) {
    await prisma.teamDunningStatus.deleteMany({
      where: { teamBillingId: { in: createdBillingIds } },
    });
    await prisma.teamBilling.deleteMany({
      where: { id: { in: createdBillingIds } },
    });
  }
  if (createdTeamIds.length > 0) {
    await prisma.team.deleteMany({
      where: { id: { in: createdTeamIds } },
    });
  }
  createdTeamIds.length = 0;
  createdBillingIds.length = 0;
}

describe("TeamDunningRepository (Integration Tests)", () => {
  const repository = new TeamDunningRepository();
  const teamRepository = new TeamRepository(prisma);

  async function createTestTeamWithBilling(suffix: string): Promise<string> {
    const team = await teamRepository.create({
      name: `Dunning Test Team ${suffix}`,
      slug: `dunning-test-${randomString()}-${suffix}`,
    });
    createdTeamIds.push(team.id);

    const billing = await prisma.teamBilling.create({
      data: {
        teamId: team.id,
        subscriptionId: `sub_test_${randomString()}_${suffix}`,
        subscriptionItemId: `si_test_${randomString()}_${suffix}`,
        customerId: `cus_test_${randomString()}_${suffix}`,
        status: "active",
        planName: "TEAM",
      },
      select: { id: true },
    });
    createdBillingIds.push(billing.id);
    return billing.id;
  }

  beforeAll(async () => {
    testBillingId = await createTestTeamWithBilling("a");
    secondBillingId = await createTestTeamWithBilling("b");
    thirdBillingId = await createTestTeamWithBilling("c");
  });

  afterEach(async () => {
    await prisma.teamDunningStatus.deleteMany({
      where: { teamBillingId: { in: createdBillingIds } },
    });
  });

  afterAll(async () => {
    await cleanup();
  });

  describe("findByBillingId", () => {
    it("returns dunning status when found", async () => {
      await repository.upsert(testBillingId, {
        status: DunningStatus.WARNING,
        firstFailedAt: new Date("2025-01-15"),
        lastFailedAt: new Date("2025-01-20"),
        subscriptionId: "sub_123",
        failedInvoiceId: "inv_123",
        invoiceUrl: "https://stripe.com/invoice/123",
        failureReason: "card_declined",
      });

      const result = await repository.findByBillingId(testBillingId);

      expect(result).not.toBeNull();
      expect(result!.billingFk).toBe(testBillingId);
      expect(result!.status).toBe(DunningStatus.WARNING);
      expect(result!.subscriptionId).toBe("sub_123");
      expect(result!.failureReason).toBe("card_declined");
    });

    it("returns null when no dunning status exists", async () => {
      const result = await repository.findByBillingId("nonexistent_id");
      expect(result).toBeNull();
    });
  });

  describe("upsert", () => {
    it("creates a new dunning record when none exists", async () => {
      const result = await repository.upsert(testBillingId, {
        status: DunningStatus.WARNING,
        firstFailedAt: new Date("2025-01-15"),
        lastFailedAt: new Date("2025-01-15"),
        subscriptionId: "sub_new",
        failedInvoiceId: "inv_new",
        invoiceUrl: "https://stripe.com/invoice/new",
        failureReason: "card_declined",
      });

      expect(result.billingFk).toBe(testBillingId);
      expect(result.status).toBe(DunningStatus.WARNING);
      expect(result.subscriptionId).toBe("sub_new");
    });

    it("updates an existing dunning record", async () => {
      const created = await repository.upsert(testBillingId, {
        status: DunningStatus.WARNING,
        firstFailedAt: new Date("2025-01-15"),
        lastFailedAt: new Date("2025-01-15"),
        subscriptionId: "sub_123",
      });

      const updated = await repository.upsert(testBillingId, {
        status: DunningStatus.SOFT_BLOCKED,
        lastFailedAt: new Date("2025-01-20"),
      });

      expect(updated.id).toBe(created.id);
      expect(updated.status).toBe(DunningStatus.SOFT_BLOCKED);
    });
  });

  describe("findEntitiesToAdvance", () => {
    it("returns entities with WARNING, SOFT_BLOCKED, or HARD_BLOCKED status", async () => {
      await repository.upsert(testBillingId, {
        status: DunningStatus.WARNING,
        firstFailedAt: new Date("2025-01-15"),
        lastFailedAt: new Date("2025-01-15"),
      });

      await repository.upsert(secondBillingId, {
        status: DunningStatus.SOFT_BLOCKED,
        firstFailedAt: new Date("2025-01-10"),
        lastFailedAt: new Date("2025-01-18"),
      });

      const result = await repository.findEntitiesToAdvance();
      const billingIds = result.map((r) => r.billingFk);

      expect(billingIds).toContain(testBillingId);
      expect(billingIds).toContain(secondBillingId);
    });

    it("excludes resolved entities", async () => {
      await repository.upsert(testBillingId, {
        status: DunningStatus.WARNING,
        firstFailedAt: new Date("2025-01-15"),
        lastFailedAt: new Date("2025-01-15"),
        resolvedAt: new Date("2025-01-16"),
      });

      const result = await repository.findEntitiesToAdvance();
      const billingIds = result.map((r) => r.billingFk);

      expect(billingIds).not.toContain(testBillingId);
    });

    it("excludes CURRENT status entities", async () => {
      await repository.upsert(testBillingId, {
        status: DunningStatus.CURRENT,
      });

      const result = await repository.findEntitiesToAdvance();
      const billingIds = result.map((r) => r.billingFk);

      expect(billingIds).not.toContain(testBillingId);
    });
  });

  describe("findByBillingIds", () => {
    it("returns dunning records for given billing IDs that are not CURRENT", async () => {
      await repository.upsert(testBillingId, {
        status: DunningStatus.WARNING,
        firstFailedAt: new Date("2025-01-15"),
        invoiceUrl: "https://stripe.com/invoice/10",
        failureReason: "card_declined",
      });

      await repository.upsert(secondBillingId, {
        status: DunningStatus.HARD_BLOCKED,
        firstFailedAt: new Date("2025-01-10"),
        failureReason: "insufficient_funds",
      });

      await repository.upsert(thirdBillingId, {
        status: DunningStatus.CURRENT,
      });

      const result = await repository.findByBillingIds([testBillingId, secondBillingId, thirdBillingId]);

      expect(result).toHaveLength(2);
      const billingIds = result.map((r) => r.billingFk);
      expect(billingIds).toContain(testBillingId);
      expect(billingIds).toContain(secondBillingId);
      expect(billingIds).not.toContain(thirdBillingId);
    });

    it("returns empty array when given empty billing IDs", async () => {
      const result = await repository.findByBillingIds([]);
      expect(result).toEqual([]);
    });
  });

  describe("advanceStatus", () => {
    it("updates the dunning status", async () => {
      await repository.upsert(testBillingId, {
        status: DunningStatus.WARNING,
        firstFailedAt: new Date("2025-01-15"),
        lastFailedAt: new Date("2025-01-15"),
      });

      const result = await repository.advanceStatus(testBillingId, DunningStatus.SOFT_BLOCKED);

      expect(result.status).toBe(DunningStatus.SOFT_BLOCKED);

      const fetched = await repository.findByBillingId(testBillingId);
      expect(fetched!.status).toBe(DunningStatus.SOFT_BLOCKED);
    });
  });
});
