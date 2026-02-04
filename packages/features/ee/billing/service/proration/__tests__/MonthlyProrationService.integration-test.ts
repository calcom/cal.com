import { TeamService } from "@calcom/features/ee/teams/services/teamService";
import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";
import prisma from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { createMemberships } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildMonthlyProrationMetadata } from "../../../lib/proration-utils";
import type { IBillingProviderService } from "../../billingProvider/IBillingProviderService";
import { SeatChangeTrackingService } from "../../seatTracking/SeatChangeTrackingService";
import { MonthlyProrationService } from "../MonthlyProrationService";

function getTestDates() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-indexed

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const subscriptionStart = new Date(Date.UTC(year, month - 6, 1, 0, 0, 0));
  const subscriptionEnd = new Date(Date.UTC(year, month + 6, 1, 0, 0, 0));
  const subscriptionTrialEnd = new Date(Date.UTC(year, month - 6, 8, 0, 0, 0));

  return { monthKey, subscriptionStart, subscriptionEnd, subscriptionTrialEnd };
}

const mockBillingService: IBillingProviderService = {
  createInvoiceItem: vi
    .fn()
    .mockResolvedValue({ invoiceItemId: "ii_test_123" }),
  deleteInvoiceItem: vi.fn().mockResolvedValue(undefined),
  createInvoice: vi.fn().mockResolvedValue({ invoiceId: "in_test_123" }),
  finalizeInvoice: vi
    .fn()
    .mockResolvedValue({ invoiceUrl: "https://invoice.stripe.com/test" }),
  getSubscription: vi.fn().mockResolvedValue({
    items: [
      {
        id: "si_test_123",
        quantity: 1,
        price: { unit_amount: 12000, recurring: { interval: "year" } },
      },
    ],
    customer: "cus_test_123",
    status: "active",
    current_period_start: 1622505600,
    current_period_end: 1654041600,
    trial_end: null,
  }),
  handleSubscriptionUpdate: vi.fn().mockResolvedValue(undefined),
  // Add stub implementations for other required interface methods
  checkoutSessionIsPaid: vi.fn().mockResolvedValue(true),
  handleSubscriptionCancel: vi.fn().mockResolvedValue(undefined),
  handleSubscriptionCreation: vi.fn().mockResolvedValue(undefined),
  handleEndTrial: vi.fn().mockResolvedValue(undefined),
  createCustomer: vi
    .fn()
    .mockResolvedValue({ stripeCustomerId: "cus_test_123" }),
  createPaymentIntent: vi
    .fn()
    .mockResolvedValue({ id: "pi_test_123", client_secret: "secret_123" }),
  createSubscriptionCheckout: vi.fn().mockResolvedValue({
    checkoutUrl: "https://checkout.test",
    sessionId: "cs_test_123",
  }),
  createPrice: vi.fn().mockResolvedValue({ priceId: "price_test_123" }),
  getPrice: vi.fn().mockResolvedValue(null),
  getSubscriptionStatus: vi.fn().mockResolvedValue(null),
  getCheckoutSession: vi.fn().mockResolvedValue(null),
  getCustomer: vi.fn().mockResolvedValue(null),
  getSubscriptions: vi.fn().mockResolvedValue(null),
  updateCustomer: vi.fn().mockResolvedValue(undefined),
  getPaymentIntentFailureReason: vi.fn().mockResolvedValue(null),
  hasDefaultPaymentMethod: vi.fn().mockResolvedValue(true),
  voidInvoice: vi.fn().mockResolvedValue(undefined),
  createSubscriptionUsageRecord: vi.fn().mockResolvedValue(undefined),
} satisfies IBillingProviderService;

