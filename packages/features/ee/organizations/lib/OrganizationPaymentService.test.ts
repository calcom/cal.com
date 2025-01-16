import { describe, expect, it, vi, beforeEach } from "vitest";

import { ORGANIZATION_SELF_SERVE_MIN_SEATS, ORGANIZATION_SELF_SERVE_PRICE } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { OrganizationPaymentService } from "./OrganizationPaymentService";

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
  const mockUser: TrpcSessionUser = {
    id: 1,
    email: "test@example.com",
    role: "USER",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrganizationPaymentService(mockUser);
    // Default mock for no pending organizations
    vi.mocked(prisma.organizationOnboarding.findFirst).mockResolvedValue(null);
    // Default mock for team memberships - grant permission by default
    vi.mocked(prisma.membership.findMany).mockImplementation(async (query) => {
      // For team migration permission check
      if (query.where?.team?.id?.in) {
        return query.where.team.id.in.map((teamId) => ({
          userId: mockUser.id,
          teamId,
          role: "OWNER",
        }));
      }
      // For member count check
      return [{ userId: 1, user: { email: "user1@example.com" } }];
    });
    // Default mock for user
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ metadata: {} } as any);
  });

  describe("hasPendingOrganizations", () => {
    it("should return false for admin users", async () => {
      const adminService = new OrganizationPaymentService({ ...mockUser, role: "ADMIN" });

      const result = await adminService.hasPendingOrganizations("test@example.com");
      expect(result).toBe(false);
      expect(prisma.organizationOnboarding.findFirst).not.toHaveBeenCalled();
    });

    it("should check for pending organizations", async () => {
      vi.mocked(prisma.organizationOnboarding.findFirst).mockResolvedValueOnce({
        id: 1,
        isComplete: false,
      } as any);

      const result = await service.hasPendingOrganizations("test@example.com");
      expect(result).toBe(true);
      expect(prisma.organizationOnboarding.findFirst).toHaveBeenCalledWith({
        where: {
          orgOwnerEmail: "test@example.com",
          isComplete: false,
        },
      });
    });
  });

  describe("hasPermissionToModifyDefaultPayment", () => {
    it("should return true for admin users", () => {
      const adminService = new OrganizationPaymentService({ ...mockUser, role: "ADMIN" });
      const result = adminService.hasPermissionToModifyDefaultPayment();
      expect(result).toBe(true);
    });

    it("should return false for non-admin users", () => {
      const result = service.hasPermissionToModifyDefaultPayment();
      expect(result).toBe(false);
    });
  });

  describe("createPaymentIntent with admin config", () => {
    const mockAdminInput = {
      id: 1,
      name: "Test Org",
      slug: "test-org",
      orgOwnerEmail: "test@example.com",
      billingPeriod: "ANNUALLY",
      seats: 100,
      pricePerSeat: 15,
      teams: [{ id: 1, isBeingMigrated: true, slug: "team1", name: "Team 1" }],
    };

    const mockNonAdminInput = {
      id: 1,
      name: "Test Org",
      slug: "test-org",
      orgOwnerEmail: "test@example.com",
      billingPeriod: "ANNUALLY", // Attempting to modify default config
      seats: 100,
      pricePerSeat: 15,
      teams: [{ id: 1, isBeingMigrated: true, slug: "team1", name: "Team 1" }],
    };

    beforeEach(() => {
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

    it("should allow admin to modify default payment config", async () => {
      const adminService = new OrganizationPaymentService({ ...mockUser, role: "ADMIN" });
      vi.mocked(prisma.membership.findMany).mockResolvedValueOnce([
        { userId: 1, user: { email: "user1@example.com" } },
      ] as any);

      const result = await adminService.createPaymentIntent(mockAdminInput);

      expect(result).toBeDefined();
      expect(result.checkoutUrl).toBeDefined();
      expect(prisma.organizationOnboarding.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            billingPeriod: "ANNUALLY",
            seats: 100,
            pricePerSeat: 15,
          }),
        })
      );
    });

    it("should throw error when non-admin tries to modify default payment config", async () => {
      await expect(service.createPaymentIntent(mockNonAdminInput)).rejects.toThrow(
        "You do not have permission to modify the default payment settings"
      );
    });

    it("should allow non-admin to create with default payment config", async () => {
      const defaultInput = {
        id: 1,
        name: "Test Org",
        slug: "test-org",
        orgOwnerEmail: mockUser.email,
        teams: [{ id: 1, isBeingMigrated: true, slug: "team1", name: "Team 1" }],
      };

      vi.mocked(prisma.membership.findMany).mockResolvedValueOnce([
        { userId: 1, user: { email: "user1@example.com" } },
      ] as any);

      const result = await service.createPaymentIntent(defaultInput);

      expect(result).toBeDefined();
      expect(result.checkoutUrl).toBeDefined();
      expect(prisma.organizationOnboarding.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          billingPeriod: "MONTHLY",
          seats: Number(ORGANIZATION_SELF_SERVE_MIN_SEATS),
          pricePerSeat: Number(ORGANIZATION_SELF_SERVE_PRICE),
          name: "Test Org",
          slug: "test-org",
          orgOwnerEmail: mockUser.email,
          teams: [
            {
              id: 1,
              isBeingMigrated: true,
              slug: "team1",
              name: "Team 1",
            },
          ],
        }),
      });
    });
  });

  describe("createPaymentIntent seat calculation", () => {
    const baseInput = {
      id: 1,
      name: "Test Org",
      slug: "test-org",
      orgOwnerEmail: mockUser.email,
      teams: [{ id: 1, isBeingMigrated: true, slug: "team1", name: "Team 1" }],
    };

    it("should use minimum seats when total unique members is less than minimum", async () => {
      // Mock 3 unique members (less than minimum of 5)
      vi.mocked(prisma.membership.findMany).mockImplementation(async (query) => {
        // For team migration permission check
        if (query.where?.team?.id?.in) {
          return query.where.team.id.in.map((teamId) => ({
            userId: mockUser.id,
            teamId,
            role: "OWNER",
          }));
        }
        // For member count check
        return [
          { userId: 1, user: { email: "user1@example.com" } },
          { userId: 2, user: { email: "user2@example.com" } },
          { userId: 3, user: { email: "user3@example.com" } },
        ];
      });

      const result = await service.createPaymentIntent({
        ...baseInput,
        invitedMembers: [{ email: "invited1@example.com" }], // Adding 1 invited member
      });

      expect(result).toBeDefined();
      expect(prisma.organizationOnboarding.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          seats: Number(ORGANIZATION_SELF_SERVE_MIN_SEATS), // Should still be 5 (minimum)
          billingPeriod: "MONTHLY",
          pricePerSeat: Number(ORGANIZATION_SELF_SERVE_PRICE),
        }),
      });
    });

    it("should use total unique members when more than minimum", async () => {
      // Mock 7 unique team members
      vi.mocked(prisma.membership.findMany).mockImplementation(async (query) => {
        // For team migration permission check
        if (query.where?.team?.id?.in) {
          return query.where.team.id.in.map((teamId) => ({
            userId: mockUser.id,
            teamId,
            role: "OWNER",
          }));
        }
        // For member count check
        return Array.from({ length: 7 }, (_, i) => ({
          userId: i + 1,
          user: { email: `user${i + 1}@example.com` },
        }));
      });

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
          seats: 7, // 7 team members (we don't count invited members for seat calculation)
          billingPeriod: "MONTHLY",
          pricePerSeat: Number(ORGANIZATION_SELF_SERVE_PRICE),
        }),
      });
    });

    it("should handle duplicate emails between team members and invites", async () => {
      // Mock 4 team members, with one duplicate email in invites
      vi.mocked(prisma.membership.findMany).mockImplementation(async (query) => {
        // For team migration permission check
        if (query.where?.team?.id?.in) {
          return query.where.team.id.in.map((teamId) => ({
            userId: mockUser.id,
            teamId,
            role: "OWNER",
          }));
        }
        // For member count check
        return [
          { userId: 1, user: { email: "user1@example.com" } },
          { userId: 2, user: { email: "user2@example.com" } },
          { userId: 3, user: { email: "user3@example.com" } },
          { userId: 4, user: { email: "duplicate@example.com" } },
        ];
      });

      const result = await service.createPaymentIntent({
        ...baseInput,
        invitedMembers: [
          { email: "invited1@example.com" },
          { email: "duplicate@example.com" }, // Duplicate email
          { email: "invited2@example.com" },
        ],
      });

      expect(result).toBeDefined();
      expect(prisma.organizationOnboarding.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          seats: Number(ORGANIZATION_SELF_SERVE_MIN_SEATS), // Should be 5 (minimum) since unique count is only 4
          billingPeriod: "MONTHLY",
          pricePerSeat: Number(ORGANIZATION_SELF_SERVE_PRICE),
        }),
      });
    });
  });

  describe("admin overrides for seats and pricing", () => {
    const baseInput = {
      id: 1,
      name: "Test Org",
      slug: "test-org",
      orgOwnerEmail: mockUser.email,
      teams: [{ id: 1, isBeingMigrated: true, slug: "team1", name: "Team 1" }],
    };

    beforeEach(() => {
      // Mock team migration permissions for admin
      vi.mocked(prisma.membership.findMany).mockImplementation(async (query) => {
        // For team migration permission check
        if (query.where?.team?.id?.in) {
          return query.where.team.id.in.map((teamId) => ({
            userId: mockUser.id,
            teamId,
            role: "OWNER",
          }));
        }
        // For member count check
        return [
          { userId: 1, user: { email: "user1@example.com" } },
          { userId: 2, user: { email: "user2@example.com" } },
        ];
      });
    });

    it("should allow admin to override minimum seats to a lower value", async () => {
      const adminService = new OrganizationPaymentService({ ...mockUser, role: "ADMIN" });

      const result = await adminService.createPaymentIntent({
        ...baseInput,
        seats: 3, // Below minimum of 5
      });

      expect(result).toBeDefined();
      expect(prisma.organizationOnboarding.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          seats: 3, // Should use admin's override
          billingPeriod: "MONTHLY",
          pricePerSeat: Number(ORGANIZATION_SELF_SERVE_PRICE),
        }),
      });
    });

    it("should allow admin to override price per seat", async () => {
      const adminService = new OrganizationPaymentService({ ...mockUser, role: "ADMIN" });

      const result = await adminService.createPaymentIntent({
        ...baseInput,
        pricePerSeat: 1000, // Custom price
      });

      expect(result).toBeDefined();
      expect(prisma.organizationOnboarding.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          seats: Number(ORGANIZATION_SELF_SERVE_MIN_SEATS),
          billingPeriod: "MONTHLY",
          pricePerSeat: 1000, // Should use admin's override
        }),
      });
    });

    it("should allow admin to override both seats and price", async () => {
      const adminService = new OrganizationPaymentService({ ...mockUser, role: "ADMIN" });

      const result = await adminService.createPaymentIntent({
        ...baseInput,
        seats: 2,
        pricePerSeat: 500,
      });

      expect(result).toBeDefined();
      expect(prisma.organizationOnboarding.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          seats: 2,
          billingPeriod: "MONTHLY",
          pricePerSeat: 500,
        }),
      });
    });

    it("should not allow non-admin to override minimum seats", async () => {
      await expect(
        service.createPaymentIntent({
          ...baseInput,
          seats: 3, // Trying to set below minimum
        })
      ).rejects.toThrow("You do not have permission to modify the default payment settings");
    });

    it("should not allow non-admin to override price per seat", async () => {
      await expect(
        service.createPaymentIntent({
          ...baseInput,
          pricePerSeat: 1000, // Trying to modify price
        })
      ).rejects.toThrow("You do not have permission to modify the default payment settings");
    });

    it("should create custom price in Stripe when admin overrides price", async () => {
      const adminService = new OrganizationPaymentService({ ...mockUser, role: "ADMIN" });
      const customPrice = 1500;

      await adminService.createPaymentIntent({
        ...baseInput,
        pricePerSeat: customPrice,
      });

      // Verify a custom price was created in Stripe
      expect(vi.mocked(adminService["billingService"].createPrice)).toHaveBeenCalledWith({
        amount: customPrice * 100, // Convert to cents for Stripe
        currency: "usd",
        interval: "monthly",
        metadata: expect.any(Object),
        nickname: expect.any(String),
      });
    });
  });
});
