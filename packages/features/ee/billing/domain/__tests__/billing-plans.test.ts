import { BILLING_PLANS, PLATFORM_PLANS_MAP } from "@calcom/features/ee/billing/constants";
import type { JsonValue } from "@calcom/types/Json";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BillingPlanService } from "../billing-plans";

// Mock the zod-utils module
vi.mock("@calcom/prisma/zod-utils", () => ({
  teamMetadataStrictSchema: {
    safeParse: vi.fn(),
  },
}));

// Mock the constants module (only PLATFORM_ENTERPRISE_SLUGS needed now)
vi.mock("@calcom/features/ee/billing/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/features/ee/billing/constants")>();
  return {
    ...actual,
    PLATFORM_ENTERPRISE_SLUGS: ["platform-enterprise-1", "platform-enterprise-2"],
  };
});

describe("BillingPlanService", () => {
  let service: BillingPlanService;
  let mockSafeParse: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    service = new BillingPlanService();
    // Get the mocked function and reset it fully (clears mockReturnValue too)
    const { teamMetadataStrictSchema } = await import("@calcom/prisma/zod-utils");
    mockSafeParse = vi.mocked(teamMetadataStrictSchema.safeParse);
    mockSafeParse.mockReset();

    // Default mock return for successful parsing with no subscription
    mockSafeParse.mockReturnValue({
      success: true,
      data: {},
    });
  });

  const createMembership = (
    overrides: {
      team?: Partial<{
        isOrganization: boolean;
        isPlatform: boolean;
        slug: string | null;
        metadata: JsonValue;
        organizationBilling: {
          planName: string;
        } | null;
        parent: {
          isOrganization: boolean;
          slug: string | null;
          isPlatform: boolean;
          metadata: JsonValue;
          organizationBilling: {
            planName: string;
          } | null;
        } | null;
        platformBilling: {
          plan: string;
        } | null;
      }>;
      user?: Partial<{
        isPlatformManaged: boolean;
      }>;
    } = {}
  ) => ({
    team: {
      isOrganization: false,
      isPlatform: false,
      slug: null,
      metadata: {},
      organizationBilling: null,
      parent: null,
      platformBilling: null,
      ...overrides.team,
    },
    user: {
      isPlatformManaged: false,
      ...overrides.user,
    },
  });

  describe("getUserPlanByMemberships", () => {
    it("should return INDIVIDUALS when memberships array is empty", async () => {
      const result = await service.getUserPlanByMemberships([]);
      expect(result).toBe(BILLING_PLANS.INDIVIDUALS);
    });

    describe("platform teams", () => {
      it("should return PLATFORM_ENTERPRISE for platform enterprise slugs", async () => {
        const memberships = [
          createMembership({
            team: { isPlatform: true, slug: "platform-enterprise-1" },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(BILLING_PLANS.PLATFORM_ENTERPRISE);
      });

      it("should return PLATFORM_ENTERPRISE for platform managed users with enterprise slug", async () => {
        const memberships = [
          createMembership({
            team: { slug: "platform-enterprise-2" },
            user: { isPlatformManaged: true },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(BILLING_PLANS.PLATFORM_ENTERPRISE);
      });

      it("should return plan from PLATFORM_PLANS_MAP for platform teams with billing", async () => {
        const memberships = [
          createMembership({
            team: {
              isPlatform: true,
              slug: "regular-platform",
              platformBilling: { plan: "STARTER" },
            },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(PLATFORM_PLANS_MAP.STARTER);
      });

      it("should return raw plan name if not in PLATFORM_PLANS_MAP", async () => {
        const memberships = [
          createMembership({
            team: {
              isPlatform: true,
              slug: "regular-platform",
              platformBilling: { plan: "CUSTOM_PLAN" },
            },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe("CUSTOM_PLAN");
      });

      it("should continue to next membership if platform team has no billing", async () => {
        // For the second (non-platform) membership, safeParse is called twice:
        // once for parent metadata (returns no subscription), once for team metadata (returns subscription)
        mockSafeParse
          .mockReturnValueOnce({ success: true, data: {} }) // parent metadata parse
          .mockReturnValueOnce({ success: true, data: { subscriptionId: "sub_123" } }); // team metadata parse

        const memberships = [
          createMembership({
            team: { isPlatform: true, platformBilling: null },
          }),
          createMembership({
            team: { metadata: { subscriptionId: "sub_123" } },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(BILLING_PLANS.TEAMS);
      });
    });

    describe("parent organization subscriptions", () => {
      it("should return ENTERPRISE for parent org with ENTERPRISE planName on billing table", async () => {
        mockSafeParse.mockReturnValueOnce({
          success: true,
          data: { subscriptionId: "sub_parent123" },
        });

        const memberships = [
          createMembership({
            team: {
              parent: {
                isOrganization: true,
                slug: "some-org",
                isPlatform: false,
                metadata: { subscriptionId: "sub_parent123" },
                organizationBilling: { planName: "ENTERPRISE" },
              },
            },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(BILLING_PLANS.ENTERPRISE);
        expect(mockSafeParse).toHaveBeenCalledWith({ subscriptionId: "sub_parent123" });
      });

      it("should return ORGANIZATIONS for parent org with ORGANIZATION planName on billing table", async () => {
        mockSafeParse.mockReturnValueOnce({
          success: true,
          data: { subscriptionId: "sub_parent456" },
        });

        const memberships = [
          createMembership({
            team: {
              parent: {
                isOrganization: true,
                slug: "regular-org",
                isPlatform: false,
                metadata: { subscriptionId: "sub_parent456" },
                organizationBilling: { planName: "ORGANIZATION" },
              },
            },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(BILLING_PLANS.ORGANIZATIONS);
      });

      it("should return ORGANIZATIONS for parent org with no organizationBilling record", async () => {
        mockSafeParse.mockReturnValueOnce({
          success: true,
          data: { subscriptionId: "sub_parent789" },
        });

        const memberships = [
          createMembership({
            team: {
              parent: {
                isOrganization: true,
                slug: "org-no-billing",
                isPlatform: false,
                metadata: { subscriptionId: "sub_parent789" },
                organizationBilling: null,
              },
            },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(BILLING_PLANS.ORGANIZATIONS);
      });

      it("should skip parent org if it's a platform", async () => {
        mockSafeParse
          .mockReturnValueOnce({
            success: true,
            data: { subscriptionId: "sub_parent123" },
          })
          .mockReturnValueOnce({
            success: true,
            data: { subscriptionId: "sub_team789" },
          });

        const memberships = [
          createMembership({
            team: {
              metadata: { subscriptionId: "sub_team789" },
              parent: {
                isOrganization: true,
                slug: "enterprise-org",
                isPlatform: true, // This should be skipped
                metadata: { subscriptionId: "sub_parent123" },
                organizationBilling: { planName: "ENTERPRISE" },
              },
            },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(BILLING_PLANS.TEAMS);
      });

      it("should skip parent org if metadata parsing fails", async () => {
        mockSafeParse
          .mockReturnValueOnce({
            success: false,
            error: new Error("Invalid metadata"),
          })
          .mockReturnValueOnce({
            success: true,
            data: { subscriptionId: "sub_team123" },
          });

        const memberships = [
          createMembership({
            team: {
              metadata: { subscriptionId: "sub_team123" },
              parent: {
                isOrganization: true,
                slug: "enterprise-org",
                isPlatform: false,
                metadata: { invalid: "metadata" },
                organizationBilling: { planName: "ENTERPRISE" },
              },
            },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(BILLING_PLANS.TEAMS);
      });

      it("should skip parent org if no subscription ID", async () => {
        mockSafeParse
          .mockReturnValueOnce({
            success: true,
            data: { subscriptionId: null },
          })
          .mockReturnValueOnce({
            success: true,
            data: { subscriptionId: "sub_team123" },
          });

        const memberships = [
          createMembership({
            team: {
              metadata: { subscriptionId: "sub_team123" },
              parent: {
                isOrganization: true,
                slug: "enterprise-org",
                isPlatform: false,
                metadata: { subscriptionId: null },
                organizationBilling: { planName: "ENTERPRISE" },
              },
            },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(BILLING_PLANS.TEAMS);
      });
    });

    describe("team organization subscriptions", () => {
      it("should return ENTERPRISE for team org with ENTERPRISE planName on billing table", async () => {
        mockSafeParse
          // Parent metadata parsing (no parent, so empty object gets default empty data)
          .mockReturnValueOnce({
            success: true,
            data: {},
          })
          // Team metadata parsing
          .mockReturnValueOnce({
            success: true,
            data: { subscriptionId: "sub_team123" },
          });

        const memberships = [
          createMembership({
            team: {
              isOrganization: true,
              slug: "some-org",
              metadata: { subscriptionId: "sub_team123" },
              organizationBilling: { planName: "ENTERPRISE" },
            },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(BILLING_PLANS.ENTERPRISE);
      });

      it("should return ORGANIZATIONS for team org with ORGANIZATION planName on billing table", async () => {
        mockSafeParse
          // Parent metadata parsing (no parent)
          .mockReturnValueOnce({
            success: true,
            data: {},
          })
          // Team metadata parsing
          .mockReturnValueOnce({
            success: true,
            data: { subscriptionId: "sub_team456" },
          });

        const memberships = [
          createMembership({
            team: {
              isOrganization: true,
              slug: "regular-team-org",
              metadata: { subscriptionId: "sub_team456" },
              organizationBilling: { planName: "ORGANIZATION" },
            },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(BILLING_PLANS.ORGANIZATIONS);
      });

      it("should return ORGANIZATIONS for team org with no organizationBilling record", async () => {
        mockSafeParse
          .mockReturnValueOnce({
            success: true,
            data: {},
          })
          .mockReturnValueOnce({
            success: true,
            data: { subscriptionId: "sub_team789" },
          });

        const memberships = [
          createMembership({
            team: {
              isOrganization: true,
              slug: "org-no-billing",
              metadata: { subscriptionId: "sub_team789" },
              organizationBilling: null,
            },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(BILLING_PLANS.ORGANIZATIONS);
      });
    });

    describe("regular team subscriptions", () => {
      it("should return TEAMS for team with subscription", async () => {
        mockSafeParse
          // Parent metadata parsing (no parent)
          .mockReturnValueOnce({
            success: true,
            data: {},
          })
          // Team metadata parsing
          .mockReturnValueOnce({
            success: true,
            data: { subscriptionId: "sub_regularteam123" },
          });

        const memberships = [
          createMembership({
            team: {
              isOrganization: false,
              metadata: { subscriptionId: "sub_regularteam123" },
            },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(BILLING_PLANS.TEAMS);
      });

      it("should skip team if metadata parsing fails", async () => {
        mockSafeParse
          .mockReturnValueOnce({
            success: false,
            error: new Error("Invalid metadata"),
          })
          .mockReturnValueOnce({
            success: true,
            data: { subscriptionId: "sub_valid123" },
          });

        const memberships = [
          createMembership({
            team: { metadata: { invalid: "data" } },
          }),
          createMembership({
            team: { metadata: { subscriptionId: "sub_valid123" } },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(BILLING_PLANS.TEAMS);
      });

      it("should skip team if no subscription ID", async () => {
        mockSafeParse
          .mockReturnValueOnce({
            success: true,
            data: { subscriptionId: null },
          })
          .mockReturnValueOnce({
            success: true,
            data: { subscriptionId: "sub_valid123" },
          });

        const memberships = [
          createMembership({
            team: { metadata: { subscriptionId: null } },
          }),
          createMembership({
            team: { metadata: { subscriptionId: "sub_valid123" } },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(BILLING_PLANS.TEAMS);
      });
    });

    describe("priority order", () => {
      it("should prioritize platform enterprise over other plans", async () => {
        const memberships = [
          createMembership({
            team: { isPlatform: true, slug: "platform-enterprise-1" },
          }),
          createMembership({
            team: { metadata: { subscriptionId: "sub_team123" } },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(BILLING_PLANS.PLATFORM_ENTERPRISE);
      });

      it("should prioritize parent org subscription over team subscription", async () => {
        mockSafeParse
          .mockReturnValueOnce({
            success: true,
            data: { subscriptionId: "sub_parent123" },
          })
          .mockReturnValueOnce({
            success: true,
            data: { subscriptionId: "sub_team123" },
          });

        const memberships = [
          createMembership({
            team: {
              metadata: { subscriptionId: "sub_team123" },
              parent: {
                isOrganization: true,
                slug: "enterprise-org",
                isPlatform: false,
                metadata: { subscriptionId: "sub_parent123" },
                organizationBilling: { planName: "ENTERPRISE" },
              },
            },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(BILLING_PLANS.ENTERPRISE);
      });

      it("should process memberships in order and return first match", async () => {
        mockSafeParse
          // First membership - parent metadata (no parent, parses {})
          .mockReturnValueOnce({
            success: true,
            data: {},
          })
          // First membership - team metadata (has subscription → returns TEAMS immediately)
          .mockReturnValueOnce({
            success: true,
            data: { subscriptionId: "sub_123" },
          });
        // Second membership never reached since first match returns early

        const memberships = [
          createMembership({
            team: { metadata: { subscriptionId: "sub_123" } },
          }),
          createMembership({
            team: {
              isOrganization: true,
              slug: "enterprise-org",
              metadata: { subscriptionId: "sub_enterprise" },
              organizationBilling: { planName: "ENTERPRISE" },
            },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(BILLING_PLANS.TEAMS); // First membership wins
      });
    });

    describe("fallback cases", () => {
      it("should return UNKNOWN when no memberships have valid subscriptions", async () => {
        mockSafeParse.mockReturnValue({
          success: true,
          data: { subscriptionId: null },
        });

        const memberships = [
          createMembership({
            team: { metadata: { subscriptionId: null } },
          }),
          createMembership({
            team: { metadata: {} },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(BILLING_PLANS.UNKNOWN);
      });

      it("should return UNKNOWN when all metadata parsing fails", async () => {
        mockSafeParse.mockReturnValue({
          success: false,
          error: new Error("Invalid metadata"),
        });

        const memberships = [
          createMembership({
            team: { metadata: { invalid: "data" } },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(BILLING_PLANS.UNKNOWN);
      });
    });

    describe("edge cases", () => {
      it("should handle null slug values", async () => {
        const memberships = [
          createMembership({
            team: {
              isPlatform: true,
              slug: null,
              platformBilling: { plan: "STARTER" },
            },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(PLATFORM_PLANS_MAP.STARTER);
      });

      it("should handle empty metadata objects", async () => {
        mockSafeParse.mockReturnValueOnce({
          success: true,
          data: {},
        });

        const memberships = [
          createMembership({
            team: { metadata: {} },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(BILLING_PLANS.UNKNOWN);
        expect(mockSafeParse).toHaveBeenCalledWith({});
      });

      it("should handle null parent metadata", async () => {
        mockSafeParse
          .mockReturnValueOnce({
            success: true,
            data: {},
          })
          .mockReturnValueOnce({
            success: true,
            data: { subscriptionId: "sub_123" },
          });

        const memberships = [
          createMembership({
            team: {
              metadata: { subscriptionId: "sub_123" },
              parent: {
                isOrganization: true,
                slug: "enterprise-org",
                isPlatform: false,
                metadata: null as unknown as JsonValue,
                organizationBilling: { planName: "ENTERPRISE" },
              },
            },
          }),
        ];

        const result = await service.getUserPlanByMemberships(memberships);
        expect(result).toBe(BILLING_PLANS.TEAMS);
        expect(mockSafeParse).toHaveBeenNthCalledWith(1, {});
      });
    });
  });
});
