import { describe, expect, it, vi, beforeEach } from "vitest";

import { prisma } from "@calcom/prisma";
import { TRPCError } from "@calcom/trpc/server";

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
  })),
}));

describe("OrganizationPaymentService", () => {
  let service: OrganizationPaymentService;
  const mockUser = {
    id: 1,
    email: "test@example.com",
    role: "USER",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrganizationPaymentService(mockUser);
  });

  describe("hasPendingOrganizations", () => {
    it("should return false for admin users", async () => {
      const adminService = new OrganizationPaymentService({ ...mockUser, role: "ADMIN" });
      const hasPendingOrganizationsSpy = vi.spyOn(adminService, "hasPendingOrganizations");

      const result = await hasPendingOrganizationsSpy("test@example.com");
      expect(result).toBe(false);
    });

    it("should check for pending organizations", async () => {
      const hasPendingOrganizationsSpy = vi.spyOn(service, "hasPendingOrganizations");
      vi.mocked(prisma.organizationOnboarding.findFirst).mockResolvedValueOnce({
        id: 1,
        isComplete: false,
      } as any);

      const result = await hasPendingOrganizationsSpy("test@example.com");
      expect(result).toBe(true);
      expect(prisma.organizationOnboarding.findFirst).toHaveBeenCalledWith({
        where: {
          orgOwnerEmail: "test@example.com",
          isComplete: false,
        },
      });
    });
  });

  describe("getUniqueTeamMembersCount", () => {
    it("should return 0 for empty team ids", async () => {
      const getUniqueTeamMembersCountSpy = vi.spyOn(service, "getUniqueTeamMembersCount");
      const result = await getUniqueTeamMembersCountSpy([]);
      expect(result).toBe(0);
    });

    it("should return unique members count", async () => {
      const getUniqueTeamMembersCountSpy = vi.spyOn(service, "getUniqueTeamMembersCount");
      vi.mocked(prisma.membership.findMany).mockResolvedValueOnce([
        { userId: 1, user: { email: "user1@example.com" } },
        { userId: 2, user: { email: "user2@example.com" } },
      ] as any);

      const result = await getUniqueTeamMembersCountSpy([1, 2]);
      expect(result).toBe(2);
      expect(prisma.membership.findMany).toHaveBeenCalledWith({
        where: {
          teamId: {
            in: [1, 2],
          },
        },
        select: {
          userId: true,
          user: {
            select: {
              email: true,
            },
          },
        },
        distinct: ["userId"],
      });
    });
  });

  describe("createOrganizationOnboarding", () => {
    const mockInput = {
      name: "Test Org",
      slug: "test-org",
      orgOwnerEmail: "test@example.com",
      teams: [{ id: 1, isBeingMigrated: true, slug: "team1", name: "Team 1" }],
      invitedMembers: [{ email: "member@example.com" }],
    };

    const mockConfig = {
      billingPeriod: "MONTHLY",
      seats: 5,
      pricePerSeat: 10,
    };

    it("should create organization onboarding with correct data", async () => {
      vi.mocked(prisma.membership.findMany).mockResolvedValueOnce([
        { userId: 1, user: { email: "user1@example.com" } },
      ] as any);

      vi.mocked(prisma.organizationOnboarding.create).mockResolvedValueOnce({
        id: 1,
        ...mockInput,
        ...mockConfig,
      } as any);

      await service["createOrganizationOnboarding"](mockInput, mockConfig, "stripe_customer_id");

      expect(prisma.organizationOnboarding.create).toHaveBeenCalledWith({
        data: {
          name: mockInput.name,
          slug: mockInput.slug,
          orgOwnerEmail: mockInput.orgOwnerEmail,
          billingPeriod: mockConfig.billingPeriod,
          seats: mockConfig.seats,
          pricePerSeat: mockConfig.pricePerSeat,
          stripeCustomerId: "stripe_customer_id",
          invitedMembers: mockInput.invitedMembers,
          teams: mockInput.teams,
        },
      });
    });

    it("should update seats if unique members count is higher", async () => {
      vi.mocked(prisma.membership.findMany).mockResolvedValueOnce([
        { userId: 1, user: { email: "user1@example.com" } },
        { userId: 2, user: { email: "user2@example.com" } },
        { userId: 3, user: { email: "user3@example.com" } },
        { userId: 4, user: { email: "user4@example.com" } },
        { userId: 5, user: { email: "user5@example.com" } },
        { userId: 6, user: { email: "user6@example.com" } },
      ] as any);

      await service["createOrganizationOnboarding"](mockInput, mockConfig, "stripe_customer_id");

      expect(prisma.organizationOnboarding.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            seats: 6, // Should be updated to match the number of unique members
          }),
        })
      );
    });
  });

  describe("createPaymentIntent", () => {
    const mockInput = {
      id: 1,
      name: "Test Org",
      slug: "test-org",
      orgOwnerEmail: "test@example.com",
      teams: [{ id: 1, isBeingMigrated: true, slug: "team1", name: "Team 1" }],
    };

    it("should create payment intent successfully", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        metadata: {},
      } as any);

      const result = await service.createPaymentIntent(mockInput);

      expect(result).toBeDefined();
      expect(result.checkoutUrl).toBeDefined();
    });

    it("should throw error if user has pending organizations", async () => {
      vi.mocked(prisma.organizationOnboarding.findFirst).mockResolvedValueOnce({
        id: 1,
        isComplete: false,
      } as any);

      await expect(service.createPaymentIntent(mockInput)).rejects.toThrow(TRPCError);
    });
  });

  describe("hasPermissionToModifyDefaultPayment", () => {
    it("should return true for admin users", () => {
      const adminService = new OrganizationPaymentService({ ...mockUser, role: "ADMIN" });
      const hasPermissionSpy = vi.spyOn(adminService, "hasPermissionToModifyDefaultPayment");

      const result = hasPermissionSpy();
      expect(result).toBe(true);
    });

    it("should return false for non-admin users", () => {
      const hasPermissionSpy = vi.spyOn(service, "hasPermissionToModifyDefaultPayment");

      const result = hasPermissionSpy();
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
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        metadata: {},
      } as any);
    });

    it("should allow admin to modify default payment config", async () => {
      const adminService = new OrganizationPaymentService({ ...mockUser, role: "ADMIN" });

      const result = await adminService.createPaymentIntent(mockAdminInput);

      expect(result).toBeDefined();
      expect(result.checkoutUrl).toBeDefined();
      // Verify the custom config was used
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
      await expect(service.createPaymentIntent(mockNonAdminInput)).rejects.toThrow(TRPCError);
      await expect(service.createPaymentIntent(mockNonAdminInput)).rejects.toThrow("UNAUTHORIZED");
    });

    it("should allow non-admin to create with default payment config", async () => {
      const defaultInput = {
        id: 1,
        name: "Test Org",
        slug: "test-org",
        orgOwnerEmail: mockUser.email,
        teams: [{ id: 1, isBeingMigrated: true, slug: "team1", name: "Team 1" }],
      };

      const result = await service.createPaymentIntent(defaultInput);

      expect(result).toBeDefined();
      expect(result.checkoutUrl).toBeDefined();
      // Verify default config was used
      expect(prisma.organizationOnboarding.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            billingPeriod: "MONTHLY",
            seats: expect.any(Number),
            pricePerSeat: 20,
          }),
        })
      );
    });
  });
});
