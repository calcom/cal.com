import { prisma } from "@calcom/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
    invoices: {
      create: vi.fn(),
      finalizeInvoice: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
      update: vi.fn(),
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

const mockTeamRepository = {
  getTeamWithBilling: vi.fn(),
  getAnnualTeamsWithSeatChanges: vi.fn(),
  updatePaidSeats: vi.fn(),
};

const mockProrationRepository = {
  createProration: vi.fn(),
  findById: vi.fn(),
  updateProrationStatus: vi.fn(),
};

vi.mock("../../../repository/proration/MonthlyProrationTeamRepository", () => ({
  MonthlyProrationTeamRepository: class {
    getTeamWithBilling = mockTeamRepository.getTeamWithBilling;
    getAnnualTeamsWithSeatChanges = mockTeamRepository.getAnnualTeamsWithSeatChanges;
    updatePaidSeats = mockTeamRepository.updatePaidSeats;
  },
}));

vi.mock("../../../repository/proration/MonthlyProrationRepository", () => ({
  MonthlyProrationRepository: class {
    createProration = mockProrationRepository.createProration;
    findById = mockProrationRepository.findById;
    updateProrationStatus = mockProrationRepository.updateProrationStatus;
  },
}));

describe("MonthlyProrationService", () => {
  let service: MonthlyProrationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MonthlyProrationService();
  });

  describe("createProrationForTeam", () => {
    it("should create proration with $0 amount when seat count equals paid seats", async () => {
      const { SeatChangeTrackingService } = await import("../../seatTracking/SeatChangeTrackingService");

      vi.spyOn(SeatChangeTrackingService.prototype, "getMonthlyChanges").mockResolvedValueOnce({
        additions: 5,
        removals: 5,
        netChange: 0,
      });

      vi.spyOn(SeatChangeTrackingService.prototype, "markAsProcessed").mockResolvedValueOnce(0);

      mockTeamRepository.getTeamWithBilling.mockResolvedValueOnce({
        id: 1,
        isOrganization: false,
        memberCount: 10,
        billing: {
          id: "billing-123",
          subscriptionId: "sub_123",
          subscriptionItemId: "si_123",
          customerId: "cus_123",
          billingPeriod: "ANNUALLY",
          pricePerSeat: 100,
          subscriptionStart: new Date("2026-01-01"),
          subscriptionEnd: new Date("2027-01-01"),
          paidSeats: 10,
        },
      });

      mockProrationRepository.createProration.mockResolvedValueOnce({
        id: "proration-123",
        customerId: "cus_123",
        proratedAmount: 0,
        netSeatIncrease: 0,
        monthKey: "2026-01",
        teamId: 1,
        subscriptionId: "sub_123",
        subscriptionItemId: "si_123",
        seatsAtEnd: 10,
      } as any);

      mockProrationRepository.updateProrationStatus.mockResolvedValueOnce({
        id: "proration-123",
        status: "CHARGED",
        proratedAmount: 0,
      } as any);

      const stripe = (await import("@calcom/features/ee/payments/server/stripe")).default;
      vi.mocked(stripe.subscriptions.update).mockResolvedValue({} as any);

      const result = await service.createProrationForTeam({
        teamId: 1,
        monthKey: "2026-01",
      });

      expect(result).toBeDefined();
      expect(result?.proratedAmount).toBe(0);
      expect(stripe.subscriptions.update).toHaveBeenCalled();
    });

    it("should create proration for team with net seat increase", async () => {
      const subscriptionStart = new Date("2026-01-01");
      const subscriptionEnd = new Date("2027-01-01");

      const { SeatChangeTrackingService } = await import("../../seatTracking/SeatChangeTrackingService");
      vi.spyOn(SeatChangeTrackingService.prototype, "markAsProcessed").mockResolvedValueOnce(3);

      mockTeamRepository.getTeamWithBilling.mockResolvedValueOnce({
        id: 1,
        isOrganization: false,
        memberCount: 13,
        billing: {
          id: "team-billing-123",
          subscriptionId: "sub_123",
          subscriptionItemId: "si_123",
          customerId: "cus_123",
          billingPeriod: "ANNUALLY",
          pricePerSeat: 100,
          subscriptionStart,
          subscriptionEnd,
          paidSeats: 10,
        },
      });

      mockProrationRepository.createProration.mockResolvedValueOnce({
        id: "proration-123",
        customerId: "cus_123",
        proratedAmount: 75.41,
        netSeatIncrease: 3,
        monthKey: "2026-01",
        teamId: 1,
        subscriptionId: "sub_123",
        subscriptionItemId: "si_123",
        seatsAtEnd: 13,
      } as any);

      mockProrationRepository.updateProrationStatus.mockResolvedValueOnce({
        id: "proration-123",
        status: "INVOICE_CREATED",
      } as any);

      const stripe = (await import("@calcom/features/ee/payments/server/stripe")).default;
      vi.mocked(stripe.invoiceItems.create).mockResolvedValue({
        id: "ii_123",
      } as any);
      vi.mocked(stripe.invoices.create).mockResolvedValue({
        id: "in_123",
      } as any);
      vi.mocked(stripe.invoices.finalizeInvoice).mockResolvedValue({} as any);

      const result = await service.createProrationForTeam({
        teamId: 1,
        monthKey: "2026-01",
      });

      expect(result).toBeDefined();
      expect(mockProrationRepository.createProration).toHaveBeenCalled();
    });

    it("should use organization billing for organizations", async () => {
      const { SeatChangeTrackingService } = await import("../../seatTracking/SeatChangeTrackingService");
      vi.spyOn(SeatChangeTrackingService.prototype, "markAsProcessed").mockResolvedValueOnce(3);

      mockTeamRepository.getTeamWithBilling.mockResolvedValueOnce({
        id: 1,
        isOrganization: true,
        memberCount: 13,
        billing: {
          id: "org-billing-456",
          subscriptionId: "sub_456",
          subscriptionItemId: "si_456",
          customerId: "cus_456",
          billingPeriod: "ANNUALLY",
          pricePerSeat: 200,
          subscriptionStart: new Date("2026-01-01"),
          subscriptionEnd: new Date("2027-01-01"),
          paidSeats: 10,
        },
      });

      mockProrationRepository.createProration.mockResolvedValueOnce({
        id: "proration-456",
        customerId: "cus_456",
        proratedAmount: 150,
        netSeatIncrease: 3,
        monthKey: "2026-01",
        teamId: 1,
        subscriptionId: "sub_456",
        subscriptionItemId: "si_456",
        seatsAtEnd: 13,
      } as any);

      mockProrationRepository.updateProrationStatus.mockResolvedValueOnce({
        id: "proration-456",
        status: "INVOICE_CREATED",
      } as any);

      const stripe = (await import("@calcom/features/ee/payments/server/stripe")).default;
      vi.mocked(stripe.invoiceItems.create).mockResolvedValue({ id: "ii_456" } as any);
      vi.mocked(stripe.invoices.create).mockResolvedValue({ id: "in_456" } as any);
      vi.mocked(stripe.invoices.finalizeInvoice).mockResolvedValue({} as any);

      await service.createProrationForTeam({ teamId: 1, monthKey: "2026-01" });

      expect(mockProrationRepository.createProration).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationBillingId: "org-billing-456",
          teamBillingId: null,
        })
      );
    });

    it("should throw error when team not found", async () => {
      mockTeamRepository.getTeamWithBilling.mockResolvedValueOnce(null);

      await expect(service.createProrationForTeam({ teamId: 999, monthKey: "2026-01" })).rejects.toThrow(
        "Team 999 not found"
      );
    });

    it("should throw error when no billing record", async () => {
      mockTeamRepository.getTeamWithBilling.mockResolvedValueOnce({
        id: 1,
        isOrganization: false,
        memberCount: 10,
        billing: null,
      });

      await expect(service.createProrationForTeam({ teamId: 1, monthKey: "2026-01" })).rejects.toThrow(
        "No billing record or metadata found for team 1"
      );
    });
  });

  describe("handleProrationPaymentSuccess", () => {
    it("should update proration status to CHARGED", async () => {
      mockProrationRepository.findById.mockResolvedValueOnce({
        id: "proration-123",
        status: "INVOICE_CREATED",
        subscriptionId: "sub_123",
        subscriptionItemId: "si_123",
        seatsAtEnd: 13,
        teamId: 1,
        teamBillingId: "billing-123",
        organizationBillingId: null,
      } as any);

      mockProrationRepository.updateProrationStatus.mockResolvedValueOnce(undefined);

      const stripe = (await import("@calcom/features/ee/payments/server/stripe")).default;
      vi.mocked(stripe.subscriptions.update).mockResolvedValue({} as any);

      await service.handleProrationPaymentSuccess("proration-123");

      expect(mockProrationRepository.updateProrationStatus).toHaveBeenCalledWith("proration-123", "CHARGED", {
        chargedAt: expect.any(Date),
      });
    });
  });

  describe("handleProrationPaymentFailure", () => {
    it("should update proration status to FAILED with reason", async () => {
      mockProrationRepository.findById.mockResolvedValueOnce({
        id: "proration-123",
        status: "INVOICE_CREATED",
        retryCount: 0,
      } as any);

      mockProrationRepository.updateProrationStatus.mockResolvedValueOnce(undefined);

      await service.handleProrationPaymentFailure({
        prorationId: "proration-123",
        reason: "Card declined",
      });

      expect(mockProrationRepository.updateProrationStatus).toHaveBeenCalledWith("proration-123", "FAILED", {
        failedAt: expect.any(Date),
        failureReason: "Card declined",
        retryCount: 1,
      });
    });
  });

  describe("retryFailedProration", () => {
    it("should recreate invoice item for failed proration", async () => {
      mockProrationRepository.findById.mockResolvedValueOnce({
        id: "proration-123",
        status: "FAILED",
        customerId: "cus_123",
        proratedAmount: 100,
        netSeatIncrease: 2,
        monthKey: "2026-01",
        teamId: 1,
        subscriptionId: "sub_123",
        subscriptionItemId: "si_123",
      } as any);

      mockProrationRepository.updateProrationStatus.mockResolvedValueOnce(undefined);

      const stripe = (await import("@calcom/features/ee/payments/server/stripe")).default;
      vi.mocked(stripe.invoiceItems.create).mockResolvedValue({ id: "ii_retry" } as any);
      vi.mocked(stripe.invoices.create).mockResolvedValue({ id: "in_retry" } as any);
      vi.mocked(stripe.invoices.finalizeInvoice).mockResolvedValue({} as any);

      await service.retryFailedProration("proration-123");

      expect(stripe.invoiceItems.create).toHaveBeenCalled();
      expect(stripe.invoices.create).toHaveBeenCalled();
      expect(stripe.invoices.finalizeInvoice).toHaveBeenCalled();
    });

    it("should throw error if proration not found", async () => {
      mockProrationRepository.findById.mockResolvedValueOnce(null);

      await expect(service.retryFailedProration("proration-999")).rejects.toThrow(
        "Proration proration-999 not found"
      );
    });

    it("should throw error if proration is not in FAILED status", async () => {
      mockProrationRepository.findById.mockResolvedValueOnce({
        id: "proration-123",
        status: "CHARGED",
      } as any);

      await expect(service.retryFailedProration("proration-123")).rejects.toThrow(
        "Proration proration-123 is not in FAILED status"
      );
    });
  });
});
