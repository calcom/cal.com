import { beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

import { MonthlyProrationService } from "../MonthlyProrationService";
import { SeatChangeTrackingService } from "../../seatTracking/SeatChangeTrackingService";

vi.mock("@calcom/features/ee/payments/server/stripe", () => ({
  default: {
    invoiceItems: {
      create: vi.fn().mockResolvedValue({
        id: "ii_test_123",
        amount: 1000,
        currency: "usd",
      }),
    },
  },
}));

describe("MonthlyProrationService Integration Tests", () => {
  let testUser: User;
  let testTeam: Team;
  const monthKey = "2026-01";

  beforeEach(async () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);

    testUser = await prisma.user.create({
      data: {
        email: `test-proration-${timestamp}-${randomSuffix}@example.com`,
        username: `testproration-${timestamp}-${randomSuffix}`,
        name: "Test Proration User",
      },
    });

    testTeam = await prisma.team.create({
      data: {
        name: `Test Proration Team ${timestamp}-${randomSuffix}`,
        slug: `test-proration-team-${timestamp}-${randomSuffix}`,
        isOrganization: false,
      },
    });

    await prisma.membership.create({
      data: {
        userId: testUser.id,
        teamId: testTeam.id,
        role: MembershipRole.OWNER,
        accepted: true,
      },
    });

    const subscriptionStart = new Date("2025-06-01T00:00:00Z");
    const subscriptionEnd = new Date("2026-06-01T00:00:00Z");
    const subscriptionTrialEnd = new Date("2025-06-08T00:00:00Z");

    await prisma.teamBilling.create({
      data: {
        teamId: testTeam.id,
        subscriptionId: `sub_test_${timestamp}`,
        subscriptionItemId: `si_test_${timestamp}`,
        customerId: `cus_test_${timestamp}`,
        billingPeriod: "ANNUALLY",
        pricePerSeat: 120.0,
        subscriptionStart,
        subscriptionEnd,
        subscriptionTrialEnd,
      },
    });
  });

  it("should process end-to-end proration for annual team with seat additions", async () => {
    const seatTracker = new SeatChangeTrackingService();
    const prorationService = new MonthlyProrationService();

    await seatTracker.logSeatAddition({
      teamId: testTeam.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 3,
    });

    await seatTracker.logSeatRemoval({
      teamId: testTeam.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 1,
    });

    const proration = await prorationService.createProrationForTeam({
      teamId: testTeam.id,
      monthKey,
    });

    expect(proration).toBeDefined();
    expect(proration?.netSeatIncrease).toBe(2);
    expect(proration?.seatsAdded).toBe(3);
    expect(proration?.seatsRemoved).toBe(1);
    expect(proration?.status).toBe("INVOICE_CREATED");
    expect(proration?.invoiceItemId).toBe("ii_test_123");

    const seatChanges = await prisma.seatChangeLog.findMany({
      where: { teamId: testTeam.id, monthKey },
    });

    expect(seatChanges).toHaveLength(2);
    expect(seatChanges.every((sc) => sc.processedInProrationId === proration?.id)).toBe(true);
  });

  it("should skip proration for team with no net change", async () => {
    const seatTracker = new SeatChangeTrackingService();
    const prorationService = new MonthlyProrationService();

    await seatTracker.logSeatAddition({
      teamId: testTeam.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 2,
    });

    await seatTracker.logSeatRemoval({
      teamId: testTeam.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 2,
    });

    const proration = await prorationService.createProrationForTeam({
      teamId: testTeam.id,
      monthKey,
    });

    expect(proration).toBeNull();

    const prorations = await prisma.monthlyProration.findMany({
      where: { teamId: testTeam.id, monthKey },
    });

    expect(prorations).toHaveLength(0);
  });

  it("should process multiple teams in batch", async () => {
    const timestamp = Date.now();

    const testTeam2 = await prisma.team.create({
      data: {
        name: `Test Proration Team 2 ${timestamp}`,
        slug: `test-proration-team-2-${timestamp}`,
        isOrganization: false,
      },
    });

    await prisma.membership.create({
      data: {
        userId: testUser.id,
        teamId: testTeam2.id,
        role: MembershipRole.OWNER,
        accepted: true,
      },
    });

    await prisma.teamBilling.create({
      data: {
        teamId: testTeam2.id,
        subscriptionId: `sub_test_2_${timestamp}`,
        subscriptionItemId: `si_test_2_${timestamp}`,
        customerId: `cus_test_2_${timestamp}`,
        billingPeriod: "ANNUALLY",
        pricePerSeat: 100.0,
        subscriptionStart: new Date("2025-06-01T00:00:00Z"),
        subscriptionEnd: new Date("2026-06-01T00:00:00Z"),
        subscriptionTrialEnd: new Date("2025-06-08T00:00:00Z"),
      },
    });

    const seatTracker = new SeatChangeTrackingService();

    await seatTracker.logSeatAddition({
      teamId: testTeam.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 2,
    });

    await seatTracker.logSeatAddition({
      teamId: testTeam2.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 3,
    });

    const prorationService = new MonthlyProrationService();
    const results = await prorationService.processMonthlyProrations({ monthKey });

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.status === "INVOICE_CREATED")).toBe(true);
  });

  it("should handle payment success callback", async () => {
    const seatTracker = new SeatChangeTrackingService();
    const prorationService = new MonthlyProrationService();

    await seatTracker.logSeatAddition({
      teamId: testTeam.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 2,
    });

    const proration = await prorationService.createProrationForTeam({
      teamId: testTeam.id,
      monthKey,
    });

    expect(proration?.status).toBe("INVOICE_CREATED");

    await prorationService.handleProrationPaymentSuccess(proration!.id);

    const updated = await prisma.monthlyProration.findUnique({
      where: { id: proration!.id },
    });

    expect(updated?.status).toBe("CHARGED");
    expect(updated?.chargedAt).toBeDefined();
  });

  it("should handle payment failure callback", async () => {
    const seatTracker = new SeatChangeTrackingService();
    const prorationService = new MonthlyProrationService();

    await seatTracker.logSeatAddition({
      teamId: testTeam.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 2,
    });

    const proration = await prorationService.createProrationForTeam({
      teamId: testTeam.id,
      monthKey,
    });

    await prorationService.handleProrationPaymentFailure({
      prorationId: proration!.id,
      reason: "insufficient funds",
    });

    const updated = await prisma.monthlyProration.findUnique({
      where: { id: proration!.id },
    });

    expect(updated?.status).toBe("FAILED");
    expect(updated?.failedAt).toBeDefined();
    expect(updated?.failureReason).toBe("insufficient funds");
    expect(updated?.retryCount).toBe(1);
  });
});
