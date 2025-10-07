import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach } from "vitest";

import { UserPermissionRole, CreationSource } from "@calcom/prisma/enums";
import { OrganizationOnboardingRepository } from "@calcom/lib/server/repository/organizationOnboarding";

import { OrganizationOnboardingService } from "./OrganizationOnboardingService";
import { OrganizationPaymentService } from "./OrganizationPaymentService";
import { OrganizationPermissionService } from "./OrganizationPermissionService";

vi.mock("./OrganizationPaymentService");
vi.mock("./OrganizationPermissionService");
vi.mock("@calcom/lib/server/repository/organizationOnboarding");

const mockUser = {
  id: 1,
  email: "test@example.com",
  role: UserPermissionRole.USER,
  name: "Test User",
};

const mockAdminUser = {
  id: 2,
  email: "admin@example.com",
  role: UserPermissionRole.ADMIN,
  name: "Admin User",
};

const mockInput = {
  name: "Test Organization",
  slug: "test-org",
  orgOwnerEmail: "owner@example.com",
  seats: 10,
  pricePerSeat: 20,
  isPlatform: false,
  creationSource: CreationSource.WEBAPP,
  logo: "https://example.com/logo.png",
  bio: "Test bio",
  brandColor: "#000000",
  bannerUrl: "https://example.com/banner.png",
};

describe("OrganizationOnboardingService", () => {
  let service: OrganizationOnboardingService;
  let mockPaymentService: any;
  let mockPermissionService: any;

  beforeEach(async () => {
    vi.resetAllMocks();
    // @ts-expect-error reset is a method on Prismock
    await prismock.reset();

    mockPaymentService = {
      createOrganizationOnboarding: vi.fn().mockResolvedValue({
        id: "onboarding-123",
        name: mockInput.name,
        slug: mockInput.slug,
        orgOwnerEmail: mockInput.orgOwnerEmail,
        seats: mockInput.seats,
        pricePerSeat: mockInput.pricePerSeat,
        billingPeriod: "MONTHLY",
        isComplete: false,
        stripeCustomerId: null,
      }),
      createPaymentIntent: vi.fn().mockResolvedValue({
        checkoutUrl: "https://stripe.com/checkout/session",
        organizationOnboarding: {},
        subscription: {},
        sessionId: "session-123",
      }),
    };

    mockPermissionService = {
      validatePermissions: vi.fn().mockResolvedValue(true),
    };

    vi.mocked(OrganizationOnboardingRepository.update).mockResolvedValue({
      id: "onboarding-123",
      name: mockInput.name,
      slug: mockInput.slug,
      orgOwnerEmail: mockInput.orgOwnerEmail,
      seats: mockInput.seats,
      pricePerSeat: mockInput.pricePerSeat,
      billingPeriod: "MONTHLY",
      isComplete: false,
      teams: [],
      invitedMembers: [],
    } as any);
  });

  describe("createOnboardingIntent", () => {
    it("should create onboarding without payment for admin users", async () => {
      service = new OrganizationOnboardingService(
        mockAdminUser as any,
        mockPaymentService,
        mockPermissionService
      );

      const result = await service.createOnboardingIntent(mockInput);

      expect(result.checkoutUrl).toBeNull();
      expect(result.organizationOnboardingId).toBe("onboarding-123");
      expect(mockPaymentService.createOrganizationOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          name: mockInput.name,
          slug: mockInput.slug,
          orgOwnerEmail: mockInput.orgOwnerEmail,
          createdByUserId: mockAdminUser.id,
        })
      );
      expect(mockPaymentService.createPaymentIntent).not.toHaveBeenCalled();
    });

    it("should create onboarding with payment intent for regular users", async () => {
      service = new OrganizationOnboardingService(
        mockUser as any,
        mockPaymentService,
        mockPermissionService
      );

      const result = await service.createOnboardingIntent(mockInput);

      expect(result.checkoutUrl).toBe("https://stripe.com/checkout/session");
      expect(result.organizationOnboardingId).toBe("onboarding-123");
      expect(mockPaymentService.createOrganizationOnboarding).toHaveBeenCalled();
      expect(mockPaymentService.createPaymentIntent).toHaveBeenCalled();
    });

    it("should handle teams in the request", async () => {
      service = new OrganizationOnboardingService(
        mockAdminUser as any,
        mockPaymentService,
        mockPermissionService
      );

      const inputWithTeams = {
        ...mockInput,
        teams: [
          { id: -1, name: "Engineering", isBeingMigrated: false, slug: null },
          { id: -1, name: "Sales", isBeingMigrated: false, slug: null },
        ],
      };

      const result = await service.createOnboardingIntent(inputWithTeams);

      expect(result.organizationOnboardingId).toBe("onboarding-123");
    });

    it("should handle invited members in the request", async () => {
      service = new OrganizationOnboardingService(
        mockAdminUser as any,
        mockPaymentService,
        mockPermissionService
      );

      const inputWithInvites = {
        ...mockInput,
        invitedMembers: [
          { email: "member1@example.com", name: "Member 1" },
          { email: "member2@example.com", name: "Member 2" },
        ],
      };

      const result = await service.createOnboardingIntent(inputWithInvites);

      expect(result.organizationOnboardingId).toBe("onboarding-123");
    });

    it("should filter out empty team names", async () => {
      service = new OrganizationOnboardingService(
        mockUser as any,
        mockPaymentService,
        mockPermissionService
      );

      const inputWithEmptyTeams = {
        ...mockInput,
        teams: [
          { id: -1, name: "Engineering", isBeingMigrated: false, slug: null },
          { id: -1, name: "  ", isBeingMigrated: false, slug: null },
          { id: -1, name: "", isBeingMigrated: false, slug: null },
        ],
      };

      await service.createOnboardingIntent(inputWithEmptyTeams);

      expect(mockPaymentService.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          teams: [{ id: -1, name: "Engineering", isBeingMigrated: false, slug: null }],
        }),
        expect.anything()
      );
    });

    it("should filter out empty invite emails", async () => {
      service = new OrganizationOnboardingService(
        mockUser as any,
        mockPaymentService,
        mockPermissionService
      );

      const inputWithEmptyInvites = {
        ...mockInput,
        invitedMembers: [
          { email: "member1@example.com", name: "Member 1" },
          { email: "  ", name: "Empty" },
          { email: "", name: "Empty 2" },
        ],
      };

      await service.createOnboardingIntent(inputWithEmptyInvites);

      expect(mockPaymentService.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          invitedMembers: [{ email: "member1@example.com", name: "Member 1" }],
        }),
        expect.anything()
      );
    });

    it("should pass correct onboarding data to payment service", async () => {
      service = new OrganizationOnboardingService(
        mockUser as any,
        mockPaymentService,
        mockPermissionService
      );

      await service.createOnboardingIntent(mockInput);

      expect(mockPaymentService.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          logo: mockInput.logo,
          bio: mockInput.bio,
          brandColor: mockInput.brandColor,
          bannerUrl: mockInput.bannerUrl,
        }),
        expect.objectContaining({
          id: "onboarding-123",
          pricePerSeat: mockInput.pricePerSeat,
          seats: mockInput.seats,
        })
      );
    });
  });
});
