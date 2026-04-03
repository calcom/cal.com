import { prisma } from "@calcom/prisma";
import type { OrganizationOnboarding, User } from "@calcom/prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { OrganizationPaymentService } from "./OrganizationPaymentService";

vi.stubEnv("STRIPE_ORG_PRODUCT_ID", "prod_test");
vi.stubEnv("STRIPE_ORG_MONTHLY_PRICE_ID", "price_monthly_test");
vi.stubEnv("STRIPE_ORG_ANNUAL_PRICE_ID", "price_annual_test");

const mockBillingService = {
  createCustomer: vi.fn().mockResolvedValue({ stripeCustomerId: "mock_cus_id" }),
  createPrice: vi.fn().mockResolvedValue({ priceId: "mock_price_id", isCustom: false }),
  createSubscription: vi.fn().mockResolvedValue({ id: "mock_sub_id" }),
  createSubscriptionCheckout: vi.fn().mockResolvedValue({
    checkoutUrl: "https://checkout.stripe.com/mock",
    sessionId: "mock_session_id",
  }),
};

vi.mock("@calcom/features/ee/billing/di/containers/Billing", () => ({
  getBillingProviderService: vi.fn(() => mockBillingService),
  getTeamBillingServiceFactory: vi.fn(),
  getTeamBillingDataRepository: vi.fn(),
}));

describe("OrganizationPaymentService - stale stripeCustomerId handling", () => {
  let testUser: User;
  const createdOnboardingIds: string[] = [];

  const mockPermissionService = {
    hasPermissionToCreateForEmail: vi.fn().mockResolvedValue(true),
    hasPendingOrganizations: vi.fn().mockResolvedValue(false),
    hasPermissionToModifyDefaultPayment: vi.fn().mockReturnValue(false),
    hasPermissionToMigrateTeams: vi.fn().mockResolvedValue(true),
    hasModifiedDefaultPayment: vi.fn().mockReturnValue(false),
    validatePermissions: vi.fn().mockResolvedValue(true),
  };

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        email: `payment-svc-test-${Date.now()}@example.com`,
        username: `payment-svc-test-${Date.now()}`,
      },
    });
  });

  afterAll(async () => {
    if (createdOnboardingIds.length > 0) {
      await prisma.organizationOnboarding.deleteMany({
        where: { id: { in: createdOnboardingIds } },
      });
    }
    await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
  });

  async function createTestOnboarding(
    overrides: Partial<{
      orgOwnerEmail: string;
      stripeCustomerId: string | null;
    }> = {}
  ): Promise<OrganizationOnboarding> {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record = await prisma.organizationOnboarding.create({
      data: {
        orgOwnerEmail: overrides.orgOwnerEmail ?? `test-${uniqueSuffix}@example.com`,
        name: `Test Org ${uniqueSuffix}`,
        slug: `test-org-${uniqueSuffix}`,
        billingPeriod: "MONTHLY",
        pricePerSeat: 20,
        seats: 5,
        createdById: testUser.id,
        stripeCustomerId: overrides.stripeCustomerId ?? null,
      },
    });
    createdOnboardingIds.push(record.id);
    return record;
  }

  it("should clear stale stripeCustomerId from a different onboarding record before updating", async () => {
    const stripeId = `cus_stale_${Date.now()}`;

    // Simulate a previous failed/abandoned upgrade attempt that left a stripeCustomerId behind
    const staleRecord = await createTestOnboarding({ stripeCustomerId: stripeId });

    // New upgrade attempt creates a fresh onboarding record
    const currentRecord = await createTestOnboarding({
      orgOwnerEmail: testUser.email,
    });

    const service = new OrganizationPaymentService(
      { id: testUser.id, email: testUser.email, role: "USER" },
      mockPermissionService as never
    );

    // On main (without the fix), this would throw a unique constraint error because
    // the stale record already holds stripeId. With the fix, it clears the stale
    // record first.
    await service.createPaymentIntent(
      { logo: null, bio: null, teams: [] },
      { ...currentRecord, stripeCustomerId: stripeId }
    );

    // Verify the stale record's stripeCustomerId was cleared
    const updatedStale = await prisma.organizationOnboarding.findUnique({
      where: { id: staleRecord.id },
    });
    expect(updatedStale?.stripeCustomerId).toBeNull();

    // Verify the current record now holds the stripeCustomerId
    const updatedCurrent = await prisma.organizationOnboarding.findUnique({
      where: { id: currentRecord.id },
    });
    expect(updatedCurrent?.stripeCustomerId).toBe(stripeId);
  });

  it("should not clear stripeCustomerId when the same record already holds it", async () => {
    const stripeId = `cus_same_${Date.now()}`;

    // Record already has the stripeCustomerId from a previous step
    const record = await createTestOnboarding({
      orgOwnerEmail: `same-record-${Date.now()}@example.com`,
      stripeCustomerId: stripeId,
    });

    const service = new OrganizationPaymentService(
      { id: testUser.id, email: testUser.email, role: "USER" },
      mockPermissionService as never
    );

    await service.createPaymentIntent(
      { logo: null, bio: null, teams: [] },
      { ...record, stripeCustomerId: stripeId }
    );

    // The record should still hold the same stripeCustomerId (no unnecessary clearing)
    const updated = await prisma.organizationOnboarding.findUnique({
      where: { id: record.id },
    });
    expect(updated?.stripeCustomerId).toBe(stripeId);
  });

  it("should fail with unique constraint if stale stripeCustomerId is not cleared first", async () => {
    const stripeId = `cus_conflict_${Date.now()}`;

    const existingRecord = await createTestOnboarding({ stripeCustomerId: stripeId });
    const currentRecord = await createTestOnboarding();

    // Directly updating without clearing demonstrates the original bug
    await expect(
      prisma.organizationOnboarding.update({
        where: { id: currentRecord.id },
        data: { stripeCustomerId: stripeId },
      })
    ).rejects.toThrow();

    // Both records should be unchanged
    const existing = await prisma.organizationOnboarding.findUnique({
      where: { id: existingRecord.id },
    });
    expect(existing?.stripeCustomerId).toBe(stripeId);

    const current = await prisma.organizationOnboarding.findUnique({
      where: { id: currentRecord.id },
    });
    expect(current?.stripeCustomerId).toBeNull();
  });
});
