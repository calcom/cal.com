import prismock from "../../../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach } from "vitest";

import { LicenseKeySingleton } from "@calcom/ee/common/server/LicenseKeyService";
import { UserPermissionRole, CreationSource } from "@calcom/prisma/enums";
import { OrganizationOnboardingRepository } from "@calcom/lib/server/repository/organizationOnboarding";

import { OrganizationPaymentService } from "../../OrganizationPaymentService";
import { SelfHostedOnboardingService } from "../SelfHostedOnboardingService";
import type { CreateOnboardingIntentInput } from "../types";

vi.mock("../../OrganizationPaymentService");
vi.mock("@calcom/lib/server/repository/organizationOnboarding");
vi.mock("@calcom/ee/common/server/LicenseKeyService", () => ({
  LicenseKeySingleton: {
    getInstance: vi.fn(),
  },
}));

const mockAdminUser = {
  id: 2,
  email: "admin@example.com",
  role: UserPermissionRole.ADMIN,
  name: "Admin User",
};

const mockInput: CreateOnboardingIntentInput = {
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
  teams: [
    { id: -1, name: "Engineering", isBeingMigrated: false, slug: null },
    { id: -1, name: "Sales", isBeingMigrated: false, slug: null },
  ],
  invitedMembers: [
    { email: "member1@example.com", name: "Member 1" },
    { email: "member2@example.com", name: "Member 2" },
  ],
};

describe("SelfHostedOnboardingService", () => {
  let service: SelfHostedOnboardingService;
  let mockPaymentService: any;

  beforeEach(async () => {
    vi.resetAllMocks();
    // @ts-expect-error reset is a method on Prismock
    await prismock.reset();

    // Mock license check
    vi.mocked(LicenseKeySingleton.getInstance).mockResolvedValue({
      checkLicense: vi.fn().mockResolvedValue(true),
    } as any);

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
    };

    vi.mocked(OrganizationOnboardingRepository.update).mockResolvedValue({
      id: "onboarding-123",
      teams: [],
      invitedMembers: [],
    } as any);

    vi.mocked(OrganizationOnboardingRepository.markAsComplete).mockResolvedValue({} as any);

    service = new SelfHostedOnboardingService(mockAdminUser as any, mockPaymentService);
  });

  describe("createOnboardingIntent", () => {
    it("should create onboarding record", async () => {
      await service.createOnboardingIntent(mockInput);

      expect(mockPaymentService.createOrganizationOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          name: mockInput.name,
          slug: mockInput.slug,
          orgOwnerEmail: mockInput.orgOwnerEmail,
          createdByUserId: mockAdminUser.id,
        })
      );
    });

    it("should store teams and invites in onboarding record", async () => {
      await service.createOnboardingIntent(mockInput);

      expect(OrganizationOnboardingRepository.update).toHaveBeenCalledWith(
        "onboarding-123",
        expect.objectContaining({
          teams: expect.arrayContaining([
            { id: -1, name: "Engineering", isBeingMigrated: false, slug: null },
            { id: -1, name: "Sales", isBeingMigrated: false, slug: null },
          ]),
          invitedMembers: expect.arrayContaining([
            { email: "member1@example.com", name: "Member 1" },
            { email: "member2@example.com", name: "Member 2" },
          ]),
        })
      );
    });

    it("should mark onboarding as complete", async () => {
      await service.createOnboardingIntent(mockInput);

      expect(OrganizationOnboardingRepository.markAsComplete).toHaveBeenCalledWith("onboarding-123");
    });

    it("should return organization ID (not checkout URL)", async () => {
      const result = await service.createOnboardingIntent(mockInput);

      expect(result.organizationId).toBe(1);
      expect(result.checkoutUrl).toBeNull();
    });

    it("should filter out empty team names", async () => {
      const inputWithEmptyTeams = {
        ...mockInput,
        teams: [
          { id: -1, name: "Engineering", isBeingMigrated: false, slug: null },
          { id: -1, name: "  ", isBeingMigrated: false, slug: null },
          { id: -1, name: "", isBeingMigrated: false, slug: null },
        ],
      };

      await service.createOnboardingIntent(inputWithEmptyTeams);

      expect(OrganizationOnboardingRepository.update).toHaveBeenCalledWith(
        "onboarding-123",
        expect.objectContaining({
          teams: [{ id: -1, name: "Engineering", isBeingMigrated: false, slug: null }],
        })
      );
    });

    it("should filter out empty invite emails", async () => {
      const inputWithEmptyInvites = {
        ...mockInput,
        invitedMembers: [
          { email: "member1@example.com", name: "Member 1" },
          { email: "  ", name: "Empty" },
          { email: "", name: "Empty 2" },
        ],
      };

      await service.createOnboardingIntent(inputWithEmptyInvites);

      expect(OrganizationOnboardingRepository.update).toHaveBeenCalledWith(
        "onboarding-123",
        expect.objectContaining({
          invitedMembers: [{ email: "member1@example.com", name: "Member 1" }],
        })
      );
    });

    it("should create organization immediately", async () => {
      const result = await service.createOnboardingIntent(mockInput);

      // Organization created immediately, not pending payment
      expect(result.organizationId).toBe(1);
      expect(result.checkoutUrl).toBeNull();
    });

    it("should return all required fields", async () => {
      const result = await service.createOnboardingIntent(mockInput);

      expect(result).toEqual({
        userId: mockAdminUser.id,
        orgOwnerEmail: mockInput.orgOwnerEmail,
        name: mockInput.name,
        slug: mockInput.slug,
        seats: mockInput.seats,
        pricePerSeat: mockInput.pricePerSeat,
        billingPeriod: mockInput.billingPeriod,
        isPlatform: mockInput.isPlatform,
        organizationOnboardingId: "onboarding-123",
        checkoutUrl: null,
        organizationId: 1,
      });
    });
  });
});
