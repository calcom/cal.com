import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SubscriptionStatus } from "@calcom/features/ee/billing/repository/billing/IBillingRepository";

import { checkUserHasActivePaidTeamPlan } from "./checkUserHasActivePaidTeamPlan";

const mockFindAllAcceptedTeamMemberships: Mock = vi.fn();
const mockGetSubscriptionStatus: Mock = vi.fn();
const mockInit: Mock = vi.fn();
const mockPlatformBillingFindUnique: Mock = vi.fn();

vi.mock("@calcom/features/membership/repositories/MembershipRepository", () => ({
  MembershipRepository: {
    findAllAcceptedTeamMemberships: (...args: unknown[]) => mockFindAllAcceptedTeamMemberships(...args),
  },
}));

vi.mock("@calcom/features/ee/billing/di/containers/Billing", () => ({
  getTeamBillingServiceFactory: () => ({
    init: (...args: unknown[]) => mockInit(...args),
  }),
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {
    platformBilling: {
      findUnique: (...args: unknown[]) => mockPlatformBillingFindUnique(...args),
    },
  },
}));

vi.mock("@calcom/lib/constants", () => ({
  IS_SELF_HOSTED: false,
}));

describe("checkUserHasActivePaidTeamPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInit.mockReturnValue({
      getSubscriptionStatus: mockGetSubscriptionStatus,
    });
  });

  describe("when user has an active paid team plan", () => {
    beforeEach(() => {
      mockFindAllAcceptedTeamMemberships.mockResolvedValue([
        { id: 1, parentId: null, metadata: null, isOrganization: false, isPlatform: false },
      ]);
      mockGetSubscriptionStatus.mockResolvedValue(SubscriptionStatus.ACTIVE);
    });

    it("should return isActive: true", async () => {
      const result = await checkUserHasActivePaidTeamPlan(1);

      expect(result).toEqual({ isActive: true, isTrial: false });
    });
  });

  describe("when user has a team plan with PAST_DUE status", () => {
    it("should return isActive: true", async () => {
      mockFindAllAcceptedTeamMemberships.mockResolvedValue([
        { id: 1, parentId: null, metadata: null, isOrganization: false, isPlatform: false },
      ]);
      mockGetSubscriptionStatus.mockResolvedValue(SubscriptionStatus.PAST_DUE);

      const result = await checkUserHasActivePaidTeamPlan(1);

      expect(result).toEqual({ isActive: true, isTrial: false });
    });
  });

  describe("when user is on a trial", () => {
    beforeEach(() => {
      mockFindAllAcceptedTeamMemberships.mockResolvedValue([
        { id: 1, parentId: null, metadata: null, isOrganization: false, isPlatform: false },
      ]);
      mockGetSubscriptionStatus.mockResolvedValue(SubscriptionStatus.TRIALING);
    });

    it("should return isActive: false and isTrial: true", async () => {
      const result = await checkUserHasActivePaidTeamPlan(1);

      expect(result).toEqual({ isActive: false, isTrial: true });
    });
  });

  describe("when user does not have any team membership", () => {
    beforeEach(() => {
      mockFindAllAcceptedTeamMemberships.mockResolvedValue([]);
    });

    it("should return isActive: false and isTrial: false", async () => {
      const result = await checkUserHasActivePaidTeamPlan(1);

      expect(result).toEqual({ isActive: false, isTrial: false });
    });
  });

  describe("when user has multiple teams", () => {
    it("should return isActive: true if at least one team has active subscription", async () => {
      mockFindAllAcceptedTeamMemberships.mockResolvedValue([
        { id: 1, parentId: null, metadata: null, isOrganization: false, isPlatform: false },
        { id: 2, parentId: null, metadata: null, isOrganization: false, isPlatform: false },
      ]);
      mockGetSubscriptionStatus.mockResolvedValueOnce(SubscriptionStatus.TRIALING);
      mockGetSubscriptionStatus.mockResolvedValueOnce(SubscriptionStatus.ACTIVE);

      const result = await checkUserHasActivePaidTeamPlan(1);

      expect(result).toEqual({ isActive: true, isTrial: false });
    });

    it("should return isTrial: true if all teams are on trial", async () => {
      mockFindAllAcceptedTeamMemberships.mockResolvedValue([
        { id: 1, parentId: null, metadata: null, isOrganization: false, isPlatform: false },
        { id: 2, parentId: null, metadata: null, isOrganization: false, isPlatform: false },
      ]);
      mockGetSubscriptionStatus.mockResolvedValue(SubscriptionStatus.TRIALING);

      const result = await checkUserHasActivePaidTeamPlan(1);

      expect(result).toEqual({ isActive: false, isTrial: true });
    });
  });

  describe("platform organizations", () => {
    it("should check platform billing for platform organizations", async () => {
      mockFindAllAcceptedTeamMemberships.mockResolvedValue([
        { id: 1, parentId: null, metadata: null, isOrganization: true, isPlatform: true },
      ]);
      mockPlatformBillingFindUnique.mockResolvedValue({ id: 1, plan: "TEAM" });

      const result = await checkUserHasActivePaidTeamPlan(1);

      expect(result).toEqual({ isActive: true, isTrial: false });
      expect(mockPlatformBillingFindUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("should not count free platform billing as active", async () => {
      mockFindAllAcceptedTeamMemberships.mockResolvedValue([
        { id: 1, parentId: null, metadata: null, isOrganization: true, isPlatform: true },
      ]);
      mockPlatformBillingFindUnique.mockResolvedValue({ id: 1, plan: "FREE" });
      mockGetSubscriptionStatus.mockResolvedValue(SubscriptionStatus.TRIALING);

      const result = await checkUserHasActivePaidTeamPlan(1);

      expect(result).toEqual({ isActive: false, isTrial: true });
    });
  });

  describe("ownerOnly option", () => {
    it("should pass ownerOnly filter to findAllAcceptedTeamMemberships", async () => {
      mockFindAllAcceptedTeamMemberships.mockResolvedValue([]);

      await checkUserHasActivePaidTeamPlan(1, { ownerOnly: true });

      expect(mockFindAllAcceptedTeamMemberships).toHaveBeenCalledWith(1, {
        userId: 1,
        accepted: true,
        role: "OWNER",
      });
    });
  });
});
