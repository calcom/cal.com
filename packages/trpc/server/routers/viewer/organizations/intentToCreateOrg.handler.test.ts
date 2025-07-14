import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach } from "vitest";

import { LicenseKeySingleton } from "@calcom/ee/common/server/LicenseKeyService";
import { UserPermissionRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import { intentToCreateOrgHandler } from "./intentToCreateOrg.handler";

vi.mock("@calcom/ee/common/server/LicenseKeyService", () => ({
  LicenseKeySingleton: {
    getInstance: vi.fn(),
  },
}));

const mockInput = {
  name: "Test Org",
  slug: "test-org",
  orgOwnerEmail: "test@example.com",
  billingPeriod: "MONTHLY",
  seats: 5,
  pricePerSeat: 20,
  isPlatform: false,
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
    // @ts-expect-error reset is a method on Prismock
    await prismock.reset();
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
      });
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

      // Verify the result shape
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

    it("should throw error when organization onboarding already exists", async () => {
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

      // Create existing organization onboarding
      await prismock.organizationOnboarding.create({
        data: {
          name: mockInput.name,
          slug: mockInput.slug,
          orgOwnerEmail: mockInput.orgOwnerEmail,
          billingPeriod: mockInput.billingPeriod,
          seats: mockInput.seats,
          pricePerSeat: mockInput.pricePerSeat,
          createdById: adminUser.id,
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

      // Verify the result shape
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
  });
});
