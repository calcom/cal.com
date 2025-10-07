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
  let originalIsSelfHosted: boolean;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Store original IS_SELF_HOSTED value
    const constants = require("@calcom/lib/constants");
    originalIsSelfHosted = constants.IS_SELF_HOSTED;
  });

  afterEach(() => {
    process.env = originalEnv;
    // Restore original IS_SELF_HOSTED
    const constants = require("@calcom/lib/constants");
    Object.defineProperty(constants, "IS_SELF_HOSTED", {
      value: originalIsSelfHosted,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  describe("create", () => {
    it("should return BillingEnabledOnboardingService for regular user", () => {
      const service = OrganizationOnboardingFactory.create(mockRegularUser as any);

      expect(service).toBeInstanceOf(BillingEnabledOnboardingService);
    });

    it("should return BillingEnabledOnboardingService for admin on hosted", () => {
      // Mock IS_SELF_HOSTED = false (hosted environment)
      vi.doMock("@calcom/lib/constants", () => ({
        IS_SELF_HOSTED: false,
      }));

      const service = OrganizationOnboardingFactory.create(mockAdminUser as any);

      expect(service).toBeInstanceOf(BillingEnabledOnboardingService);
    });

    it("should return SelfHostedOnboardingService for admin on self-hosted", () => {
      // Mock IS_SELF_HOSTED = true
      vi.doMock("@calcom/lib/constants", () => ({
        IS_SELF_HOSTED: true,
      }));

      const service = OrganizationOnboardingFactory.create(mockAdminUser as any);

      expect(service).toBeInstanceOf(SelfHostedOnboardingService);
    });

    it("should return BillingEnabledOnboardingService in E2E mode", () => {
      // Mock E2E mode
      process.env.NEXT_PUBLIC_IS_E2E = "1";

      // Mock IS_SELF_HOSTED = true
      vi.doMock("@calcom/lib/constants", () => ({
        IS_SELF_HOSTED: true,
      }));

      const service = OrganizationOnboardingFactory.create(mockAdminUser as any);

      // Even though self-hosted and admin, E2E mode should use billing flow
      expect(service).toBeInstanceOf(BillingEnabledOnboardingService);
    });

    it("should return SelfHostedOnboardingService for regular user on self-hosted", () => {
      // Even regular users get self-hosted flow if IS_SELF_HOSTED is true
      // (though they wouldn't pass auth checks in handler)
      vi.doMock("@calcom/lib/constants", () => ({
        IS_SELF_HOSTED: true,
      }));

      const service = OrganizationOnboardingFactory.create(mockRegularUser as any);

      // Regular user on self-hosted still gets billing flow (admin required for self-hosted)
      expect(service).toBeInstanceOf(BillingEnabledOnboardingService);
    });
  });

  describe("Factory Decision Matrix", () => {
    const testCases = [
      {
        scenario: "Hosted + Regular User",
        isSelfHosted: false,
        isAdmin: false,
        isE2E: false,
        expected: "BillingEnabled",
      },
      {
        scenario: "Hosted + Admin User",
        isSelfHosted: false,
        isAdmin: true,
        isE2E: false,
        expected: "BillingEnabled",
      },
      {
        scenario: "Self-Hosted + Regular User",
        isSelfHosted: true,
        isAdmin: false,
        isE2E: false,
        expected: "BillingEnabled", // Only admins skip billing
      },
      {
        scenario: "Self-Hosted + Admin User",
        isSelfHosted: true,
        isAdmin: true,
        isE2E: false,
        expected: "SelfHosted",
      },
      {
        scenario: "Self-Hosted + Admin User + E2E",
        isSelfHosted: true,
        isAdmin: true,
        isE2E: true,
        expected: "BillingEnabled", // E2E overrides self-hosted
      },
    ];

    testCases.forEach(({ scenario, isSelfHosted, isAdmin, isE2E, expected }) => {
      it(`${scenario} → ${expected}`, () => {
        // Setup environment
        if (isE2E) {
          process.env.NEXT_PUBLIC_IS_E2E = "1";
        }

        vi.doMock("@calcom/lib/constants", () => ({
          IS_SELF_HOSTED: isSelfHosted,
        }));

        const user = isAdmin ? mockAdminUser : mockRegularUser;
        const service = OrganizationOnboardingFactory.create(user as any);

        if (expected === "BillingEnabled") {
          expect(service).toBeInstanceOf(BillingEnabledOnboardingService);
        } else {
          expect(service).toBeInstanceOf(SelfHostedOnboardingService);
        }
      });
    });
  });
});
