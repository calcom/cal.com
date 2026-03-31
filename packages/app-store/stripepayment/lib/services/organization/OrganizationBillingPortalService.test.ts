// biome-ignore lint/style/noRestrictedImports: test file
import { getTeamRepository } from "@calcom/features/di/containers/TeamRepository";
// biome-ignore lint/style/noRestrictedImports: test file
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as subscriptionsModule from "../../subscriptions";
import { OrganizationBillingPortalService } from "./OrganizationBillingPortalService";

vi.mock("@calcom/features/pbac/services/permission-check.service");
vi.mock("@calcom/features/di/containers/TeamRepository");
vi.mock("../../subscriptions");
vi.mock("../../server");
vi.mock("@calcom/prisma", () => ({ default: {} }));

const mockGetTeamRepository = vi.mocked(getTeamRepository);
const mockGetSubscriptionFromId = vi.mocked(subscriptionsModule.getSubscriptionFromId);

describe("OrganizationBillingPortalService", () => {
  let service: OrganizationBillingPortalService;
  let mockFindByIdIncludeBilling: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(PermissionCheckService).mockImplementation(function () {
      return {
        checkPermission: vi.fn().mockResolvedValue(true),
      } as unknown as PermissionCheckService;
    });

    mockFindByIdIncludeBilling = vi.fn();
    mockGetTeamRepository.mockReturnValue({
      findByIdIncludeBilling: mockFindByIdIncludeBilling,
    } as never);

    service = new OrganizationBillingPortalService();
  });

  describe("getCustomerId", () => {
    it("should return null when team is not found", async () => {
      mockFindByIdIncludeBilling.mockResolvedValue(null);

      const result = await service.getCustomerId(1);

      expect(result).toBeNull();
    });

    it("should return customer ID from organizationBilling subscription for non-platform orgs", async () => {
      mockFindByIdIncludeBilling.mockResolvedValue({
        id: 1,
        isPlatform: false,
        metadata: {},
        teamBilling: null,
        organizationBilling: { subscriptionId: "sub_org_123" },
        platformBilling: null,
      });
      mockGetSubscriptionFromId.mockResolvedValue({
        customer: "cus_org_456",
      } as never);

      const result = await service.getCustomerId(1);

      expect(mockGetSubscriptionFromId).toHaveBeenCalledWith("sub_org_123");
      expect(result).toBe("cus_org_456");
    });

    it("should return null when non-platform org has no organizationBilling", async () => {
      mockFindByIdIncludeBilling.mockResolvedValue({
        id: 1,
        isPlatform: false,
        metadata: {},
        teamBilling: null,
        organizationBilling: null,
        platformBilling: null,
      });

      const result = await service.getCustomerId(1);

      expect(result).toBeNull();
      expect(mockGetSubscriptionFromId).not.toHaveBeenCalled();
    });

    it("should return customer ID from platformBilling for platform orgs", async () => {
      mockFindByIdIncludeBilling.mockResolvedValue({
        id: 1,
        isPlatform: true,
        metadata: {},
        teamBilling: null,
        organizationBilling: null,
        platformBilling: { subscriptionId: "sub_platform_123" },
      });
      mockGetSubscriptionFromId.mockResolvedValue({
        customer: "cus_platform_456",
      } as never);

      const result = await service.getCustomerId(1);

      expect(mockGetSubscriptionFromId).toHaveBeenCalledWith("sub_platform_123");
      expect(result).toBe("cus_platform_456");
    });

    it("should return null when platform org has no platformBilling subscriptionId", async () => {
      mockFindByIdIncludeBilling.mockResolvedValue({
        id: 1,
        isPlatform: true,
        metadata: {},
        teamBilling: null,
        organizationBilling: null,
        platformBilling: null,
      });

      const result = await service.getCustomerId(1);

      expect(result).toBeNull();
      expect(mockGetSubscriptionFromId).not.toHaveBeenCalled();
    });

    it("should return null when subscription has no customer", async () => {
      mockFindByIdIncludeBilling.mockResolvedValue({
        id: 1,
        isPlatform: false,
        metadata: {},
        teamBilling: null,
        organizationBilling: { subscriptionId: "sub_org_123" },
        platformBilling: null,
      });
      mockGetSubscriptionFromId.mockResolvedValue({
        customer: null,
      } as never);

      const result = await service.getCustomerId(1);

      expect(result).toBeNull();
    });

    it("should return null when subscription retrieval fails", async () => {
      mockFindByIdIncludeBilling.mockResolvedValue({
        id: 1,
        isPlatform: false,
        metadata: {},
        teamBilling: null,
        organizationBilling: { subscriptionId: "sub_org_123" },
        platformBilling: null,
      });
      mockGetSubscriptionFromId.mockRejectedValue(new Error("Stripe error"));

      const result = await service.getCustomerId(1);

      expect(result).toBeNull();
    });
  });
});
