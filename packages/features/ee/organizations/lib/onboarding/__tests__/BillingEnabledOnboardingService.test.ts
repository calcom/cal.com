import prismock from "../../../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach } from "vitest";

import { UserPermissionRole, CreationSource } from "@calcom/prisma/enums";

import { OrganizationPaymentService } from "../../OrganizationPaymentService";
import { BillingEnabledOnboardingService } from "../BillingEnabledOnboardingService";
import type { CreateOnboardingIntentInput } from "../types";

vi.mock("../../OrganizationPaymentService");

const mockUser = {
  id: 1,
  email: "user@example.com",
  role: UserPermissionRole.USER,
  name: "Test User",
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

describe("BillingEnabledOnboardingService", () => {
  let service: BillingEnabledOnboardingService;
  let mockPaymentService: any;

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

    service = new BillingEnabledOnboardingService(mockUser as any, mockPaymentService);
  });

  describe("createOnboardingIntent", () => {
    it("should create onboarding record", async () => {
      await service.createOnboardingIntent(mockInput);

      expect(mockPaymentService.createOrganizationOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          name: mockInput.name,
          slug: mockInput.slug,
          orgOwnerEmail: mockInput.orgOwnerEmail,
          createdByUserId: mockUser.id,
        })
      );
    });

    it("should create Stripe payment intent with teams and invites", async () => {
      await service.createOnboardingIntent(mockInput);

      expect(mockPaymentService.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          teams: expect.arrayContaining([
            { id: -1, name: "Engineering", isBeingMigrated: false, slug: null },
            { id: -1, name: "Sales", isBeingMigrated: false, slug: null },
          ]),
          invitedMembers: expect.arrayContaining([
            { email: "member1@example.com", name: "Member 1" },
            { email: "member2@example.com", name: "Member 2" },
          ]),
        }),
        expect.anything()
      );
    });

    it("should return checkout URL", async () => {
      const result = await service.createOnboardingIntent(mockInput);

      expect(result.checkoutUrl).toBe("https://stripe.com/checkout/session");
      expect(result.organizationId).toBeNull();
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

      expect(mockPaymentService.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          teams: [{ id: -1, name: "Engineering", isBeingMigrated: false, slug: null }],
        }),
        expect.anything()
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

      expect(mockPaymentService.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          invitedMembers: [{ email: "member1@example.com", name: "Member 1" }],
        }),
        expect.anything()
      );
    });

    it("should NOT create organization immediately", async () => {
      const result = await service.createOnboardingIntent(mockInput);

      // Organization will be created later via Stripe webhook
      expect(result.organizationId).toBeNull();
      expect(result.checkoutUrl).not.toBeNull();
    });

    it("should return all required fields", async () => {
      const result = await service.createOnboardingIntent(mockInput);

      expect(result).toEqual({
        userId: mockUser.id,
        orgOwnerEmail: mockInput.orgOwnerEmail,
        name: mockInput.name,
        slug: mockInput.slug,
        seats: mockInput.seats,
        pricePerSeat: mockInput.pricePerSeat,
        billingPeriod: mockInput.billingPeriod,
        isPlatform: mockInput.isPlatform,
        organizationOnboardingId: "onboarding-123",
        checkoutUrl: "https://stripe.com/checkout/session",
        organizationId: null,
      });
    });
  });
});
