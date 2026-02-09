import { prisma } from "@calcom/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildMonthlyProrationMetadata } from "../../../lib/proration-utils";
import type { IBillingProviderService } from "../../billingProvider/IBillingProviderService";
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
  getTeamMemberCount: vi.fn(),
};

const mockProrationRepository = {
  createProration: vi.fn(),
  findById: vi.fn(),
  updateProrationStatus: vi.fn(),
};

const mockBillingService: IBillingProviderService = {
  createInvoiceItem: vi.fn().mockResolvedValue({ invoiceItemId: "ii_test_123" }),
  deleteInvoiceItem: vi.fn().mockResolvedValue(undefined),
  createInvoice: vi.fn().mockResolvedValue({ invoiceId: "in_test_123" }),
  finalizeInvoice: vi.fn().mockResolvedValue({ invoiceUrl: "https://invoice.stripe.com/test" }),
  getSubscription: vi.fn().mockResolvedValue({
    items: [
      { id: "si_test_123", quantity: 1, price: { unit_amount: 12000, recurring: { interval: "year" } } },
    ],
    customer: "cus_test_123",
    status: "active",
    current_period_start: 1622505600,
    current_period_end: 1654041600,
    trial_end: null,
  }),
  handleSubscriptionUpdate: vi.fn().mockResolvedValue(undefined),
  checkoutSessionIsPaid: vi.fn().mockResolvedValue(true),
  handleSubscriptionCancel: vi.fn().mockResolvedValue(undefined),
  handleSubscriptionCreation: vi.fn().mockResolvedValue(undefined),
  handleEndTrial: vi.fn().mockResolvedValue(undefined),
  createCustomer: vi.fn().mockResolvedValue({ stripeCustomerId: "cus_test_123" }),
  createPaymentIntent: vi.fn().mockResolvedValue({ id: "pi_test_123", client_secret: "secret_123" }),
  createSubscriptionCheckout: vi
    .fn()
    .mockResolvedValue({ checkoutUrl: "https://checkout.test", sessionId: "cs_test_123" }),
  createPrice: vi.fn().mockResolvedValue({ priceId: "price_test_123" }),
  getPrice: vi.fn().mockResolvedValue(null),
  getSubscriptionStatus: vi.fn().mockResolvedValue(null),
  getCheckoutSession: vi.fn().mockResolvedValue(null),
  getCustomer: vi.fn().mockResolvedValue(null),
  getSubscriptions: vi.fn().mockResolvedValue(null),
  updateCustomer: vi.fn().mockResolvedValue(undefined),
  getPaymentIntentFailureReason: vi.fn().mockResolvedValue(null),
  hasDefaultPaymentMethod: vi.fn().mockResolvedValue(true),
  voidInvoice: vi.fn().mockResolvedValue(undefined),
} as IBillingProviderService;

