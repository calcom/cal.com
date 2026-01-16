import { describe, expect, it, vi, beforeEach } from "vitest";

import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { OrganizationPaymentService } from "./OrganizationPaymentService";
import type { IOrganizationPermissionService } from "./OrganizationPermissionService";

vi.stubEnv("STRIPE_ORG_PRODUCT_ID", "STRIPE_ORG_PRODUCT_ID");
vi.stubEnv("STRIPE_ORG_MONTHLY_PRICE_ID", "STRIPE_ORG_MONTHLY_PRICE_ID");
const defaultOrgOnboarding = {
  id: "onboard-id-1",
  name: "Test Org",
  slug: "test-org",
  orgOwnerEmail: "test@example.com",
  billingPeriod: "MONTHLY",
  seats: 5,
  pricePerSeat: 20,
  isComplete: false,
  stripeCustomerId: "mock_stripe_customer_id",
};

vi.mock("@calcom/prisma", () => {
  const prismaMock = {
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
      update: vi.fn(),
    },
  };
  return {
    prisma: prismaMock,
    default: prismaMock,
  };
});

const mockBillingService = {
  createCustomer: vi.fn().mockResolvedValue({ id: "mock_customer_id" }),
  createPrice: vi.fn().mockResolvedValue({ id: "mock_price_id", isCustom: false }),
  createSubscription: vi.fn().mockResolvedValue({ id: "mock_subscription_id" }),
  createSubscriptionCheckout: vi.fn().mockResolvedValue({
    checkoutUrl: "https://checkout.stripe.com/mock-checkout-url",
  }),
};

