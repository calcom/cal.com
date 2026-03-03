import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SWHMap } from "./__handler";

const {
  subscriptionsRetrieve,
  findByStripeCustomerId,
  onboardingUpdate,
  markAsComplete,
  findById,
  createOrganization,
  saveTeamBilling,
} = vi.hoisted(() => ({
  subscriptionsRetrieve: vi.fn().mockResolvedValue({
    items: { data: [{ id: "si_default" }] },
    start_date: 1700000000,
    trial_end: null,
    cancel_at: null,
  }),
  findByStripeCustomerId: vi.fn().mockResolvedValue(null),
  onboardingUpdate: vi.fn(),
  markAsComplete: vi.fn(),
  findById: vi.fn(),
  createOrganization: vi.fn(),
  saveTeamBilling: vi.fn(),
}));

vi.mock("@calcom/features/ee/payments/server/stripe", () => ({
  default: {
    subscriptions: { retrieve: subscriptionsRetrieve },
  },
}));

vi.mock("@calcom/features/organizations/repositories/OrganizationOnboardingRepository", () => ({
  OrganizationOnboardingRepository: {
    findByStripeCustomerId,
    update: onboardingUpdate,
    markAsComplete,
  },
}));

vi.mock("@calcom/features/users/repositories/UserRepository", () => ({
  UserRepository: class {
    findById = findById;
  },
}));

vi.mock("@calcom/features/ee/organizations/lib/service/onboarding/BillingEnabledOrgOnboardingService", () => ({
  BillingEnabledOrgOnboardingService: class {
    createOrganization = createOrganization;
  },
}));

vi.mock("@calcom/ee/billing/di/containers/Billing", () => ({
  getBillingProviderService: () => ({
    extractSubscriptionDates: () => ({
      subscriptionStart: new Date("2025-01-01"),
      subscriptionEnd: null,
      subscriptionTrialEnd: new Date("2025-01-15"),
    }),
  }),
}));

vi.mock("../../di/containers/Billing", () => ({
  getTeamBillingServiceFactory: () => ({
    init: () => ({ saveTeamBilling }),
  }),
  getBillingProviderService: () => ({
    extractSubscriptionDates: () => ({
      subscriptionStart: new Date("2025-01-01"),
      subscriptionEnd: null,
      subscriptionTrialEnd: new Date("2025-01-15"),
    }),
  }),
}));

vi.mock("@calcom/features/ee/billing/lib/stripe-subscription-utils", () => ({
  extractBillingDataFromStripeSubscription: () => ({
    billingPeriod: "MONTHLY",
    pricePerSeat: 1500,
    paidSeats: 5,
  }),
}));

vi.mock("./hwm-webhook-utils", () => ({
  validateInvoiceLinesForHwm: () => ({ isValid: false }),
  handleHwmResetAfterRenewal: vi.fn(),
}));

vi.mock("@calcom/prisma", () => ({ prisma: {} }));

import handler from "./_invoice.paid.org";

type InvoicePaidData = SWHMap["invoice.paid"]["data"];

function buildInvoiceData(overrides: {
  subscription_item?: string | null;
  billing_reason?: string | null;
  customer?: string;
  subscription?: string;
}): InvoicePaidData {
  return {
    object: {
      customer: overrides.customer ?? "cus_123",
      subscription: overrides.subscription ?? "sub_123",
      billing_reason: overrides.billing_reason ?? "subscription_create",
      lines: {
        data: [
          {
            subscription_item:
              "subscription_item" in overrides ? overrides.subscription_item : "si_123",
            period: { start: 1700000000, end: 1703000000 },
          },
        ],
      },
    },
  } as unknown as InvoicePaidData;
}

describe("invoice.paid.org webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findByStripeCustomerId.mockResolvedValue(null);
    subscriptionsRetrieve.mockResolvedValue({
      items: { data: [{ id: "si_default" }] },
      start_date: 1700000000,
      trial_end: null,
      cancel_at: null,
    });
  });

  describe("subscription_item resolution", () => {
    it("uses subscription_item from invoice line items when present", async () => {
      const data = buildInvoiceData({ subscription_item: "si_from_invoice" });

      await handler(data);

      expect(subscriptionsRetrieve).not.toHaveBeenCalled();
    });

    it("falls back to stripe subscription when subscription_item is null (trial invoice)", async () => {
      subscriptionsRetrieve.mockResolvedValue({
        items: { data: [{ id: "si_from_subscription" }] },
      });

      const data = buildInvoiceData({ subscription_item: null });

      await handler(data);

      expect(subscriptionsRetrieve).toHaveBeenCalledWith("sub_123");
    });

    it("returns error when subscription_item cannot be resolved from any source", async () => {
      subscriptionsRetrieve.mockResolvedValue({
        items: { data: [] },
      });

      const data = buildInvoiceData({ subscription_item: null });

      const result = await handler(data);

      expect(result).toEqual({ success: false, message: "No subscription item found" });
    });
  });

  describe("trial invoice with onboarding", () => {
    it("creates org using subscription_item resolved from stripe subscription", async () => {
      subscriptionsRetrieve.mockResolvedValue({
        items: { data: [{ id: "si_trial" }] },
        start_date: 1700000000,
        trial_end: 1701000000,
        cancel_at: null,
      });

      findByStripeCustomerId.mockResolvedValue({
        id: "onb_1",
        organizationId: null,
        slug: "test-org",
        isDomainConfigured: false,
        createdAt: new Date(),
        stripeSubscriptionId: null,
        stripeCustomerId: "cus_123",
        isComplete: false,
        orgOwnerEmail: "owner@test.com",
        createdById: 1,
        billingMode: "SEATS",
        minSeats: null,
      });

      findById.mockResolvedValue({
        id: 1,
        email: "owner@test.com",
        name: "Owner",
        locale: "en",
      });

      createOrganization.mockResolvedValue({
        organization: { id: 100, metadata: {} },
        owner: { id: 1 },
      });

      const data = buildInvoiceData({
        subscription_item: null,
        billing_reason: "subscription_create",
      });

      const result = await handler(data);

      expect(onboardingUpdate).toHaveBeenCalledWith("onb_1", {
        stripeSubscriptionId: "sub_123",
        stripeSubscriptionItemId: "si_trial",
      });
      expect(createOrganization).toHaveBeenCalledWith(
        expect.objectContaining({ id: "onb_1" }),
        { subscriptionId: "sub_123", subscriptionItemId: "si_trial" }
      );
      expect(saveTeamBilling).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: "sub_123",
          subscriptionItemId: "si_trial",
        })
      );
      expect(markAsComplete).toHaveBeenCalledWith("onb_1");
      expect(result).toEqual({ success: true });
    });
  });

  describe("no onboarding record", () => {
    it("succeeds when no onboarding record found (pre-onboarding org)", async () => {
      findByStripeCustomerId.mockResolvedValue(null);

      const data = buildInvoiceData({ subscription_item: "si_123" });

      const result = await handler(data);

      expect(result).toEqual({ success: true });
    });
  });
});
