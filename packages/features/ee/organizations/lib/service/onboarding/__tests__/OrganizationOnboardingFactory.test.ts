import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { UserPermissionRole } from "@calcom/prisma/enums";

// Use a mutable ref so tests can change the value without re-importing the module
const billingEnabledRef = { value: true };

vi.mock("@calcom/lib/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/lib/constants")>();
  return {
    ...actual,
    get IS_TEAM_BILLING_ENABLED() {
      return billingEnabledRef.value;
    },
  };
});

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

// Import once — the getter on IS_TEAM_BILLING_ENABLED lets us change its value per-test
const { OrganizationOnboardingFactory: Factory } = await import("../OrganizationOnboardingFactory");

describe("OrganizationOnboardingFactory", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();
    // Default to billing enabled
    billingEnabledRef.value = true;
    delete process.env.NEXT_PUBLIC_IS_E2E;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("create", () => {
    it("should return BillingEnabledOrgOnboardingService for regular user when billing is enabled", () => {
      billingEnabledRef.value = true;

      const service = Factory.create(mockRegularUser as any);

      expect(service.constructor.name).toBe("BillingEnabledOrgOnboardingService");
    });

    it("should return BillingEnabledOrgOnboardingService for admin on hosted (billing enabled)", () => {
      billingEnabledRef.value = true;

      const service = Factory.create(mockAdminUser as any);

      expect(service.constructor.name).toBe("BillingEnabledOrgOnboardingService");
    });

    it("should return SelfHostedOrganizationOnboardingService for admin when IS_TEAM_BILLING_ENABLED is false", () => {
      billingEnabledRef.value = false;

      const service = Factory.create(mockAdminUser as any);

      // Self-hosted admins skip billing
      expect(service.constructor.name).toBe("SelfHostedOrganizationOnboardingService");
    });

    it("should return SelfHostedOrganizationOnboardingService for regular user when IS_TEAM_BILLING_ENABLED is false", () => {
      billingEnabledRef.value = false;

      const service = Factory.create(mockRegularUser as any);

      // When billing is disabled, everyone uses self-hosted flow
      expect(service.constructor.name).toBe("SelfHostedOrganizationOnboardingService");
    });

    it("should return SelfHostedOrganizationOnboardingService in E2E mode", () => {
      process.env.NEXT_PUBLIC_IS_E2E = "1";
      billingEnabledRef.value = true;

      const service = Factory.create(mockAdminUser as any);

      // E2E mode returns false from isBillingEnabled, meaning SelfHosted flow
      expect(service.constructor.name).toBe("SelfHostedOrganizationOnboardingService");
    });

    it("should return BillingEnabledOrgOnboardingService when billing is enabled for regular user", () => {
      billingEnabledRef.value = true;

      const service = Factory.create(mockRegularUser as any);

      expect(service.constructor.name).toBe("BillingEnabledOrgOnboardingService");
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
        expected: "SelfHosted", // Everyone uses self-hosted when billing disabled
      },
      {
        scenario: "Self-hosted (billing disabled) + Admin User",
        user: mockAdminUser,
        isBillingEnabled: false,
        isE2E: false,
        expected: "SelfHosted", // Everyone uses self-hosted when billing disabled
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
      it(`${scenario} → ${expected}`, () => {
        // Setup environment
        if (isE2E) {
          process.env.NEXT_PUBLIC_IS_E2E = "1";
        } else {
          delete process.env.NEXT_PUBLIC_IS_E2E;
        }

        billingEnabledRef.value = isBillingEnabled;

        const service = Factory.create(user as any);

        if (expected === "BillingEnabled") {
          expect(service.constructor.name).toBe("BillingEnabledOrgOnboardingService");
        } else {
          expect(service.constructor.name).toBe("SelfHostedOrganizationOnboardingService");
        }
      });
    });
  });
});
