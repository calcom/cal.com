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

    it("should return BillingEnabledOnboardingService even when IS_TEAM_BILLING_ENABLED is false", async () => {
      vi.doMock("@calcom/lib/constants", async (importOriginal) => {
        const actual = await importOriginal<typeof import("@calcom/lib/constants")>();
        return {
          ...actual,
          IS_TEAM_BILLING_ENABLED: false,
        };
      });

      const { OrganizationOnboardingFactory: Factory } = await import("../OrganizationOnboardingFactory");
      const service = Factory.create(mockAdminUser as any);

      // The factory logic returns billing enabled unless E2E mode is active
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
        scenario: "Billing enabled + Regular User",
        isBillingEnabled: true,
        isE2E: false,
        expected: "BillingEnabled",
      },
      {
        scenario: "Billing enabled + Admin User",
        isBillingEnabled: true,
        isE2E: false,
        expected: "BillingEnabled",
      },
      {
        scenario: "Billing disabled + Regular User (still returns BillingEnabled)",
        isBillingEnabled: false,
        isE2E: false,
        expected: "BillingEnabled", // Factory logic: always billing unless E2E
      },
      {
        scenario: "Billing disabled + Admin User (still returns BillingEnabled)",
        isBillingEnabled: false,
        isE2E: false,
        expected: "BillingEnabled", // Factory logic: always billing unless E2E
      },
      {
        scenario: "E2E mode (overrides billing)",
        isBillingEnabled: true,
        isE2E: true,
        expected: "SelfHosted", // E2E is the only way to get SelfHosted flow
      },
    ];

    testCases.forEach(({ scenario, isBillingEnabled, isE2E, expected }) => {
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
        const service = Factory.create(mockAdminUser as any);

        if (expected === "BillingEnabled") {
          expect(service.constructor.name).toBe("BillingEnabledOnboardingService");
        } else {
          expect(service.constructor.name).toBe("SelfHostedOnboardingService");
        }
      });
    });
  });
});
