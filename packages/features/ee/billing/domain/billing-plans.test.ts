import { describe, it, expect } from "vitest";

import { BillingPlans } from "@calcom/features/ee/billing/constants";
import { Plans } from "@calcom/prisma/enums";

import { BillingPlanService } from "./billing-plans";

describe("BillingPlanService", () => {
  describe("getUserPlanByMemberships", () => {
    it("should return INDIVIDUALS when no memberships exist", async () => {
      const result = await BillingPlanService.getUserPlanByMemberships([]);
      expect(result).toBe(BillingPlans.INDIVIDUALS);
    });

    it("should return TEAMS plan for regular team membership", async () => {
      const memberships = [
        {
          team: {
            plan: Plans.TEAMS,
            isOrganization: false,
            isPlatform: false,
            parent: null,
            platformBilling: null,
          },
          user: {
            isPlatformManaged: false,
          },
        },
      ];

      const result = await BillingPlanService.getUserPlanByMemberships(memberships);
      expect(result).toBe(Plans.TEAMS);
    });

    it("should return ORGANIZATIONS plan for organization membership", async () => {
      const memberships = [
        {
          team: {
            plan: Plans.ORGANIZATIONS,
            isOrganization: true,
            isPlatform: false,
            parent: null,
            platformBilling: null,
          },
          user: {
            isPlatformManaged: false,
          },
        },
      ];

      const result = await BillingPlanService.getUserPlanByMemberships(memberships);
      expect(result).toBe(Plans.ORGANIZATIONS);
    });

    it("should return ENTERPRISE plan for enterprise membership", async () => {
      const memberships = [
        {
          team: {
            plan: Plans.ENTERPRISE,
            isOrganization: true,
            isPlatform: false,
            parent: null,
            platformBilling: null,
          },
          user: {
            isPlatformManaged: false,
          },
        },
      ];

      const result = await BillingPlanService.getUserPlanByMemberships(memberships);
      expect(result).toBe(Plans.ENTERPRISE);
    });

    it("should return parent plan when team has no plan but parent does", async () => {
      const memberships = [
        {
          team: {
            plan: null,
            isOrganization: false,
            isPlatform: false,
            parent: {
              plan: Plans.ORGANIZATIONS,
              isOrganization: true,
              isPlatform: false,
            },
            platformBilling: null,
          },
          user: {
            isPlatformManaged: false,
          },
        },
      ];

      const result = await BillingPlanService.getUserPlanByMemberships(memberships);
      expect(result).toBe(Plans.ORGANIZATIONS);
    });

    it("should return PLATFORM_STARTER for platform team with FREE plan", async () => {
      const memberships = [
        {
          team: {
            plan: null,
            isOrganization: false,
            isPlatform: true,
            parent: null,
            platformBilling: {
              plan: "FREE",
            },
          },
          user: {
            isPlatformManaged: false,
          },
        },
      ];

      const result = await BillingPlanService.getUserPlanByMemberships(memberships);
      expect(result).toBe(BillingPlans.PLATFORM_STARTER);
    });

    it("should return PLATFORM_STARTER for platform team with STARTER plan", async () => {
      const memberships = [
        {
          team: {
            plan: null,
            isOrganization: false,
            isPlatform: true,
            parent: null,
            platformBilling: {
              plan: "STARTER",
            },
          },
          user: {
            isPlatformManaged: false,
          },
        },
      ];

      const result = await BillingPlanService.getUserPlanByMemberships(memberships);
      expect(result).toBe(BillingPlans.PLATFORM_STARTER);
    });

    it("should return PLATFORM_ESSENTIALS for platform team with ESSENTIALS plan", async () => {
      const memberships = [
        {
          team: {
            plan: null,
            isOrganization: false,
            isPlatform: true,
            parent: null,
            platformBilling: {
              plan: "ESSENTIALS",
            },
          },
          user: {
            isPlatformManaged: false,
          },
        },
      ];

      const result = await BillingPlanService.getUserPlanByMemberships(memberships);
      expect(result).toBe(BillingPlans.PLATFORM_ESSENTIALS);
    });

    it("should return PLATFORM_SCALE for platform team with SCALE plan", async () => {
      const memberships = [
        {
          team: {
            plan: null,
            isOrganization: false,
            isPlatform: true,
            parent: null,
            platformBilling: {
              plan: "SCALE",
            },
          },
          user: {
            isPlatformManaged: false,
          },
        },
      ];

      const result = await BillingPlanService.getUserPlanByMemberships(memberships);
      expect(result).toBe(BillingPlans.PLATFORM_SCALE);
    });

    it("should return PLATFORM_ENTERPRISE for platform team with ENTERPRISE plan", async () => {
      const memberships = [
        {
          team: {
            plan: null,
            isOrganization: false,
            isPlatform: true,
            parent: null,
            platformBilling: {
              plan: "ENTERPRISE",
            },
          },
          user: {
            isPlatformManaged: false,
          },
        },
      ];

      const result = await BillingPlanService.getUserPlanByMemberships(memberships);
      expect(result).toBe(BillingPlans.PLATFORM_ENTERPRISE);
    });

    it("should return platform plan string for unknown platform plan", async () => {
      const memberships = [
        {
          team: {
            plan: null,
            isOrganization: false,
            isPlatform: true,
            parent: null,
            platformBilling: {
              plan: "CUSTOM_PLAN",
            },
          },
          user: {
            isPlatformManaged: false,
          },
        },
      ];

      const result = await BillingPlanService.getUserPlanByMemberships(memberships);
      expect(result).toBe("CUSTOM_PLAN");
    });

    it("should handle platform managed user correctly", async () => {
      const memberships = [
        {
          team: {
            plan: Plans.TEAMS,
            isOrganization: false,
            isPlatform: false,
            parent: null,
            platformBilling: {
              plan: "ESSENTIALS",
            },
          },
          user: {
            isPlatformManaged: true,
          },
        },
      ];

      const result = await BillingPlanService.getUserPlanByMemberships(memberships);
      expect(result).toBe(BillingPlans.PLATFORM_ESSENTIALS);
    });

    it("should skip platform teams without platformBilling and continue to next membership", async () => {
      const memberships = [
        {
          team: {
            plan: null,
            isOrganization: false,
            isPlatform: true,
            parent: null,
            platformBilling: null,
          },
          user: {
            isPlatformManaged: false,
          },
        },
        {
          team: {
            plan: Plans.TEAMS,
            isOrganization: false,
            isPlatform: false,
            parent: null,
            platformBilling: null,
          },
          user: {
            isPlatformManaged: false,
          },
        },
      ];

      const result = await BillingPlanService.getUserPlanByMemberships(memberships);
      expect(result).toBe(Plans.TEAMS);
    });

    it("should return UNKNOWN when no valid plan is found", async () => {
      const memberships = [
        {
          team: {
            plan: null,
            isOrganization: false,
            isPlatform: false,
            parent: null,
            platformBilling: null,
          },
          user: {
            isPlatformManaged: false,
          },
        },
      ];

      const result = await BillingPlanService.getUserPlanByMemberships(memberships);
      expect(result).toBe(BillingPlans.UNKNOWN);
    });

    it("should prioritize platform billing over self-serve plans", async () => {
      const memberships = [
        {
          team: {
            plan: Plans.TEAMS,
            isOrganization: false,
            isPlatform: true,
            parent: null,
            platformBilling: {
              plan: "SCALE",
            },
          },
          user: {
            isPlatformManaged: false,
          },
        },
      ];

      const result = await BillingPlanService.getUserPlanByMemberships(memberships);
      expect(result).toBe(BillingPlans.PLATFORM_SCALE);
    });

    it("should return first valid plan found in multiple memberships", async () => {
      const memberships = [
        {
          team: {
            plan: null,
            isOrganization: false,
            isPlatform: false,
            parent: null,
            platformBilling: null,
          },
          user: {
            isPlatformManaged: false,
          },
        },
        {
          team: {
            plan: Plans.ORGANIZATIONS,
            isOrganization: true,
            isPlatform: false,
            parent: null,
            platformBilling: null,
          },
          user: {
            isPlatformManaged: false,
          },
        },
        {
          team: {
            plan: Plans.TEAMS,
            isOrganization: false,
            isPlatform: false,
            parent: null,
            platformBilling: null,
          },
          user: {
            isPlatformManaged: false,
          },
        },
      ];

      const result = await BillingPlanService.getUserPlanByMemberships(memberships);
      expect(result).toBe(Plans.ORGANIZATIONS);
    });
  });
});