vi.mock("../../../repository/proration/MonthlyProrationTeamRepository", () => ({
  MonthlyProrationTeamRepository: class {
    getTeamWithBilling = mockTeamRepository.getTeamWithBilling;
    getAnnualTeamsWithSeatChanges = mockTeamRepository.getAnnualTeamsWithSeatChanges;
    updatePaidSeats = mockTeamRepository.updatePaidSeats;
    getTeamMemberCount = mockTeamRepository.getTeamMemberCount;
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
    service = new MonthlyProrationService(undefined, mockBillingService);
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
          pricePerSeat: 10000,
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

      const result = await service.createProrationForTeam({
        teamId: 1,
        monthKey: "2026-01",
      });

      expect(result).toBeDefined();
      expect(result?.proratedAmount).toBe(0);
      expect(mockBillingService.handleSubscriptionUpdate).toHaveBeenCalledWith({
        subscriptionId: "sub_123",
        subscriptionItemId: "si_123",
        membershipCount: 10,
        prorationBehavior: "none",
      });
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
          pricePerSeat: 10000,
          subscriptionStart,
          subscriptionEnd,
          paidSeats: 10,
        },
      });

      mockProrationRepository.createProration.mockResolvedValueOnce({
        id: "proration-123",
        customerId: "cus_123",
        proratedAmount: 7541,
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

      const result = await service.createProrationForTeam({
        teamId: 1,
        monthKey: "2026-01",
      });

      expect(result).toBeDefined();
      expect(mockProrationRepository.createProration).toHaveBeenCalled();
      expect(mockBillingService.createInvoiceItem).toHaveBeenCalled();
      expect(mockBillingService.createInvoice).toHaveBeenCalled();
      expect(mockBillingService.finalizeInvoice).toHaveBeenCalled();
    });

    it("should charge only for net additions when removals exist", async () => {
      const subscriptionStart = new Date("2026-01-01");
      const subscriptionEnd = new Date("2027-01-01");

      const { SeatChangeTrackingService } = await import("../../seatTracking/SeatChangeTrackingService");
      vi.spyOn(SeatChangeTrackingService.prototype, "getMonthlyChanges").mockResolvedValueOnce({
        additions: 20,
        removals: 10,
        netChange: 10,
      });
      vi.spyOn(SeatChangeTrackingService.prototype, "markAsProcessed").mockResolvedValueOnce(10);

      mockTeamRepository.getTeamWithBilling.mockResolvedValueOnce({
        id: 1,
        isOrganization: false,
        memberCount: 120,
        billing: {
          id: "team-billing-999",
          subscriptionId: "sub_999",
          subscriptionItemId: "si_999",
          customerId: "cus_999",
          billingPeriod: "ANNUALLY",
          pricePerSeat: 10000,
          subscriptionStart,
          subscriptionEnd,
          paidSeats: 110,
        },
      });

      mockProrationRepository.createProration.mockResolvedValueOnce({
        id: "proration-999",
        customerId: "cus_999",
        proratedAmount: 25000,
        netSeatIncrease: 10,
        monthKey: "2026-01",
        teamId: 1,
        subscriptionId: "sub_999",
        subscriptionItemId: "si_999",
        seatsAtEnd: 120,
      } as any);

      mockProrationRepository.updateProrationStatus.mockResolvedValueOnce({
        id: "proration-999",
        status: "INVOICE_CREATED",
      } as any);

      await service.createProrationForTeam({
        teamId: 1,
        monthKey: "2026-01",
      });

      expect(mockProrationRepository.createProration).toHaveBeenCalledWith(
        expect.objectContaining({
          seatsAdded: 20,
          seatsRemoved: 10,
          netSeatIncrease: 10,
          seatsAtStart: 110,
          seatsAtEnd: 120,
        })
      );
      expect(mockBillingService.createInvoiceItem).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: "sub_999",
        })
      );
      expect(mockBillingService.createInvoice).toHaveBeenCalled();
    });

    it("should send invoice when no default payment method exists", async () => {
      const subscriptionStart = new Date("2026-01-01");
      const subscriptionEnd = new Date("2027-01-01");

      const { SeatChangeTrackingService } = await import("../../seatTracking/SeatChangeTrackingService");
      vi.spyOn(SeatChangeTrackingService.prototype, "markAsProcessed").mockResolvedValueOnce(2);
      vi.mocked(mockBillingService.hasDefaultPaymentMethod).mockResolvedValueOnce(false);

      mockTeamRepository.getTeamWithBilling.mockResolvedValueOnce({
        id: 1,
        isOrganization: false,
        memberCount: 12,
        billing: {
          id: "team-billing-789",
          subscriptionId: "sub_789",
          subscriptionItemId: "si_789",
          customerId: "cus_789",
          billingPeriod: "ANNUALLY",
          pricePerSeat: 10000,
          subscriptionStart,
          subscriptionEnd,
          paidSeats: 10,
        },
      });

      mockProrationRepository.createProration.mockResolvedValueOnce({
        id: "proration-789",
        customerId: "cus_789",
        proratedAmount: 5000,
        netSeatIncrease: 2,
        monthKey: "2026-01",
        teamId: 1,
        subscriptionId: "sub_789",
        subscriptionItemId: "si_789",
        seatsAtEnd: 12,
      } as any);

      mockProrationRepository.updateProrationStatus.mockResolvedValueOnce({
        id: "proration-789",
        status: "PENDING",
      } as any);

      await service.createProrationForTeam({
        teamId: 1,
        monthKey: "2026-01",
      });

      expect(mockBillingService.createInvoice).toHaveBeenCalledWith({
        customerId: "cus_789",
        autoAdvance: true,
        collectionMethod: "send_invoice",
        subscriptionId: "sub_789",
        metadata: buildMonthlyProrationMetadata({ prorationId: "proration-789" }),
      });
      expect(mockProrationRepository.updateProrationStatus).toHaveBeenCalledWith("proration-789", "PENDING", {
        invoiceItemId: "ii_test_123",
        invoiceId: "in_test_123",
        invoiceUrl: "https://invoice.stripe.com/test",
      });
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
          pricePerSeat: 20000,
          subscriptionStart: new Date("2026-01-01"),
          subscriptionEnd: new Date("2027-01-01"),
          paidSeats: 10,
        },
      });

      mockProrationRepository.createProration.mockResolvedValueOnce({
        id: "proration-456",
        customerId: "cus_456",
        proratedAmount: 15000,
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
    it("should update proration status to CHARGED using seatsAtEnd from proration record", async () => {
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

      await service.handleProrationPaymentSuccess("proration-123");

      expect(mockProrationRepository.updateProrationStatus).toHaveBeenCalledWith("proration-123", "CHARGED", {
        chargedAt: expect.any(Date),
      });
      // Should use seatsAtEnd from proration record, not current member count
      expect(mockBillingService.handleSubscriptionUpdate).toHaveBeenCalledWith({
        subscriptionId: "sub_123",
        subscriptionItemId: "si_123",
        membershipCount: 13,
        prorationBehavior: "none",
      });
      expect(mockTeamRepository.updatePaidSeats).toHaveBeenCalledWith(1, false, "billing-123", 13);
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
        proratedAmount: 10000,
        netSeatIncrease: 2,
        monthKey: "2026-01",
        teamId: 1,
        subscriptionId: "sub_123",
        subscriptionItemId: "si_123",
      } as any);

      mockProrationRepository.updateProrationStatus.mockResolvedValueOnce(undefined);

      await service.retryFailedProration("proration-123");

      expect(mockBillingService.createInvoiceItem).toHaveBeenCalled();
      expect(mockBillingService.createInvoice).toHaveBeenCalled();
      expect(mockBillingService.finalizeInvoice).toHaveBeenCalled();
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
