import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { UserPermissionRole } from "@calcom/prisma/enums";

import { BillingEnabledOnboardingService } from "../BillingEnabledOnboardingService";
import { OrganizationOnboardingFactory } from "../OrganizationOnboardingFactory";
import { SelfHostedOnboardingService } from "../SelfHostedOnboardingService";

const mockRegularUser = {
  id: 1,
  email: "user@example.com",
  role: UserPermissionRole.USER,
  name: "Regular User",
};

const mockAdminUser = {
  id: 2,
  email: "admin@example.com",
  role: UserPermissionRole.ADMIN,
  name: "Admin User",
};

describe("OrganizationOnboardingFactory", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  describe("create", () => {
    it("should return BillingEnabledOnboardingService for regular user when billing is enabled", async () => {
      vi.doMock("@calcom/lib/constants", async (importOriginal) => {
        const actual = await importOriginal<typeof import("@calcom/lib/constants")>();
        return {
          ...actual,
          IS_TEAM_BILLING_ENABLED: true,
        };
      });

      const { OrganizationOnboardingFactory: Factory } = await import("../OrganizationOnboardingFactory");
      const service = Factory.create(mockRegularUser as any);

      expect(service.constructor.name).toBe("BillingEnabledOnboardingService");
    });

    it("should return BillingEnabledOnboardingService for admin on hosted (billing enabled)", async () => {
      vi.doMock("@calcom/lib/constants", async (importOriginal) => {
        const actual = await importOriginal<typeof import("@calcom/lib/constants")>();
        return {
          ...actual,
          IS_TEAM_BILLING_ENABLED: true,
        };
      });

      const { OrganizationOnboardingFactory: Factory } = await import("../OrganizationOnboardingFactory");
      const service = Factory.create(mockAdminUser as any);

      expect(service.constructor.name).toBe("BillingEnabledOnboardingService");
    });

    it("should return SelfHostedOnboardingService for admin when IS_TEAM_BILLING_ENABLED is false", async () => {
      vi.doMock("@calcom/lib/constants", async (importOriginal) => {
        const actual = await importOriginal<typeof import("@calcom/lib/constants")>();
        return {
          ...actual,
          IS_TEAM_BILLING_ENABLED: false,
        };
      });

      const { OrganizationOnboardingFactory: Factory } = await import("../OrganizationOnboardingFactory");
      const service = Factory.create(mockAdminUser as any);

      // Self-hosted admins skip billing
      expect(service.constructor.name).toBe("SelfHostedOnboardingService");
    });

    it("should return BillingEnabledOnboardingService for regular user when IS_TEAM_BILLING_ENABLED is false", async () => {
      vi.doMock("@calcom/lib/constants", async (importOriginal) => {
        const actual = await importOriginal<typeof import("@calcom/lib/constants")>();
        return {
          ...actual,
          IS_TEAM_BILLING_ENABLED: false,
        };
      });

      const { OrganizationOnboardingFactory: Factory } = await import("../OrganizationOnboardingFactory");
      const service = Factory.create(mockRegularUser as any);

      // Non-admins still need billing even on self-hosted
      expect(service.constructor.name).toBe("BillingEnabledOnboardingService");
    });

    it("should return SelfHostedOnboardingService in E2E mode", async () => {
      process.env.NEXT_PUBLIC_IS_E2E = "1";

      vi.doMock("@calcom/lib/constants", async (importOriginal) => {
        const actual = await importOriginal<typeof import("@calcom/lib/constants")>();
        return {
          ...actual,
          IS_TEAM_BILLING_ENABLED: true,
        };
      });

      const { OrganizationOnboardingFactory: Factory } = await import("../OrganizationOnboardingFactory");
      const service = Factory.create(mockAdminUser as any);

      // E2E mode returns false from isBillingEnabled, meaning SelfHosted flow
      expect(service.constructor.name).toBe("SelfHostedOnboardingService");
    });

    it("should return BillingEnabledOnboardingService when billing is enabled for regular user", async () => {
      vi.doMock("@calcom/lib/constants", async (importOriginal) => {
        const actual = await importOriginal<typeof import("@calcom/lib/constants")>();
        return {
          ...actual,
          IS_TEAM_BILLING_ENABLED: true,
        };
      });

      const { OrganizationOnboardingFactory: Factory } = await import("../OrganizationOnboardingFactory");
      const service = Factory.create(mockRegularUser as any);

      expect(service.constructor.name).toBe("BillingEnabledOnboardingService");
    });
  });

  describe("Factory Decision Matrix", () => {
    const testCases = [
      {
        scenario: "Hosted (billing enabled) + Regular User",
        user: mockRegularUser,
        isBillingEnabled: true,
        isE2E: false,
        expected: "BillingEnabled",
      },
      {
        scenario: "Hosted (billing enabled) + Admin User",
        user: mockAdminUser,
        isBillingEnabled: true,
        isE2E: false,
        expected: "BillingEnabled",
      },
      {
        scenario: "Self-hosted (billing disabled) + Regular User",
        user: mockRegularUser,
        isBillingEnabled: false,
        isE2E: false,
        expected: "BillingEnabled", // Non-admins still need billing
      },
      {
        scenario: "Self-hosted (billing disabled) + Admin User",
        user: mockAdminUser,
        isBillingEnabled: false,
        isE2E: false,
        expected: "SelfHosted", // Admins skip billing on self-hosted
      },
      {
        scenario: "E2E mode + Admin User",
        user: mockAdminUser,
        isBillingEnabled: true,
        isE2E: true,
        expected: "SelfHosted", // E2E always uses self-hosted flow
      },
      {
        scenario: "E2E mode + Regular User",
        user: mockRegularUser,
        isBillingEnabled: true,
        isE2E: true,
        expected: "SelfHosted", // E2E always uses self-hosted flow
      },
    ];

    testCases.forEach(({ scenario, user, isBillingEnabled, isE2E, expected }) => {
      it(`${scenario} → ${expected}`, async () => {
        // Setup environment
        if (isE2E) {
          process.env.NEXT_PUBLIC_IS_E2E = "1";
        } else {
          delete process.env.NEXT_PUBLIC_IS_E2E;
        }

        vi.doMock("@calcom/lib/constants", async (importOriginal) => {
          const actual = await importOriginal<typeof import("@calcom/lib/constants")>();
          return {
            ...actual,
            IS_TEAM_BILLING_ENABLED: isBillingEnabled,
          };
        });

        const { OrganizationOnboardingFactory: Factory } = await import(
          "../OrganizationOnboardingFactory"
        );
        const service = Factory.create(user as any);

        if (expected === "BillingEnabled") {
          expect(service.constructor.name).toBe("BillingEnabledOnboardingService");
        } else {
          expect(service.constructor.name).toBe("SelfHostedOnboardingService");
        }
      });
    });
  });
});
