import prismock from "@calcom/testing/lib/__mocks__/prisma";

import { v4 as uuidv4 } from "uuid";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { ORGANIZATION_SELF_SERVE_PRICE } from "@calcom/lib/constants";
import { MembershipRole } from "@calcom/prisma/enums";
import { UserPermissionRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import { createHandler } from "./createWithPaymentIntent.handler";

vi.stubEnv("STRIPE_PRIVATE_KEY", "test-stripe-private-key");
vi.stubEnv("STRIPE_ORG_MONTHLY_PRICE_ID", "test-stripe-org-monthly-price-id");
vi.stubEnv("STRIPE_ORG_PRODUCT_ID", "test-stripe-org-product-id");
vi.stubEnv("NEXT_PUBLIC_ORGANIZATIONS_SELF_SERVE_PRICE_NEW", "37");

const STRIPE_ORG_PRODUCT_ID = process.env.STRIPE_ORG_PRODUCT_ID!;

const STRIPE_ORG_MONTHLY_PRICE_ID = process.env.STRIPE_ORG_MONTHLY_PRICE_ID!;

const mockSharedStripe = vi.hoisted(() => ({
  prices: {
    create: vi.fn(),
    retrieve: vi.fn().mockResolvedValue({ id: "price_123", unit_amount: 1000 }),
  },
  customers: {
    create: vi.fn(),
  },
  subscriptions: {
    cancel: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn(),
  },
  checkout: {
    sessions: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
  },
  paymentIntents: {
    create: vi.fn(),
  },
}));

vi.mock("@calcom/features/ee/billing/di/containers/Billing", () => {
  type FakeBillingProvider = {
    createCustomer(args: {
      email: string;
      metadata?: Record<string, unknown>;
    }): Promise<{ stripeCustomerId: string }>;
    createPrice(args: {
      amount: number;
      productId: string;
      currency: string;
      interval: "month" | "year";
      nickname?: string;
      metadata?: Record<string, unknown>;
    }): Promise<{ priceId: string }>;
    createSubscriptionCheckout(args: {
      customerId: string;
      successUrl: string;
      cancelUrl: string;
      priceId: string;
      quantity: number;
      metadata?: Record<string, unknown>;
    }): Promise<{ checkoutUrl: string; sessionId: string }>;
  };

  const fake: FakeBillingProvider = {
    async createCustomer({ email, metadata }) {
      const res = await mockSharedStripe.customers.create({ email, metadata });
      return { stripeCustomerId: res.id };
    },
    async createPrice({ amount, productId, currency, interval, nickname, metadata }) {
      const res = await mockSharedStripe.prices.create({
        unit_amount: amount,
        currency,
        product: productId,
        recurring: { interval },
        nickname,
        metadata,
      });
      return { priceId: res.id };
    },
    async createSubscriptionCheckout({ customerId, successUrl, cancelUrl, priceId, quantity, metadata }) {
      const res = await mockSharedStripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{ price: priceId, quantity }],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
      });
      return { checkoutUrl: res.url, sessionId: res.id };
    },
  };

  return {
    getBillingProviderService: () =>
      fake as unknown as import("@calcom/features/ee/billing/service/billingProvider/StripeBillingService").StripeBillingService,
  };
});

const mockInput = {
  onboardingId: "test-onboarding-id",
  name: "Test Org",
  slug: "test-org",
  logo: "https://example.com/logo.png",
  bio: "Test organization bio",
};

async function createTestMembership(data: { userId: number; teamId: number; role?: MembershipRole }) {
  return prismock.membership.create({
    data: {
      userId: data.userId,
      teamId: data.teamId,
      role: data.role || MembershipRole.MEMBER,
      accepted: true,
    },
  });
}

async function createTestMemberships(data: { userIds: number[]; teamId: number }) {
  return Promise.all(
    data.userIds.map((userId) =>
      createTestMembership({
        userId,
        teamId: data.teamId,
      })
    )
  );
}

// Helper functions for creating test data
async function createTestUser(data: {
  email: string;
  name?: string;
  username?: string;
  role?: UserPermissionRole;
}) {
  return prismock.user.create({
    data: {
      email: data.email,
      name: data.name || "Test User",
      username: data.username || "testuser",
      role: data.role || UserPermissionRole.USER,
    },
  });
}

async function createNTestUsers(count: number) {
  return Promise.all(
    Array.from({ length: count }, () => createTestUser({ email: `user${Math.random()}@example.com` }))
  );
}

