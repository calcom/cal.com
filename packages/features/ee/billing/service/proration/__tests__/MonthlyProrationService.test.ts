import { describe, it, expect, vi, beforeEach } from "vitest";

import { prisma } from "@calcom/prisma";

import { MonthlyProrationService } from "../MonthlyProrationService";

vi.mock("@calcom/prisma", () => ({
  prisma: {
    team: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    monthlyProration: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
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

vi.mock("@calcom/features/ee/payments/server/stripe", () => ({
  default: {
    invoiceItems: {
      create: vi.fn(),
    },
  },
}));

vi.mock("../../seatTracking/SeatChangeTrackingService", () => ({
  SeatChangeTrackingService: class {
    async getMonthlyChanges() {
      return { additions: 5, removals: 2, netChange: 3 };
    }
    async markAsProcessed() {
      return 3;
    }
  },
}));

describe("MonthlyProrationService", () => {
  let service: MonthlyProrationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MonthlyProrationService();
  });

  describe("createProrationForTeam", () => {
    it("should return null when net change is 0", async () => {
      const { SeatChangeTrackingService } = await import("../../seatTracking/SeatChangeTrackingService");
      vi.spyOn(SeatChangeTrackingService.prototype, "getMonthlyChanges").mockResolvedValueOnce({
        additions: 5,
        removals: 5,
        netChange: 0,
      });

      const result = await service.createProrationForTeam({
        teamId: 1,
        monthKey: "2026-01",
      });

      expect(result).toBeNull();
    });

    it("should create proration for team with net seat increase", async () => {
      const subscriptionStart = new Date("2026-01-01");
      const subscriptionEnd = new Date("2027-01-01");

      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: 1,
        isOrganization: false,
        teamBilling: {
          id: "team-billing-123",
          subscriptionId: "sub_123",
          subscriptionItemId: "si_123",
          customerId: "cus_123",
          subscriptionStart,
          subscriptionEnd,
          pricePerSeat: 100,
        },
        organizationBilling: null,
        _count: { members: 13 },
      } as any);

      vi.mocked(prisma.monthlyProration.create).mockResolvedValue({
        id: "proration-123",
        customerId: "cus_123",
        proratedAmount: 75.41,
        netSeatIncrease: 3,
        monthKey: "2026-01",
        teamId: 1,
      } as any);

      vi.mocked(prisma.monthlyProration.update).mockResolvedValue({} as any);

      const stripe = (await import("@calcom/features/ee/payments/server/stripe")).default;
      vi.mocked(stripe.invoiceItems.create).mockResolvedValue({
        id: "ii_123",
      } as any);

      const result = await service.createProrationForTeam({
        teamId: 1,
        monthKey: "2026-01",
      });

      expect(result).toBeDefined();
      expect(prisma.monthlyProration.create).toHaveBeenCalled();
    });

    it("should use organization billing for organizations", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: 1,
        isOrganization: true,
        teamBilling: null,
        organizationBilling: {
          id: "org-billing-456",
          subscriptionId: "sub_456",
          subscriptionItemId: "si_456",
          customerId: "cus_456",
          subscriptionStart: new Date("2026-01-01"),
          subscriptionEnd: new Date("2027-01-01"),
          pricePerSeat: 200,
        },
        _count: { members: 13 },
      } as any);

      vi.mocked(prisma.monthlyProration.create).mockResolvedValue({
        id: "proration-456",
        customerId: "cus_456",
        proratedAmount: 150,
        netSeatIncrease: 3,
        monthKey: "2026-01",
        teamId: 1,
      } as any);

      await service.createProrationForTeam({ teamId: 1, monthKey: "2026-01" });

      expect(prisma.monthlyProration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationBillingId: "org-billing-456",
          teamBillingId: null,
        }),
      });
    });

    it("should throw error when team not found", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue(null);

      await expect(service.createProrationForTeam({ teamId: 999, monthKey: "2026-01" })).rejects.toThrow(
        "Team 999 not found"
      );
    });

    it("should throw error when no billing record", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: 1,
        isOrganization: false,
        teamBilling: null,
        organizationBilling: null,
        _count: { members: 10 },
      } as any);

      await expect(service.createProrationForTeam({ teamId: 1, monthKey: "2026-01" })).rejects.toThrow(
        "No billing record found for team 1"
      );
    });
  });

  describe("handleProrationPaymentSuccess", () => {
    it("should update proration status to CHARGED", async () => {
      vi.mocked(prisma.monthlyProration.update).mockResolvedValue({} as any);

      await service.handleProrationPaymentSuccess("proration-123");

      expect(prisma.monthlyProration.update).toHaveBeenCalledWith({
        where: { id: "proration-123" },
        data: {
          status: "CHARGED",
          chargedAt: expect.any(Date),
        },
      });
    });
  });

  describe("handleProrationPaymentFailure", () => {
    it("should update proration status to FAILED with reason", async () => {
      vi.mocked(prisma.monthlyProration.update).mockResolvedValue({} as any);

      await service.handleProrationPaymentFailure({
        prorationId: "proration-123",
        reason: "Card declined",
      });

      expect(prisma.monthlyProration.update).toHaveBeenCalledWith({
        where: { id: "proration-123" },
        data: {
          status: "FAILED",
          failedAt: expect.any(Date),
          failureReason: "Card declined",
          retryCount: { increment: 1 },
        },
      });
    });
  });

  describe("retryFailedProration", () => {
    it("should recreate invoice item for failed proration", async () => {
      vi.mocked(prisma.monthlyProration.findUnique).mockResolvedValue({
        id: "proration-123",
        status: "FAILED",
        customerId: "cus_123",
        proratedAmount: 100,
        netSeatIncrease: 2,
        monthKey: "2026-01",
        teamId: 1,
      } as any);

      const stripe = (await import("@calcom/features/ee/payments/server/stripe")).default;
      vi.mocked(stripe.invoiceItems.create).mockResolvedValue({ id: "ii_retry" } as any);
      vi.mocked(prisma.monthlyProration.update).mockResolvedValue({} as any);

      await service.retryFailedProration("proration-123");

      expect(stripe.invoiceItems.create).toHaveBeenCalled();
      expect(prisma.monthlyProration.update).toHaveBeenCalledWith({
        where: { id: "proration-123" },
        data: {
          invoiceItemId: "ii_retry",
          status: "INVOICE_CREATED",
        },
      });
    });

    it("should throw error if proration not found", async () => {
      vi.mocked(prisma.monthlyProration.findUnique).mockResolvedValue(null);

      await expect(service.retryFailedProration("proration-999")).rejects.toThrow(
        "Proration proration-999 not found"
      );
    });

    it("should throw error if proration is not in FAILED status", async () => {
      vi.mocked(prisma.monthlyProration.findUnique).mockResolvedValue({
        id: "proration-123",
        status: "CHARGED",
      } as any);

      await expect(service.retryFailedProration("proration-123")).rejects.toThrow(
        "Proration proration-123 is not in FAILED status"
      );
    });
  });
});