const mockFeaturesRepository: IFeaturesRepository = {
  checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(true),
  checkIfUserHasFeature: vi.fn().mockResolvedValue(false),
  getUserFeaturesStatus: vi.fn().mockResolvedValue({}),
  checkIfUserHasFeatureNonHierarchical: vi.fn().mockResolvedValue(false),
  checkIfTeamHasFeature: vi.fn().mockResolvedValue(false),
  getTeamsWithFeatureEnabled: vi.fn().mockResolvedValue([]),
  setUserFeatureState: vi.fn().mockResolvedValue(undefined),
  setTeamFeatureState: vi.fn().mockResolvedValue(undefined),
  getUserFeatureStates: vi.fn().mockResolvedValue({}),
  getTeamsFeatureStates: vi.fn().mockResolvedValue({}),
  getUserAutoOptIn: vi.fn().mockResolvedValue(false),
  getTeamsAutoOptIn: vi.fn().mockResolvedValue({}),
  setUserAutoOptIn: vi.fn().mockResolvedValue(undefined),
  setTeamAutoOptIn: vi.fn().mockResolvedValue(undefined),
};

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

describe("MonthlyProrationService Integration Tests", () => {
  let testUser: User;
  let testTeam: Team;
  let billingCustomerId: string;
  const testDates = getTestDates();
  const monthKey = testDates.monthKey;

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

    billingCustomerId = `cus_test_${timestamp}`;

    await prisma.teamBilling.create({
      data: {
        teamId: testTeam.id,
        subscriptionId: `sub_test_${timestamp}`,
        subscriptionItemId: `si_test_${timestamp}`,
        customerId: billingCustomerId,
        billingPeriod: "ANNUALLY",
        pricePerSeat: 12000,
        paidSeats: 0,
        subscriptionStart: testDates.subscriptionStart,
        subscriptionEnd: testDates.subscriptionEnd,
        subscriptionTrialEnd: testDates.subscriptionTrialEnd,
        status: "ACTIVE",
        planName: "TEAM",
      },
    });
  });

  it("should process end-to-end proration for annual team with seat additions", async () => {
    const prorationService = new MonthlyProrationService(
      undefined,
      mockBillingService
    );
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);

    vi.mocked(mockBillingService.createInvoice).mockClear();
    vi.mocked(mockBillingService.createInvoiceItem).mockClear();

    const newMembers = await Promise.all(
      [0, 1, 2].map((index) =>
        prisma.user.create({
          data: {
            email: `test-proration-member-${timestamp}-${randomSuffix}-${index}@example.com`,
            username: `testprorationmember-${timestamp}-${randomSuffix}-${index}`,
            name: `Test Proration Member ${index}`,
          },
          select: {
            id: true,
            email: true,
            username: true,
            identityProvider: true,
            completedOnboarding: true,
          },
        })
      )
    );

    await createMemberships({
      teamId: testTeam.id,
      language: "en",
      invitees: newMembers.map((member) => ({
        ...member,
        profiles: [],
        teams: [],
        password: null,
        newRole: MembershipRole.MEMBER,
        needToCreateOrgMembership: false,
      })),
      parentId: null,
      accepted: true,
    });

    await TeamService.leaveTeamMembership({
      teamId: testTeam.id,
      userId: newMembers[0].id,
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
    expect(mockBillingService.createInvoice).toHaveBeenCalledWith({
      customerId: billingCustomerId,
      autoAdvance: true,
      collectionMethod: "charge_automatically",
      subscriptionId: proration!.subscriptionId,
      metadata: buildMonthlyProrationMetadata({ prorationId: proration!.id }),
    });

    const seatChanges = await prisma.seatChangeLog.findMany({
      where: { teamId: testTeam.id, monthKey },
    });

    expect(seatChanges).toHaveLength(2);
    expect(
      seatChanges.every((sc) => sc.processedInProrationId === proration?.id)
    ).toBe(true);
  });

  it("should create a $0 proration for team with no net change", async () => {
    const seatTracker = new SeatChangeTrackingService();
    const prorationService = new MonthlyProrationService(
      undefined,
      mockBillingService
    );

    await seatTracker.logSeatAddition({
      teamId: testTeam.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 2,
      monthKey,
    });

    await seatTracker.logSeatRemoval({
      teamId: testTeam.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 2,
      monthKey,
    });

    const proration = await prorationService.createProrationForTeam({
      teamId: testTeam.id,
      monthKey,
    });

    expect(proration).toBeDefined();
    expect(proration?.netSeatIncrease).toBe(0);
    expect(proration?.seatsAdded).toBe(2);
    expect(proration?.seatsRemoved).toBe(2);
    expect(proration?.proratedAmount).toBe(0);
    expect(proration?.status).toBe("CHARGED");
    expect(proration?.invoiceItemId).toBeNull();

    const prorations = await prisma.monthlyProration.findMany({
      where: { teamId: testTeam.id, monthKey },
    });

    expect(prorations).toHaveLength(1);
    expect(prorations[0]?.id).toBe(proration?.id);
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
        pricePerSeat: 10000,
        paidSeats: 0,
        subscriptionStart: testDates.subscriptionStart,
        subscriptionEnd: testDates.subscriptionEnd,
        subscriptionTrialEnd: testDates.subscriptionTrialEnd,
        status: "ACTIVE",
        planName: "TEAM",
      },
    });

    const seatTracker = new SeatChangeTrackingService();

    await seatTracker.logSeatAddition({
      teamId: testTeam.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 2,
      monthKey,
    });

    await seatTracker.logSeatAddition({
      teamId: testTeam2.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 3,
      monthKey,
    });

    const prorationService = new MonthlyProrationService({
      logger: mockLogger,
      featuresRepository: mockFeaturesRepository,
      billingService: mockBillingService,
    });
    const results = await prorationService.processMonthlyProrations({
      monthKey,
    });

    const filteredResults = results.filter((r) =>
      [testTeam.id, testTeam2.id].includes(r.teamId)
    );
    expect(filteredResults).toHaveLength(2);
    expect(filteredResults.every((r) => r.status === "INVOICE_CREATED")).toBe(
      true
    );
  });

  it("should handle payment success callback", async () => {
    const seatTracker = new SeatChangeTrackingService();
    const prorationService = new MonthlyProrationService(
      undefined,
      mockBillingService
    );

    await seatTracker.logSeatAddition({
      teamId: testTeam.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 2,
      monthKey,
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
    const prorationService = new MonthlyProrationService(
      undefined,
      mockBillingService
    );

    await seatTracker.logSeatAddition({
      teamId: testTeam.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 2,
      monthKey,
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

  it("should call handleSubscriptionUpdate when updating subscription quantity", async () => {
    const seatTracker = new SeatChangeTrackingService();
    const prorationService = new MonthlyProrationService(
      undefined,
      mockBillingService
    );

    // Reset the mock to track calls
    vi.mocked(mockBillingService.handleSubscriptionUpdate).mockClear();

    await seatTracker.logSeatAddition({
      teamId: testTeam.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 2,
      monthKey,
    });

    const proration = await prorationService.createProrationForTeam({
      teamId: testTeam.id,
      monthKey,
    });

    expect(proration?.status).toBe("INVOICE_CREATED");

    await prorationService.handleProrationPaymentSuccess(proration!.id);

    // Verify handleSubscriptionUpdate was called with correct parameters
    expect(mockBillingService.handleSubscriptionUpdate).toHaveBeenCalledWith({
      subscriptionId: proration!.subscriptionId,
      subscriptionItemId: proration!.subscriptionItemId,
      membershipCount: proration!.seatsAtEnd,
      prorationBehavior: "none",
    });
  });

  it("should throw error when subscription update fails", async () => {
    const seatTracker = new SeatChangeTrackingService();
    const failingBillingService = {
      ...mockBillingService,
      handleSubscriptionUpdate: vi
        .fn()
        .mockRejectedValue(new Error("Subscription not found")),
    };
    const prorationService = new MonthlyProrationService(
      undefined,
      failingBillingService
    );

    await seatTracker.logSeatAddition({
      teamId: testTeam.id,
      userId: testUser.id,
      triggeredBy: testUser.id,
      seatCount: 2,
      monthKey,
    });

    const proration = await prorationService.createProrationForTeam({
      teamId: testTeam.id,
      monthKey,
    });

    // Should throw when trying to update subscription
    await expect(
      prorationService.handleProrationPaymentSuccess(proration!.id)
    ).rejects.toThrow("Subscription not found");
  });
});