async function createOrganizationOnboarding(data: {
  id: string;
  name: string;
  slug: string;
  orgOwnerEmail: string;
  createdById: number;
  stripeSubscriptionId?: string | null;
  seats?: number;
  pricePerSeat?: number;
  billingPeriod?: string;
}) {
  return prismock.organizationOnboarding.create({
    data: {
      id: data.id,
      name: data.name,
      slug: data.slug,
      orgOwnerEmail: data.orgOwnerEmail,
      createdById: data.createdById,
      stripeSubscriptionId: data.stripeSubscriptionId,
      seats: parseInt(data.seats ?? "1"),
      pricePerSeat: parseFloat(data.pricePerSeat ?? ORGANIZATION_SELF_SERVE_PRICE),
      billingPeriod: data.billingPeriod ?? "MONTHLY",
    },
  });
}

function expectStripePriceCreated({
  amount,
  product,
  recurring,
}: {
  amount: number;
  product: string;
  recurring: { interval: string };
}) {
  expect(mockSharedStripe.prices.create).toHaveBeenCalledWith(
    expect.objectContaining({
      // Multiply by 100 is requirement of Stripe.
      unit_amount: amount * 100,
      currency: "usd",
      product,
      recurring,
    })
  );
}

function expectStripePriceNotCreated() {
  expect(mockSharedStripe.prices.create).not.toHaveBeenCalled();
}

function expectStripeSubscriptionCreated({
  customerId,
  priceId,
  quantity,
}: {
  customerId: string;
  priceId: string;
  quantity: number;
}) {
  expect(mockSharedStripe.checkout.sessions.create).toHaveBeenCalledWith(
    expect.objectContaining({
      customer: customerId,
      line_items: [
        expect.objectContaining({
          price: priceId,
          quantity,
        }),
      ],
    })
  );
}

let lastCreatedCustomerId = "null";
let lastCreatedPriceId = "null";
let _lastCreatedSessionId = "null";
const STRIPE_CHECKOUT_URL = `https://stripe.com/checkout`;

