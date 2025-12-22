import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach } from "vitest";

import { LicenseKeySingleton } from "@calcom/ee/common/server/LicenseKeyService";
import { OrganizationPaymentService } from "@calcom/features/ee/organizations/lib/OrganizationPaymentService";
import { BillingPeriod, UserPermissionRole, CreationSource } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import { intentToCreateOrgHandler } from "./intentToCreateOrg.handler";

vi.mock("@calcom/ee/common/server/LicenseKeyService", () => ({
  LicenseKeySingleton: {
    getInstance: vi.fn(),
  },
}));

vi.mock("@calcom/features/ee/organizations/lib/OrganizationPaymentService");

const mockInput = {
  name: "Test Org",
  slug: "test-org",
  orgOwnerEmail: "test@example.com",
  billingPeriod: "MONTHLY",
  seats: 5,
  pricePerSeat: 20,
  isPlatform: false,
  creationSource: "WEBAPP",
};

// Helper functions for creating test data
async function createTestUser(data: {
  email: string;
  name?: string;
  username?: string;
  role?: UserPermissionRole;
  completedOnboarding?: boolean;
  emailVerified?: Date | null;
}) {
  return prismock.user.create({
    data: {
      email: data.email,
      name: data.name || "Test User",
      username: data.username || "testuser",
      role: data.role || UserPermissionRole.USER,
      completedOnboarding: data.completedOnboarding ?? false,
      emailVerified: data.emailVerified ?? null,
    },
  });
}

