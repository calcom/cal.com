import { describe, it, expect, vi, beforeEach } from "vitest";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { prisma } from "@calcom/prisma";

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

describe("BillingPeriodService", () => {
  let service: BillingPeriodService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(FeaturesRepository.prototype, "checkIfFeatureIsEnabledGlobally").mockResolvedValue(true);
    service = new BillingPeriodService();
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
        subscriptionStart,
        subscriptionEnd,
        trialEnd: null,
        isInTrial: false,
        pricePerSeat: 10000,
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
        subscriptionStart: null,
        subscriptionEnd: null,
        trialEnd: null,
        isInTrial: false,
        pricePerSeat: null,
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
});
