import { prisma } from "@calcom/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BillingPeriodRepository } from "../../../repository/billingPeriod/BillingPeriodRepository";
import { BillingPeriodService } from "../BillingPeriodService";

vi.mock("@calcom/prisma", () => ({
  prisma: {
    team: {
      findUnique: vi.fn(),
    },
    teamBilling: {
      update: vi.fn(),
    },
    organizationBilling: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

const mockFeaturesRepository = {
  checkIfFeatureIsEnabledGlobally: vi.fn(),
};

vi.mock("@calcom/features/di/containers/FeatureRepository", () => ({
  getFeatureRepository: () => mockFeaturesRepository,
}));

vi.mock("@calcom/features/ee/billing/constants", () => ({
  BILLING_PLANS: {
    TEAMS: "TEAMS",
    ORGANIZATIONS: "ORGANIZATIONS",
  },
  BILLING_PRICING: {
    TEAMS: { monthly: 1600, annual: 1200 },
    ORGANIZATIONS: { monthly: 3700, annual: 2800 },
  },
}));

const mockBillingProviderService = {
  updateSubscriptionPrice: vi.fn(),
};

describe("BillingPeriodService", () => {
  let service: BillingPeriodService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFeaturesRepository.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
    service = new BillingPeriodService({
      featuresRepository: mockFeaturesRepository as any,
    });
  });

  describe("isAnnualPlan", () => {
    it("should return true for annual plans", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: 1,
        isOrganization: false,
        teamBilling: {
          id: 1,
          billingPeriod: "ANNUALLY",
          subscriptionStart: new Date(),
          subscriptionEnd: new Date(),
          subscriptionTrialEnd: null,
          pricePerSeat: 10000,
          paidSeats: 5,
          subscriptionId: "sub_123",
        },
        organizationBilling: null,
      } as any);

      const result = await service.isAnnualPlan(1);
      expect(result).toBe(true);
    });

    it("should return false for monthly plans", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: 1,
        isOrganization: false,
        teamBilling: {
          id: 1,
          billingPeriod: "MONTHLY",
          subscriptionStart: new Date(),
          subscriptionEnd: new Date(),
          subscriptionTrialEnd: null,
          pricePerSeat: 10000,
          paidSeats: 5,
          subscriptionId: "sub_123",
        },
        organizationBilling: null,
      } as any);

      const result = await service.isAnnualPlan(1);
      expect(result).toBe(false);
    });

    it("should return false when no billing record exists", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: 1,
        isOrganization: false,
        teamBilling: null,
        organizationBilling: null,
      } as any);

      const result = await service.isAnnualPlan(1);
      expect(result).toBe(false);
    });
  });

  describe("isInTrialPeriod", () => {
    it("should return true when trial end is in the future", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 days in future

      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: 1,
        isOrganization: false,
        teamBilling: {
          id: 1,
          billingPeriod: "ANNUALLY",
          subscriptionStart: new Date(),
          subscriptionEnd: new Date(),
          subscriptionTrialEnd: futureDate,
          pricePerSeat: 10000,
          paidSeats: 5,
          subscriptionId: "sub_123",
        },
        organizationBilling: null,
      } as any);

      const result = await service.isInTrialPeriod(1);
      expect(result).toBe(true);
    });

    it("should return false when trial end is in the past", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7); // 7 days in past

      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: 1,
        isOrganization: false,
        teamBilling: {
          id: 1,
          billingPeriod: "ANNUALLY",
          subscriptionStart: new Date(),
          subscriptionEnd: new Date(),
          subscriptionTrialEnd: pastDate,
          pricePerSeat: 10000,
          paidSeats: 5,
          subscriptionId: "sub_123",
        },
        organizationBilling: null,
      } as any);

      const result = await service.isInTrialPeriod(1);
      expect(result).toBe(false);
    });

    it("should return false when no trial end date", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: 1,
        isOrganization: false,
        teamBilling: {
          id: 1,
          billingPeriod: "ANNUALLY",
          subscriptionStart: new Date(),
          subscriptionEnd: new Date(),
          subscriptionTrialEnd: null,
          pricePerSeat: 10000,
          paidSeats: 5,
          subscriptionId: "sub_123",
        },
        organizationBilling: null,
      } as any);

      const result = await service.isInTrialPeriod(1);
      expect(result).toBe(false);
    });
  });

  describe("shouldApplyMonthlyProration", () => {
    it("should return true for annual plan not in trial with active subscription", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: 1,
        isOrganization: false,
        teamBilling: {
          id: 1,
          billingPeriod: "ANNUALLY",
          subscriptionStart: new Date(),
          subscriptionEnd: new Date(),
          subscriptionTrialEnd: null,
          pricePerSeat: 10000,
          paidSeats: 5,
          subscriptionId: "sub_123",
        },
        organizationBilling: null,
      } as any);

      const result = await service.shouldApplyMonthlyProration(1);
      expect(result).toBe(true);
    });

    it("should return false for monthly plans", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: 1,
        isOrganization: false,
        teamBilling: {
          id: 1,
          billingPeriod: "MONTHLY",
          subscriptionStart: new Date(),
          subscriptionEnd: new Date(),
          subscriptionTrialEnd: null,
          pricePerSeat: 10000,
          paidSeats: 5,
          subscriptionId: "sub_123",
        },
        organizationBilling: null,
      } as any);

      const result = await service.shouldApplyMonthlyProration(1);
      expect(result).toBe(false);
    });

    it("should return false when in trial period", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: 1,
        isOrganization: false,
        teamBilling: {
          id: 1,
          billingPeriod: "ANNUALLY",
          subscriptionStart: new Date(),
          subscriptionEnd: new Date(),
          subscriptionTrialEnd: futureDate,
          pricePerSeat: 10000,
          paidSeats: 5,
          subscriptionId: "sub_123",
        },
        organizationBilling: null,
      } as any);

      const result = await service.shouldApplyMonthlyProration(1);
      expect(result).toBe(false);
    });

    it("should return false when no subscription exists", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: 1,
        isOrganization: false,
        teamBilling: null,
        organizationBilling: null,
      } as any);

      const result = await service.shouldApplyMonthlyProration(1);
      expect(result).toBe(false);
    });

    it("should return false on error", async () => {
      vi.mocked(prisma.team.findUnique).mockRejectedValue(new Error("Database error"));

      const result = await service.shouldApplyMonthlyProration(1);
      expect(result).toBe(false);
    });
  });

  describe("getBillingPeriodInfo", () => {
    it("should return complete billing info for team", async () => {
      const subscriptionStart = new Date("2026-01-01");
      const subscriptionEnd = new Date("2027-01-01");

      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: 1,
        isOrganization: false,
        teamBilling: {
          id: 1,
          billingPeriod: "ANNUALLY",
          billingMode: "SEATS",
          subscriptionStart,
          subscriptionEnd,
          subscriptionTrialEnd: null,
          pricePerSeat: 10000,
          paidSeats: 5,
          subscriptionId: "sub_123",
        },
        organizationBilling: null,
      } as any);

      const result = await service.getBillingPeriodInfo(1);

      expect(result).toEqual({
        billingPeriod: "ANNUALLY",
        billingMode: "SEATS",
        subscriptionStart,
        subscriptionEnd,
        trialEnd: null,
        isInTrial: false,
        pricePerSeat: 10000,
        minSeats: undefined,
        isOrganization: false,
      });
    });

    it("should use organizationBilling for organizations", async () => {
      const subscriptionStart = new Date("2026-01-01");

      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: 1,
        isOrganization: true,
        teamBilling: null,
        organizationBilling: {
          id: 1,
          billingPeriod: "ANNUALLY",
          subscriptionStart,
          subscriptionEnd: new Date("2027-01-01"),
          subscriptionTrialEnd: null,
          pricePerSeat: 20000,
          paidSeats: 10,
          subscriptionId: "sub_456",
        },
      } as any);

      const result = await service.getBillingPeriodInfo(1);

      expect(result.pricePerSeat).toBe(20000);
      expect(result.isOrganization).toBe(true);
    });

    it("should return null values when no billing record", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: 1,
        isOrganization: false,
        teamBilling: null,
        organizationBilling: null,
      } as any);

      const result = await service.getBillingPeriodInfo(1);

      expect(result).toEqual({
        billingPeriod: null,
        billingMode: null,
        subscriptionStart: null,
        subscriptionEnd: null,
        trialEnd: null,
        isInTrial: false,
        pricePerSeat: null,
        minSeats: null,
        isOrganization: false,
      });
    });

    it("should throw error when team not found", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue(null);

      await expect(service.getBillingPeriodInfo(999)).rejects.toThrow("Team 999 not found");
    });
  });

  describe("updateBillingPeriod", () => {
    it("should update team billing for non-organization teams", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: 1,
        isOrganization: false,
        teamBilling: { id: "team-billing-123" },
        organizationBilling: null,
      } as any);

      vi.mocked(prisma.teamBilling.update).mockResolvedValue({} as any);

      await service.updateBillingPeriod({
        teamId: 1,
        billingPeriod: "ANNUALLY",
        pricePerSeat: 10000,
      });

      expect(prisma.teamBilling.update).toHaveBeenCalledWith({
        where: { id: "team-billing-123" },
        data: {
          billingPeriod: "ANNUALLY",
          pricePerSeat: 10000,
        },
      });
    });

    it("should update organization billing for organizations", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: 1,
        isOrganization: true,
        teamBilling: null,
        organizationBilling: { id: "org-billing-456" },
      } as any);

      vi.mocked(prisma.organizationBilling.update).mockResolvedValue({} as any);

      await service.updateBillingPeriod({
        teamId: 1,
        billingPeriod: "MONTHLY",
        pricePerSeat: 5000,
      });

      expect(prisma.organizationBilling.update).toHaveBeenCalledWith({
        where: { id: "org-billing-456" },
        data: {
          billingPeriod: "MONTHLY",
          pricePerSeat: 5000,
        },
      });
    });

    it("should throw error when team not found", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue(null);

      await expect(
        service.updateBillingPeriod({
          teamId: 999,
          billingPeriod: "ANNUALLY",
          pricePerSeat: 10000,
        })
      ).rejects.toThrow("Team 999 not found");
    });

    it("should throw error when no billing record exists", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: 1,
        isOrganization: false,
        teamBilling: null,
        organizationBilling: null,
      } as any);

      await expect(
        service.updateBillingPeriod({
          teamId: 1,
          billingPeriod: "ANNUALLY",
          pricePerSeat: 10000,
        })
      ).rejects.toThrow("No billing record found for team 1");
    });
  });

  describe("canSwitchToMonthly", () => {
    let serviceWithMockRepo: BillingPeriodService;
    const mockRepository = {
      getTeamWithBillingInfo: vi.fn(),
      getTeamForBillingUpdate: vi.fn(),
      updateTeamBillingPeriod: vi.fn(),
      updateOrganizationBillingPeriod: vi.fn(),
      findBillingPeriodByTeamId: vi.fn(),
    };

    beforeEach(() => {
      serviceWithMockRepo = new BillingPeriodService({
        repository: mockRepository as unknown as BillingPeriodRepository,
        featuresRepository: mockFeaturesRepository as any,
        billingProviderService: mockBillingProviderService as any,
      });
    });

    it("should return allowed=true when within 30-day window of subscription end", async () => {
      const subscriptionEnd = new Date();
      subscriptionEnd.setDate(subscriptionEnd.getDate() + 15);

      mockRepository.getTeamWithBillingInfo.mockResolvedValue({
        isOrganization: false,
        billing: {
          id: "billing-1",
          billingPeriod: "ANNUALLY",
          subscriptionEnd,
          subscriptionId: "sub_123",
          subscriptionItemId: "si_123",
          subscriptionStart: new Date(),
          subscriptionTrialEnd: null,
          pricePerSeat: 1200,
          paidSeats: 5,
        },
      });

      const result = await serviceWithMockRepo.canSwitchToMonthly(1);
      expect(result.allowed).toBe(true);
      expect(result.switchDate).toEqual(subscriptionEnd);
    });

    it("should return allowed=false when outside 30-day window", async () => {
      const subscriptionEnd = new Date();
      subscriptionEnd.setDate(subscriptionEnd.getDate() + 60);

      mockRepository.getTeamWithBillingInfo.mockResolvedValue({
        isOrganization: false,
        billing: {
          id: "billing-1",
          billingPeriod: "ANNUALLY",
          subscriptionEnd,
          subscriptionId: "sub_123",
          subscriptionItemId: "si_123",
          subscriptionStart: new Date(),
          subscriptionTrialEnd: null,
          pricePerSeat: 1200,
          paidSeats: 5,
        },
      });

      const result = await serviceWithMockRepo.canSwitchToMonthly(1);
      expect(result.allowed).toBe(false);
    });

    it("should return allowed=false when already on monthly billing", async () => {
      mockRepository.getTeamWithBillingInfo.mockResolvedValue({
        isOrganization: false,
        billing: {
          id: "billing-1",
          billingPeriod: "MONTHLY",
          subscriptionEnd: new Date(),
          subscriptionId: "sub_123",
          subscriptionItemId: "si_123",
          subscriptionStart: new Date(),
          subscriptionTrialEnd: null,
          pricePerSeat: 1600,
          paidSeats: 5,
        },
      });

      const result = await serviceWithMockRepo.canSwitchToMonthly(1);
      expect(result.allowed).toBe(false);
    });

    it("should return allowed=false when no billing record", async () => {
      mockRepository.getTeamWithBillingInfo.mockResolvedValue({ isOrganization: false, billing: null });

      const result = await serviceWithMockRepo.canSwitchToMonthly(1);
      expect(result.allowed).toBe(false);
    });
  });

  describe("switchBillingPeriod", () => {
    let serviceWithMockRepo: BillingPeriodService;
    const mockRepository = {
      getTeamWithBillingInfo: vi.fn(),
      getTeamForBillingUpdate: vi.fn(),
      updateTeamBillingPeriod: vi.fn(),
      updateOrganizationBillingPeriod: vi.fn(),
      findBillingPeriodByTeamId: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
      mockBillingProviderService.updateSubscriptionPrice.mockResolvedValue(undefined);
      serviceWithMockRepo = new BillingPeriodService({
        repository: mockRepository as unknown as BillingPeriodRepository,
        featuresRepository: mockFeaturesRepository as any,
        billingProviderService: mockBillingProviderService as any,
      });
    });

    it("should switch from monthly to annual immediately with proration", async () => {
      mockRepository.getTeamWithBillingInfo.mockResolvedValue({
        isOrganization: false,
        billing: {
          id: "billing-1",
          billingPeriod: "MONTHLY",
          subscriptionId: "sub_123",
          subscriptionItemId: "si_123",
          subscriptionEnd: new Date(),
          subscriptionStart: new Date(),
          subscriptionTrialEnd: null,
          pricePerSeat: 1600,
          paidSeats: 5,
        },
      });
      mockRepository.getTeamForBillingUpdate.mockResolvedValue({
        isOrganization: false,
        teamBilling: { id: "billing-1" },
        organizationBilling: null,
      });
      mockRepository.updateTeamBillingPeriod.mockResolvedValue(undefined);

      process.env.STRIPE_TEAM_ANNUAL_PRICE_ID = "price_annual_team";

      const result = await serviceWithMockRepo.switchBillingPeriod(1, "ANNUALLY");

      expect(mockBillingProviderService.updateSubscriptionPrice).toHaveBeenCalledWith({
        subscriptionId: "sub_123",
        subscriptionItemId: "si_123",
        newPriceId: "price_annual_team",
        prorationBehavior: "create_prorations",
        endTrial: false,
      });
      expect(result.newPeriod).toBe("ANNUALLY");
      expect(result.newPricePerSeat).toBe(1200);
      expect(result.effectiveDate).toBeUndefined();
    });

    it("should schedule annual to monthly switch within 30-day window", async () => {
      const subscriptionEnd = new Date();
      subscriptionEnd.setDate(subscriptionEnd.getDate() + 15);

      mockRepository.getTeamWithBillingInfo.mockResolvedValue({
        isOrganization: false,
        billing: {
          id: "billing-1",
          billingPeriod: "ANNUALLY",
          subscriptionId: "sub_123",
          subscriptionItemId: "si_123",
          subscriptionEnd,
          subscriptionStart: new Date(),
          subscriptionTrialEnd: null,
          pricePerSeat: 1200,
          paidSeats: 5,
        },
      });
      mockRepository.getTeamForBillingUpdate.mockResolvedValue({
        isOrganization: false,
        teamBilling: { id: "billing-1" },
        organizationBilling: null,
      });
      mockRepository.updateTeamBillingPeriod.mockResolvedValue(undefined);

      process.env.STRIPE_TEAM_MONTHLY_PRICE_ID = "price_monthly_team";

      const result = await serviceWithMockRepo.switchBillingPeriod(1, "MONTHLY");

      expect(mockBillingProviderService.updateSubscriptionPrice).toHaveBeenCalledWith({
        subscriptionId: "sub_123",
        subscriptionItemId: "si_123",
        newPriceId: "price_monthly_team",
        prorationBehavior: "none",
        endTrial: false,
      });
      expect(result.newPeriod).toBe("MONTHLY");
      expect(result.newPricePerSeat).toBe(1600);
      expect(result.effectiveDate).toEqual(subscriptionEnd);
    });

    it("should reject annual to monthly switch outside 30-day window", async () => {
      const subscriptionEnd = new Date();
      subscriptionEnd.setDate(subscriptionEnd.getDate() + 60);

      mockRepository.getTeamWithBillingInfo.mockResolvedValue({
        isOrganization: false,
        billing: {
          id: "billing-1",
          billingPeriod: "ANNUALLY",
          subscriptionId: "sub_123",
          subscriptionItemId: "si_123",
          subscriptionEnd,
          subscriptionStart: new Date(),
          subscriptionTrialEnd: null,
          pricePerSeat: 1200,
          paidSeats: 5,
        },
      });

      await expect(serviceWithMockRepo.switchBillingPeriod(1, "MONTHLY")).rejects.toThrow(
        "Cannot switch to monthly billing outside the 30-day window before renewal"
      );
    });

    it("should throw when already on target period", async () => {
      mockRepository.getTeamWithBillingInfo.mockResolvedValue({
        isOrganization: false,
        billing: {
          id: "billing-1",
          billingPeriod: "ANNUALLY",
          subscriptionId: "sub_123",
          subscriptionItemId: "si_123",
          subscriptionEnd: new Date(),
          subscriptionStart: new Date(),
          subscriptionTrialEnd: null,
          pricePerSeat: 1200,
          paidSeats: 5,
        },
      });

      await expect(serviceWithMockRepo.switchBillingPeriod(1, "ANNUALLY")).rejects.toThrow(
        "Already on the target billing period"
      );
    });

    it("should throw when no active subscription", async () => {
      mockRepository.getTeamWithBillingInfo.mockResolvedValue({
        isOrganization: false,
        billing: {
          id: "billing-1",
          billingPeriod: "MONTHLY",
          subscriptionId: "",
          subscriptionItemId: "si_123",
          subscriptionEnd: new Date(),
          subscriptionStart: new Date(),
          subscriptionTrialEnd: null,
          pricePerSeat: 1600,
          paidSeats: 5,
        },
      });

      await expect(serviceWithMockRepo.switchBillingPeriod(1, "ANNUALLY")).rejects.toThrow(
        "No active subscription"
      );
    });

    it("should throw when no billing record", async () => {
      mockRepository.getTeamWithBillingInfo.mockResolvedValue({ isOrganization: false, billing: null });

      await expect(serviceWithMockRepo.switchBillingPeriod(1, "ANNUALLY")).rejects.toThrow(
        "No billing record found"
      );
    });
  });
});
