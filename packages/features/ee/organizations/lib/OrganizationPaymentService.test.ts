import { describe, expect, it, vi, beforeEach } from "vitest";

import { ORGANIZATION_SELF_SERVE_MIN_SEATS, ORGANIZATION_SELF_SERVE_PRICE } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { OrganizationPaymentService } from "./OrganizationPaymentService";
import type { IOrganizationPermissionService } from "./OrganizationPermissionService";

vi.stubEnv("STRIPE_ORG_PRODUCT_ID", "STRIPE_ORG_PRODUCT_ID");
vi.stubEnv("STRIPE_ORG_MONTHLY_PRICE_ID", "STRIPE_ORG_MONTHLY_PRICE_ID");

vi.mock("@calcom/prisma", () => ({
  prisma: {
    organizationOnboarding: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    membership: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@calcom/features/ee/billing/stripe-billling-service", () => ({
  StripeBillingService: vi.fn().mockImplementation(() => ({
    createCustomer: vi.fn().mockResolvedValue({ id: "mock_customer_id" }),
    createPrice: vi.fn().mockResolvedValue({ id: "mock_price_id", isCustom: false }),
    createSubscription: vi.fn().mockResolvedValue({ id: "mock_subscription_id" }),
    createSubscriptionCheckout: vi.fn().mockResolvedValue({
      checkoutUrl: "https://checkout.stripe.com/mock-checkout-url",
    }),
  })),
}));

describe("OrganizationPaymentService", () => {
  let service: OrganizationPaymentService;
  let mockPermissionService: IOrganizationPermissionService;
  const mockUser: TrpcSessionUser = {
    id: 1,
    email: "test@example.com",
    role: "USER",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissionService = {
      hasPermissionToCreateForEmail: vi.fn().mockResolvedValue(true),
      hasPendingOrganizations: vi.fn().mockResolvedValue(false),
      hasPermissionToModifyDefaultPayment: vi.fn().mockReturnValue(false),
      hasPermissionToMigrateTeams: vi.fn().mockResolvedValue(true),
      hasModifiedDefaultPayment: vi.fn().mockReturnValue(false),
      validatePermissions: vi.fn().mockResolvedValue(true),
    };
    service = new OrganizationPaymentService(mockUser, mockPermissionService);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ metadata: {} } as any);

    // Mock successful organization onboarding creation
    vi.mocked(prisma.organizationOnboarding.create).mockResolvedValue({
      id: 1,
      name: "Test Org",
      slug: "test-org",
      orgOwnerEmail: "test@example.com",
      billingPeriod: "MONTHLY",
      seats: 5,
      pricePerSeat: 20,
      stripeCustomerId: "mock_customer_id",
      isComplete: false,
    } as any);
  });

  describe("createPaymentIntent", () => {
    const baseInput = {
      id: 1,
      name: "Test Org",
      slug: "test-org",
      orgOwnerEmail: "test@example.com",
      teams: [{ id: 1, isBeingMigrated: true, name: "Team 1", slug: "team1" }],
    };

    it("should not allow non-admin to modify payment settings", async () => {
      mockPermissionService.validatePermissions.mockRejectedValueOnce(
        new Error("You do not have permission to modify the default payment settings")
      );

      await expect(
        service.createPaymentIntent({
          ...baseInput,
          pricePerSeat: 1000, // Trying to modify price
        })
      ).rejects.toThrow("You do not have permission to modify the default payment settings");
    });

    it("should use minimum seats when total unique members is less than minimum", async () => {
      // Mock 3 unique members (less than minimum of 5)
      vi.mocked(prisma.membership.findMany).mockImplementation(async () => [
        { userId: 1, user: { email: "user1@example.com" } },
        { userId: 2, user: { email: "user2@example.com" } },
        { userId: 3, user: { email: "user3@example.com" } },
      ]);

      const result = await service.createPaymentIntent({
        ...baseInput,
        invitedMembers: [{ email: "invited1@example.com" }], // Adding 1 invited member
      });

      expect(result).toBeDefined();
      expect(prisma.organizationOnboarding.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          seats: Number(ORGANIZATION_SELF_SERVE_MIN_SEATS),
          billingPeriod: "MONTHLY",
          pricePerSeat: Number(ORGANIZATION_SELF_SERVE_PRICE),
        }),
      });
    });

    it("should use total unique members when more than minimum", async () => {
      // Mock 7 unique team members
      vi.mocked(prisma.membership.findMany).mockImplementation(async () =>
        Array.from({ length: 7 }, (_, i) => ({
          userId: i + 1,
          user: { email: `user${i + 1}@example.com` },
        }))
      );

      const result = await service.createPaymentIntent({
        ...baseInput,
        invitedMembers: [
          { email: "invited1@example.com" },
          { email: "invited2@example.com" },
          { email: "invited3@example.com" },
        ], // Adding 3 invited members, total should be 7 as these new invites are pending
      });

      expect(result).toBeDefined();
      expect(prisma.organizationOnboarding.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          seats: 7,
          billingPeriod: "MONTHLY",
          pricePerSeat: Number(ORGANIZATION_SELF_SERVE_PRICE),
        }),
      });
    });

    describe("admin overrides", () => {
      beforeEach(() => {
        mockPermissionService.hasPermissionToModifyDefaultPayment.mockReturnValue(true);
        mockPermissionService.hasModifiedDefaultPayment.mockReturnValue(true);
        mockPermissionService.validatePermissions.mockResolvedValue(true);
        // Mock membership count to be 0 for admin override tests
        vi.mocked(prisma.membership.findMany).mockResolvedValue([]);
      });

      it("should allow admin to override minimum seats to a lower value", async () => {
        const customSeats = 3;
        const result = await service.createPaymentIntent({
          ...baseInput,
          seats: customSeats,
        });

        expect(result).toBeDefined();
        expect(prisma.organizationOnboarding.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            seats: customSeats,
            billingPeriod: "MONTHLY",
            pricePerSeat: Number(ORGANIZATION_SELF_SERVE_PRICE),
            name: "Test Org",
            slug: "test-org",
            orgOwnerEmail: "test@example.com",
            teams: [{ id: 1, isBeingMigrated: true, name: "Team 1", slug: "team1" }],
          }),
        });
      });

      it("should allow admin to override price per seat", async () => {
        const customPrice = 1000;
        const result = await service.createPaymentIntent({
          ...baseInput,
          pricePerSeat: customPrice,
        });

        expect(result).toBeDefined();
        expect(prisma.organizationOnboarding.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            seats: Number(ORGANIZATION_SELF_SERVE_MIN_SEATS),
            billingPeriod: "MONTHLY",
            pricePerSeat: customPrice,
            name: "Test Org",
            slug: "test-org",
            orgOwnerEmail: "test@example.com",
            teams: [{ id: 1, isBeingMigrated: true, name: "Team 1", slug: "team1" }],
          }),
        });
      });

      it("should create custom price in Stripe when admin overrides price", async () => {
        const customPrice = 1500;

        await service.createPaymentIntent({
          ...baseInput,
          pricePerSeat: customPrice,
        });

        // Verify a custom price was created in Stripe
        expect(vi.mocked(service["billingService"].createPrice)).toHaveBeenCalledWith({
          amount: customPrice * 100, // Convert to cents for Stripe
          currency: "usd",
          interval: "month",
          productId: "STRIPE_ORG_PRODUCT_ID",
          metadata: expect.any(Object),
          nickname: expect.any(String),
        });
      });
    });
  });
});