describe("createWithPaymentIntent handler", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    // @ts-expect-error reset is a method on Prismock
    await prismock.reset();
    mockStripe();
    function mockStripe() {
      // Set up the shared Stripe instance mock implementations
      mockSharedStripe.checkout.sessions.create.mockImplementation(() => {
        const sessionId = `test-session-id-${uuidv4()}`;
        _lastCreatedSessionId = sessionId;
        return {
          url: STRIPE_CHECKOUT_URL,
          id: sessionId,
        };
      });

      mockSharedStripe.prices.create.mockImplementation(() => {
        const priceId = `test-price-id-${uuidv4()}`;
        lastCreatedPriceId = priceId;
        return {
          id: priceId,
        };
      });

      mockSharedStripe.customers.create.mockImplementation(() => {
        const customerId = `test-customer-id-${uuidv4()}`;
        lastCreatedCustomerId = customerId;
        return {
          id: customerId,
        };
      });
    }
  });

  it("should create payment intent for valid organization onboarding (regular user)", async () => {
    // Create regular user
    const user = await createTestUser({
      email: "user@example.com",
    });

    // Create organization onboarding
    await createOrganizationOnboarding({
      id: mockInput.onboardingId,
      name: mockInput.name,
      slug: mockInput.slug,
      orgOwnerEmail: user.email,
      createdById: user.id,
    });

    const result = await createHandler({
      input: mockInput,
      ctx: {
        user,
      },
    });

    expect(result).toEqual({
      checkoutUrl: STRIPE_CHECKOUT_URL,
    });
  });

  // Cal.com admin shouldn't be able to reach this step
  it.skip("should create payment intent for valid organization onboarding (admin user)", async () => {
    // Create admin user
    const adminUser = await createTestUser({
      email: "admin@example.com",
      role: UserPermissionRole.ADMIN,
    });

    // Create organization onboarding for a different user
    await createOrganizationOnboarding({
      id: mockInput.onboardingId,
      name: mockInput.name,
      slug: mockInput.slug,
      orgOwnerEmail: "other@example.com",
      createdById: adminUser.id,
    });

    const result = await createHandler({
      input: mockInput,
      ctx: {
        user: adminUser,
      },
    });

    expect(result).toEqual({
      checkoutUrl: STRIPE_CHECKOUT_URL,
    });
  });

  it("should throw error when organization onboarding not found", async () => {
    const user = await createTestUser({
      email: "user@example.com",
    });

    await expect(
      createHandler({
        input: mockInput,
        ctx: {
          user,
        },
      })
    ).rejects.toThrow(new TRPCError({ code: "BAD_REQUEST", message: "organization_onboarding_not_found" }));
  });

  it("should throw error when organization already has subscription", async () => {
    const user = await createTestUser({
      email: "user@example.com",
    });

    await createOrganizationOnboarding({
      id: mockInput.onboardingId,
      name: mockInput.name,
      slug: mockInput.slug,
      orgOwnerEmail: user.email,
      createdById: user.id,
      stripeSubscriptionId: "existing-subscription-id",
    });

    await expect(
      createHandler({
        input: mockInput,
        ctx: {
          user,
        },
      })
    ).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "organization_has_subscription_already" })
    );
  });

  it("should throw error when non-admin user tries to access another user's onboarding", async () => {
    const user = await createTestUser({
      email: "user@example.com",
    });

    await createOrganizationOnboarding({
      id: mockInput.onboardingId,
      name: mockInput.name,
      slug: mockInput.slug,
      orgOwnerEmail: "other@example.com",
      createdById: user.id,
    });

    await expect(
      createHandler({
        input: mockInput,
        ctx: {
          user,
        },
      })
    ).rejects.toThrow(new TRPCError({ code: "BAD_REQUEST", message: "organization_onboarding_not_found" }));
  });

  it("should handle input variations (without logo and bio)", async () => {
    const user = await createTestUser({
      email: "user@example.com",
    });

    await createOrganizationOnboarding({
      id: mockInput.onboardingId,
      name: mockInput.name,
      slug: mockInput.slug,
      orgOwnerEmail: user.email,
      createdById: user.id,
    });

    const result = await createHandler({
      input: {
        onboardingId: mockInput.onboardingId,
        name: mockInput.name,
        slug: mockInput.slug,
      },
      ctx: {
        user,
      },
    });

    expect(result).toEqual({
      checkoutUrl: STRIPE_CHECKOUT_URL,
    });
  });

  describe("Seats/Billing Period/Price Per Seat", () => {
    it("should handle custom seat count and price per seat - Monthly. Should create a custom price and use that", async () => {
      const user = await createTestUser({
        email: "user@example.com",
      });

      const pricePerSeat = 20;
      const seats = 10;
      await createOrganizationOnboarding({
        id: mockInput.onboardingId,
        name: mockInput.name,
        slug: mockInput.slug,
        orgOwnerEmail: user.email,
        createdById: user.id,
        seats,
        pricePerSeat,
        billingPeriod: "MONTHLY",
      });

      const customInput = {
        ...mockInput,
      };

      const result = await createHandler({
        input: customInput,
        ctx: {
          user,
        },
      });

      expectStripePriceCreated({
        amount: pricePerSeat * 1,
        product: STRIPE_ORG_PRODUCT_ID,
        recurring: {
          interval: "month",
        },
      });

      expectStripeSubscriptionCreated({
        customerId: lastCreatedCustomerId,
        priceId: lastCreatedPriceId,
        quantity: seats,
      });

      expect(result).toEqual({
        checkoutUrl: STRIPE_CHECKOUT_URL,
      });
    });

    it("should handle custom seat count and price per seat - Annually. Should create a custom price and use that", async () => {
      const user = await createTestUser({
        email: "user@example.com",
      });

      const pricePerSeat = 20;
      const seats = 10;
      await createOrganizationOnboarding({
        id: mockInput.onboardingId,
        name: mockInput.name,
        slug: mockInput.slug,
        orgOwnerEmail: user.email,
        createdById: user.id,
        seats,
        pricePerSeat,
        billingPeriod: "ANNUALLY",
      });

      const customInput = {
        ...mockInput,
      };

      const result = await createHandler({
        input: customInput,
        ctx: {
          user,
        },
      });

      expectStripePriceCreated({
        amount: pricePerSeat * 12,
        product: STRIPE_ORG_PRODUCT_ID,
        recurring: {
          interval: "year",
        },
      });

      expectStripeSubscriptionCreated({
        customerId: lastCreatedCustomerId,
        priceId: lastCreatedPriceId,
        quantity: seats,
      });

      expect(result).toEqual({
        checkoutUrl: STRIPE_CHECKOUT_URL,
      });
    });

    it("should use fixed Price ID when billingPeriod is MONTHLY and pricePerSeat and seats are default values", async () => {
      const user = await createTestUser({
        email: "user@example.com",
      });

      const pricePerSeat = ORGANIZATION_SELF_SERVE_PRICE;
      const seats = 5; // Using a test value, no longer enforcing minimum
      await createOrganizationOnboarding({
        id: mockInput.onboardingId,
        name: mockInput.name,
        slug: mockInput.slug,
        orgOwnerEmail: user.email,
        createdById: user.id,
        seats,
        pricePerSeat,
        billingPeriod: "MONTHLY",
      });

      const customInput = {
        ...mockInput,
      };

      const result = await createHandler({
        input: customInput,
        ctx: {
          user,
        },
      });

      expectStripePriceNotCreated();

      expectStripeSubscriptionCreated({
        customerId: lastCreatedCustomerId,
        priceId: STRIPE_ORG_MONTHLY_PRICE_ID,
        quantity: seats,
      });

      expect(result).toEqual({
        checkoutUrl: STRIPE_CHECKOUT_URL,
      });
    });

    it("should create custom price when billingPeriod is ANNUALLY even when pricePerSeat and seats are default values", async () => {
      const user = await createTestUser({
        email: "user@example.com",
      });

      const pricePerSeat = 20;
      const seats = 10;
      await createOrganizationOnboarding({
        id: mockInput.onboardingId,
        name: mockInput.name,
        slug: mockInput.slug,
        orgOwnerEmail: user.email,
        createdById: user.id,
        seats,
        pricePerSeat,
        billingPeriod: "ANNUALLY",
      });

      const customInput = {
        ...mockInput,
      };

      const result = await createHandler({
        input: customInput,
        ctx: {
          user,
        },
      });

      expectStripePriceCreated({
        amount: pricePerSeat * 12,
        product: STRIPE_ORG_PRODUCT_ID,
        recurring: {
          interval: "year",
        },
      });

      expectStripeSubscriptionCreated({
        customerId: lastCreatedCustomerId,
        priceId: lastCreatedPriceId,
        quantity: seats,
      });

      expect(result).toEqual({
        checkoutUrl: STRIPE_CHECKOUT_URL,
      });
    });

    it("should increase numberOfSeats to max of seats in onboarding and number of invited members", async () => {
      const user = await createTestUser({
        email: "user@example.com",
      });

      const pricePerSeat = 20;
      const seats = 5;
      const totalMembersToMigrateThroughTeamsMigration = 7;
      await createOrganizationOnboarding({
        id: mockInput.onboardingId,
        name: mockInput.name,
        slug: mockInput.slug,
        orgOwnerEmail: user.email,
        createdById: user.id,
        seats,
        pricePerSeat,
        billingPeriod: "ANNUALLY",
      });

      const testUsers = await createNTestUsers(totalMembersToMigrateThroughTeamsMigration);

      await createTestMemberships({
        userIds: testUsers.map((user) => user.id),
        teamId: 1,
      });

      await createTestMembership({
        userId: user.id,
        teamId: 1,
        role: MembershipRole.ADMIN,
      });

      const customInput = {
        ...mockInput,
        invitedMembers: [
          { email: "invited-member-1@example.com" },
          { email: "invited-member-2@example.com" },
          { email: "invited-member-3@example.com" },
          // Two emails reused from members being invited through teams migration
          { email: testUsers[0].email },
          { email: testUsers[1].email },
        ],
        teams: [
          { id: 1, name: "Existing Team 1", slug: "team-1", isBeingMigrated: true },
          { id: -1, name: "New Team 1", slug: null, isBeingMigrated: false },
        ],
      };
      const result = await createHandler({
        input: customInput,
        ctx: {
          user,
        },
      });

      expectStripePriceCreated({
        amount: pricePerSeat * 12,
        product: STRIPE_ORG_PRODUCT_ID,
        recurring: {
          interval: "year",
        },
      });

      expectStripeSubscriptionCreated({
        customerId: lastCreatedCustomerId,
        priceId: lastCreatedPriceId,
        // +1 because owner also takes a seat
        // +3 because three members are net new invited, rest two are already counted via teams migration
        quantity: totalMembersToMigrateThroughTeamsMigration + 3 + 1,
      });

      expect(result).toEqual({
        checkoutUrl: STRIPE_CHECKOUT_URL,
      });
    });

    it("should handle decimal price per seat", async () => {
      const user = await createTestUser({
        email: "user@example.com",
      });

      const pricePerSeat = 9.5;
      const seats = 10;
      await createOrganizationOnboarding({
        id: mockInput.onboardingId,
        name: mockInput.name,
        slug: mockInput.slug,
        orgOwnerEmail: user.email,
        createdById: user.id,
        seats,
        pricePerSeat,
        billingPeriod: "ANNUALLY",
      });

      const customInput = {
        ...mockInput,
      };

      const result = await createHandler({
        input: customInput,
        ctx: {
          user,
        },
      });

      expectStripePriceCreated({
        amount: pricePerSeat * 12,
        product: STRIPE_ORG_PRODUCT_ID,
        recurring: {
          interval: "year",
        },
      });

      expectStripeSubscriptionCreated({
        customerId: lastCreatedCustomerId,
        priceId: lastCreatedPriceId,
        quantity: seats,
      });

      expect(result).toEqual({
        checkoutUrl: STRIPE_CHECKOUT_URL,
      });
    });
  });
});