vi.mock("@calcom/features/ee/billing/di/containers/Billing", () => ({
  getBillingProviderService: vi.fn(() => mockBillingService),
  getTeamBillingServiceFactory: vi.fn(),
  getTeamBillingDataRepository: vi.fn(),
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
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ metadata: {} });

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
    });
  });

  describe("createPaymentIntent", () => {
    const baseInput = {
      bio: "BIO",
      logo: "LOGO",
      teams: [{ id: 1, isBeingMigrated: true, name: "Team 1", slug: "team1" }],
    };

    it("should not allow non-admin to modify payment settings", async () => {
      mockPermissionService.validatePermissions.mockRejectedValueOnce(
        new Error("You do not have permission to modify the default payment settings")
      );

      await expect(
        service.createPaymentIntent(
          {
            ...baseInput,
            pricePerSeat: 1000, // Trying to modify price
          },
          defaultOrgOnboarding
        )
      ).rejects.toThrow("You do not have permission to modify the default payment settings");
    });

    it("should use max of onboarding seats and unique member count (no minimum enforcement)", async () => {
      // Mock 3 unique members - should use max of onboarding seats (5) and unique count (4)
      vi.mocked(prisma.membership.findMany).mockImplementation(async () => [
        { userId: 1, user: { email: "user1@example.com" } },
        { userId: 2, user: { email: "user2@example.com" } },
        { userId: 3, user: { email: "user3@example.com" } },
      ]);

      const result = await service.createPaymentIntent(
        {
          ...baseInput,
          invitedMembers: [{ email: "invited1@example.com" }], // Adding 1 invited member = 4 total unique
        },
        defaultOrgOnboarding // Has seats: 5 set
      );

      expect(result).toBeDefined();
      const updateCall = vi.mocked(prisma.organizationOnboarding.update).mock.calls[0][0];
      expect(updateCall.where).toEqual({ id: "onboard-id-1" });
      const { updatedAt: _updatedAt, ...data } = updateCall.data;
      expect(data).toEqual({
        bio: "BIO",
        logo: "LOGO",
        brandColor: null,
        bannerUrl: null,
        teams: [
          {
            id: 1,
            isBeingMigrated: true,
            name: "Team 1",
            slug: "team1",
          },
        ],
        invitedMembers: [
          {
            email: "invited1@example.com",
          },
        ],
        stripeCustomerId: "mock_stripe_customer_id",
        pricePerSeat: defaultOrgOnboarding.pricePerSeat,
        billingPeriod: "MONTHLY",
        seats: 5, // Max of onboarding seats (5) and unique members (4) = 5
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

      const result = await service.createPaymentIntent(
        {
          ...baseInput,
          invitedMembers: [
            { email: "invited1@example.com" },
            { email: "invited2@example.com" },
            { email: "invited3@example.com" },
          ], // Adding 3 invited members, total should be 7 as these new invites are pending
        },
        defaultOrgOnboarding
      );

      expect(result).toBeDefined();
      const updateCall = vi.mocked(prisma.organizationOnboarding.update).mock.calls[0][0];
      expect(updateCall.where).toEqual({ id: "onboard-id-1" });
      const { updatedAt: _updatedAt, ...data } = updateCall.data;
      expect(data).toEqual({
        bio: "BIO",
        logo: "LOGO",
        brandColor: null,
        bannerUrl: null,
        teams: [
          {
            id: 1,
            isBeingMigrated: true,
            name: "Team 1",
            slug: "team1",
          },
        ],
        invitedMembers: [
          { email: "invited1@example.com" },
          { email: "invited2@example.com" },
          { email: "invited3@example.com" },
        ],
        stripeCustomerId: "mock_stripe_customer_id",
        pricePerSeat: defaultOrgOnboarding.pricePerSeat,
        billingPeriod: "MONTHLY",
        seats: 10,
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

      it("should allow admin to set custom seat count", async () => {
        const customSeats = 3;
        await service.createPaymentIntent(
          {
            ...baseInput,
            seats: customSeats,
          },
          {
            ...defaultOrgOnboarding,
            seats: customSeats,
          }
        );

        expect(vi.mocked(prisma.organizationOnboarding.update)).toHaveBeenCalled();
        const updateCall = vi.mocked(prisma.organizationOnboarding.update).mock.calls[0][0];
        expect(updateCall.where).toEqual({ id: "onboard-id-1" });
        const { updatedAt: _updatedAt, ...data } = updateCall.data;
        expect(data).toEqual({
          bio: "BIO",
          logo: "LOGO",
          brandColor: null,
          bannerUrl: null,
          invitedMembers: undefined,
          teams: [
            {
              id: 1,
              isBeingMigrated: true,
              name: "Team 1",
              slug: "team1",
            },
          ],
          stripeCustomerId: "mock_stripe_customer_id",
          pricePerSeat: defaultOrgOnboarding.pricePerSeat,
          billingPeriod: "MONTHLY",
          seats: customSeats,
        });
      });

      it("should allow admin to override price per seat", async () => {
        const customPrice = 1000;
        const result = await service.createPaymentIntent(baseInput, {
          ...defaultOrgOnboarding,
          pricePerSeat: customPrice,
        });

        expect(result).toBeDefined();
        const updateCall = vi.mocked(prisma.organizationOnboarding.update).mock.calls[0][0];
        expect(updateCall.where).toEqual({ id: "onboard-id-1" });
        const { updatedAt: _updatedAt, ...data } = updateCall.data;
        expect(data).toEqual({
          bio: "BIO",
          logo: "LOGO",
          brandColor: null,
          bannerUrl: null,
          invitedMembers: undefined,
          teams: [
            {
              id: 1,
              isBeingMigrated: true,
              name: "Team 1",
              slug: "team1",
            },
          ],
          stripeCustomerId: "mock_stripe_customer_id",
          pricePerSeat: customPrice,
          billingPeriod: "MONTHLY",
          seats: 5,
        });
      });

      it("should create custom price in Stripe when admin overrides price", async () => {
        const customPrice = 1500;

        await service.createPaymentIntent(
          {
            ...baseInput,
            pricePerSeat: customPrice,
          },
          {
            ...defaultOrgOnboarding,
            pricePerSeat: customPrice,
          }
        );

        // Verify a custom price was created in Stripe
        expect(vi.mocked(service["billingService"].createPrice)).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: customPrice * 100, // Convert to cents for Stripe
            currency: "usd",
            interval: "month",
            productId: "STRIPE_ORG_PRODUCT_ID",
            nickname: expect.stringContaining("Custom Organization Price"),
            metadata: expect.objectContaining({
              billingPeriod: "MONTHLY",
              organizationOnboardingId: "onboard-id-1",
              pricePerSeat: customPrice,
            }),
          })
        );
      });
    });

    describe("seat count flexibility", () => {
      beforeEach(() => {
        mockPermissionService.validatePermissions.mockResolvedValue(true);
        mockPermissionService.hasModifiedDefaultPayment.mockReturnValue(false);
        vi.mocked(prisma.membership.findMany).mockResolvedValue([]);
      });

      it("should allow creating organization with 1 seat", async () => {
        vi.mocked(prisma.organizationOnboarding.create).mockResolvedValue({
          id: 1,
          name: "Small Org",
          slug: "small-org",
          orgOwnerEmail: "owner@example.com",
          billingPeriod: "MONTHLY",
          seats: 1,
          pricePerSeat: 20,
          stripeCustomerId: null,
          isComplete: false,
        });

        const result = await service.createOrganizationOnboarding({
          name: "Small Org",
          slug: "small-org",
          orgOwnerEmail: "owner@example.com",
          createdByUserId: 1,
          seats: 1,
        });

        expect(result).toBeDefined();
        const createCall = vi.mocked(prisma.organizationOnboarding.create).mock.calls[0][0];
        expect(createCall.data.seats).toBe(1);
      });

      it("should default to 1 seat when seats not provided", async () => {
        vi.mocked(prisma.organizationOnboarding.create).mockResolvedValue({
          id: 1,
          name: "Default Org",
          slug: "default-org",
          orgOwnerEmail: "owner@example.com",
          billingPeriod: "MONTHLY",
          seats: 1,
          pricePerSeat: 20,
          stripeCustomerId: null,
          isComplete: false,
        });

        const result = await service.createOrganizationOnboarding({
          name: "Default Org",
          slug: "default-org",
          orgOwnerEmail: "owner@example.com",
          createdByUserId: 1,
        });

        expect(result).toBeDefined();
        const createCall = vi.mocked(prisma.organizationOnboarding.create).mock.calls[0][0];
        expect(createCall.data.seats).toBe(1);
      });

      it("should allow creating organization with any seat count", async () => {
        const seatCounts = [1, 2, 5, 10, 50, 100];

        for (const seatCount of seatCounts) {
          vi.clearAllMocks();
          vi.mocked(prisma.organizationOnboarding.create).mockResolvedValue({
            id: 1,
            name: `Org ${seatCount}`,
            slug: `org-${seatCount}`,
            orgOwnerEmail: `owner${seatCount}@example.com`,
            billingPeriod: "MONTHLY",
            seats: seatCount,
            pricePerSeat: 20,
            stripeCustomerId: null,
            isComplete: false,
          });

          await service.createOrganizationOnboarding({
            name: `Org ${seatCount}`,
            slug: `org-${seatCount}`,
            orgOwnerEmail: `owner${seatCount}@example.com`,
            createdByUserId: 1,
            seats: seatCount,
          });

          const createCall = vi.mocked(prisma.organizationOnboarding.create).mock.calls[0][0];
          expect(createCall.data.seats).toBe(seatCount);
        }
      });
    });
  });
});