describe("intentToCreateOrgHandler", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await prismock.reset();

    vi.mocked(OrganizationPaymentService).mockImplementation(() => {
      return {
        createOrganizationOnboarding: vi.fn().mockImplementation(async (data: any) => {
          return await prismock.organizationOnboarding.create({
            data: {
              id: "onboarding-123",
              name: data.name,
              slug: data.slug,
              orgOwnerEmail: data.orgOwnerEmail,
              seats: data.seats ?? 10,
              pricePerSeat: data.pricePerSeat ?? 15,
              billingPeriod: data.billingPeriod ?? BillingPeriod.MONTHLY,
              isComplete: false,
              stripeCustomerId: null,
              createdById: data.createdByUserId,
              teams: data.teams ?? [],
              invitedMembers: data.invitedMembers ?? [],
              isPlatform: data.isPlatform ?? false,
            },
          });
        }),
        createPaymentIntent: vi.fn().mockResolvedValue({
          checkoutUrl: "https://stripe.com/checkout/session",
          organizationOnboarding: {},
          subscription: {},
          sessionId: "session-123",
        }),
      } as any;
    });
  });

  describe("hosted", () => {
    beforeEach(() => {
      vi.mock("@calcom/lib/constants", async () => {
        const actualImport = await vi.importActual("@calcom/lib/constants");
        return {
          ...actualImport,
          IS_SELF_HOSTED: false,
        };
      });
      vi.mocked(LicenseKeySingleton.getInstance).mockResolvedValue({
        checkLicense: vi.fn().mockResolvedValue(true),
        incrementUsage: vi.fn().mockResolvedValue(undefined),
      });
      process.env.STRIPE_ORG_PRODUCT_ID = "prod_test123";
      process.env.STRIPE_ORG_MONTHLY_PRICE_ID = "price_test123";
    });

    it("should allow admin user to create org for another user", async () => {
      // Create admin user
      const adminUser = await createTestUser({
        email: "admin@example.com",
        role: UserPermissionRole.ADMIN,
      });

      // Create target org owner with completed onboarding and verified email
      await createTestUser({
        email: mockInput.orgOwnerEmail,
        completedOnboarding: true,
        emailVerified: new Date(),
      });

      const result = await intentToCreateOrgHandler({
        input: mockInput,
        ctx: {
          user: adminUser,
        },
      });

      // Admin creating for different user with no teams/invites triggers handover
      expect(result).toEqual({
        userId: expect.any(Number),
        orgOwnerEmail: mockInput.orgOwnerEmail,
        name: mockInput.name,
        slug: mockInput.slug,
        seats: mockInput.seats,
        pricePerSeat: mockInput.pricePerSeat,
        billingPeriod: mockInput.billingPeriod,
        isPlatform: mockInput.isPlatform,
        organizationOnboardingId: expect.any(String),
        checkoutUrl: null,
        organizationId: null, // Not created yet - handover flow
        handoverUrl: expect.stringContaining("/settings/organizations/new/resume?onboardingId="),
      });

      // Verify organization onboarding was created
      const organizationOnboarding = await prismock.organizationOnboarding.findFirst({
        where: {
          slug: mockInput.slug,
        },
      });

      expect(organizationOnboarding).toBeDefined();
      expect(organizationOnboarding?.name).toBe(mockInput.name);
      expect(organizationOnboarding?.slug).toBe(mockInput.slug);
      expect(organizationOnboarding?.orgOwnerEmail).toBe(mockInput.orgOwnerEmail);
    });

    it("should allow user to create org for themselves", async () => {
      // Create user
      const user = await createTestUser({
        email: mockInput.orgOwnerEmail,
        completedOnboarding: true,
        emailVerified: new Date(),
      });

      const result = await intentToCreateOrgHandler({
        input: {
          ...mockInput,
          // Use default payment settings
          seats: undefined,
          pricePerSeat: undefined,
        },
        ctx: {
          user,
        },
      });

      expect(result.userId).toBe(user.id);
      expect(result.orgOwnerEmail).toBe(user.email);
    });

    it("should throw unauthorized error when no user is logged in", async () => {
      await expect(
        intentToCreateOrgHandler({
          input: mockInput,
          ctx: {
            user: null as any,
          },
        })
      ).rejects.toThrow(new TRPCError({ code: "UNAUTHORIZED", message: "You are not authorized." }));
    });

    it("should throw forbidden error when non-admin tries to create org for another user", async () => {
      // Create non-admin user
      const nonAdminUser = await createTestUser({
        email: "nonadmin@example.com",
        role: UserPermissionRole.USER,
      });

      await expect(
        intentToCreateOrgHandler({
          input: mockInput,
          ctx: {
            user: nonAdminUser,
          },
        })
      ).rejects.toThrow(
        new TRPCError({
          code: "FORBIDDEN",
          message: "You can only create organization where you are the owner",
        })
      );
    });

    it("should throw error when target user is not found", async () => {
      // Create admin user
      const adminUser = await createTestUser({
        email: "admin@example.com",
        role: UserPermissionRole.ADMIN,
      });

      await expect(
        intentToCreateOrgHandler({
          input: mockInput,
          ctx: {
            user: adminUser,
          },
        })
      ).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: `No user found with email ${mockInput.orgOwnerEmail}`,
        })
      );
    });

    it("should throw error when organization onboarding already exists and is complete", async () => {
      // Create admin user
      const adminUser = await createTestUser({
        email: "admin@example.com",
        role: UserPermissionRole.ADMIN,
      });

      // Create target org owner
      await createTestUser({
        email: mockInput.orgOwnerEmail,
        completedOnboarding: true,
        emailVerified: new Date(),
      });

      // Create existing COMPLETE organization onboarding
      await prismock.organizationOnboarding.create({
        data: {
          name: mockInput.name,
          slug: mockInput.slug,
          orgOwnerEmail: mockInput.orgOwnerEmail,
          billingPeriod: mockInput.billingPeriod,
          seats: mockInput.seats,
          pricePerSeat: mockInput.pricePerSeat,
          createdById: adminUser.id,
          isComplete: true, // Must be complete to throw error
        },
      });

      await expect(
        intentToCreateOrgHandler({
          input: mockInput,
          ctx: {
            user: adminUser,
          },
        })
      ).rejects.toThrow("organization_onboarding_already_exists");
    });
  });

  // This endpoint doesn't handle platform organizations as that is completely different flow at the moment
  // eslint-disable-next-line playwright/no-skipped-test
  describe.skip("platform organization tests");

  describe("self hosted", () => {
    beforeEach(() => {
      vi.mock("@calcom/lib/constants", async () => {
        const actualImport = await vi.importActual("@calcom/lib/constants");
        return {
          ...actualImport,
          IS_SELF_HOSTED: true,
        };
      });
    });

    it("should throw error when license is not valid", async () => {
      vi.mocked(LicenseKeySingleton.getInstance).mockResolvedValue({
        checkLicense: vi.fn().mockResolvedValue(false),
        incrementUsage: vi.fn().mockResolvedValue(undefined),
      });
      const adminUser = await createTestUser({
        email: "admin@example.com",
        role: UserPermissionRole.ADMIN,
      });

      await expect(
        intentToCreateOrgHandler({
          input: mockInput,
          ctx: {
            user: adminUser,
          },
        })
      ).rejects.toThrow("License is not valid");
    });

    it("should allow admin user to create org for another user", async () => {
      vi.mocked(LicenseKeySingleton.getInstance).mockResolvedValue({
        checkLicense: vi.fn().mockResolvedValue(true),
        incrementUsage: vi.fn().mockResolvedValue(undefined),
      });
      // Create admin user
      const adminUser = await createTestUser({
        email: "admin@example.com",
        role: UserPermissionRole.ADMIN,
      });

      // Create target org owner with completed onboarding and verified email
      await createTestUser({
        email: mockInput.orgOwnerEmail,
        completedOnboarding: true,
        emailVerified: new Date(),
      });

      const result = await intentToCreateOrgHandler({
        input: mockInput,
        ctx: {
          user: adminUser,
        },
      });

      // Admin creating for different user with no teams/invites triggers handover (same as hosted)
      expect(result).toEqual({
        userId: expect.any(Number),
        orgOwnerEmail: mockInput.orgOwnerEmail,
        name: mockInput.name,
        slug: mockInput.slug,
        seats: mockInput.seats,
        pricePerSeat: mockInput.pricePerSeat,
        billingPeriod: mockInput.billingPeriod,
        isPlatform: mockInput.isPlatform,
        organizationOnboardingId: expect.any(String),
        checkoutUrl: null,
        organizationId: null, // Not created yet - handover flow
        handoverUrl: expect.stringContaining("/settings/organizations/new/resume?onboardingId="),
      });

      // Verify organization onboarding was created
      const organizationOnboarding = await prismock.organizationOnboarding.findFirst({
        where: {
          slug: mockInput.slug,
        },
      });

      expect(organizationOnboarding).toBeDefined();
      expect(organizationOnboarding?.name).toBe(mockInput.name);
      expect(organizationOnboarding?.slug).toBe(mockInput.slug);
      expect(organizationOnboarding?.orgOwnerEmail).toBe(mockInput.orgOwnerEmail);
    });

    it("should handle teams and invites in the request", async () => {
      vi.mocked(LicenseKeySingleton.getInstance).mockResolvedValue({
        checkLicense: vi.fn().mockResolvedValue(true),
        incrementUsage: vi.fn().mockResolvedValue(undefined),
      });
      const adminUser = await createTestUser({
        email: "admin@example.com",
        role: UserPermissionRole.ADMIN,
      });

      await createTestUser({
        email: mockInput.orgOwnerEmail,
        completedOnboarding: true,
        emailVerified: new Date(),
      });

      const inputWithTeamsAndInvites = {
        ...mockInput,
        teams: [
          { id: -1, name: "Engineering", isBeingMigrated: false, slug: null },
          { id: -1, name: "Sales", isBeingMigrated: false, slug: null },
        ],
        invitedMembers: [
          { email: "member1@example.com", name: "Member 1" },
          { email: "member2@example.com", name: "Member 2" },
        ],
      };

      const result = await intentToCreateOrgHandler({
        input: inputWithTeamsAndInvites,
        ctx: {
          user: adminUser,
        },
      });

      expect(result.organizationOnboardingId).toBeDefined();

      const organizationOnboarding = await prismock.organizationOnboarding.findFirst({
        where: {
          slug: mockInput.slug,
        },
      });

      expect(organizationOnboarding).toBeDefined();
      expect(organizationOnboarding?.teams).toEqual(inputWithTeamsAndInvites.teams);
      expect(organizationOnboarding?.invitedMembers).toEqual(inputWithTeamsAndInvites.invitedMembers);
    });

    it("should preserve teamName, teamId, and role in invites payload", async () => {
      vi.mocked(LicenseKeySingleton.getInstance).mockResolvedValue({
        checkLicense: vi.fn().mockResolvedValue(true),
        incrementUsage: vi.fn().mockResolvedValue(undefined),
      });
      const adminUser = await createTestUser({
        email: "admin@example.com",
        role: UserPermissionRole.ADMIN,
      });

      await createTestUser({
        email: mockInput.orgOwnerEmail,
        completedOnboarding: true,
        emailVerified: new Date(),
      });

      // This matches the exact payload from the frontend
      const inputWithTeamsAndInvites = {
        ...mockInput,
        teams: [
          { id: -1, name: "New", isBeingMigrated: false, slug: null },
          { id: -1, name: "team", isBeingMigrated: false, slug: null },
        ],
        invitedMembers: [
          { email: "new@new.com", teamName: "new", teamId: -1, role: "ADMIN" },
          { email: "team@new.com", teamName: "team", teamId: -1, role: "ADMIN" },
        ],
      };

      const result = await intentToCreateOrgHandler({
        input: inputWithTeamsAndInvites,
        ctx: {
          user: adminUser,
        },
      });

      expect(result.organizationOnboardingId).toBeDefined();

      const organizationOnboarding = await prismock.organizationOnboarding.findFirst({
        where: {
          slug: mockInput.slug,
        },
      });

      expect(organizationOnboarding).toBeDefined();
      expect(organizationOnboarding?.teams).toEqual(inputWithTeamsAndInvites.teams);

      // Verify invitedMembers are stored with all fields including teamName, teamId, and role
      expect(organizationOnboarding?.invitedMembers).toBeDefined();
      expect(organizationOnboarding?.invitedMembers).toHaveLength(2);

      const invitedMembers = organizationOnboarding?.invitedMembers as any[];
      expect(invitedMembers[0]).toMatchObject({
        email: "new@new.com",
        teamName: "new",
        teamId: -1,
        role: "ADMIN",
      });
      expect(invitedMembers[1]).toMatchObject({
        email: "team@new.com",
        teamName: "team",
        teamId: -1,
        role: "ADMIN",
      });
    });
  });
});
