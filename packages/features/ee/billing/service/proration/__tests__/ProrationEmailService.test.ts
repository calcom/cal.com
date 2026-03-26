import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TFunction } from "i18next";
import { ProrationEmailService } from "../ProrationEmailService";

// Mock the logger first to avoid import issues
vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    }),
  },
}));

// Mock safeStringify
vi.mock("@calcom/lib/safeStringify", () => ({
  safeStringify: vi.fn((obj) => JSON.stringify(obj)),
}));

// Mock prisma - use vi.hoisted to avoid reference errors
const mockPrisma = vi.hoisted(() => ({
  monthlyProration: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@calcom/prisma", () => ({
  prisma: mockPrisma,
}));

// Create mock functions using vi.hoisted to avoid reference errors
const mockFindForEmail = vi.hoisted(() => vi.fn());
const mockGetUserAndTeamWithBillingPermission = vi.hoisted(() => vi.fn());

// Mock MonthlyProrationRepository
vi.mock("../../../repository/proration/MonthlyProrationRepository", () => ({
  MonthlyProrationRepository: class {
    findForEmail = mockFindForEmail;
  },
}));

// Mock getUserAndTeamWithBillingPermission helper
vi.mock("../../../helpers/getUserAndTeamWithBillingPermission", () => ({
  getUserAndTeamWithBillingPermission: mockGetUserAndTeamWithBillingPermission,
}));

// Mock dynamic imports
const mockSendProrationInvoiceEmails = vi.fn();
const mockProrationReminderEmailSendEmail = vi.fn();
const mockStripeInvoicesRetrieve = vi.fn();

// Mock the dynamic imports using vi.hoisted to ensure they're available during module evaluation
const mocks = vi.hoisted(() => ({
  sendProrationInvoiceEmails: vi.fn(),
  ProrationReminderEmail: vi.fn().mockImplementation(function(props: any) {
    this.props = props;
    this.sendEmail = vi.fn().mockResolvedValue(undefined);
  }),
  stripe: {
    invoices: {
      retrieve: vi.fn(),
    },
  },
}));

vi.mock("@calcom/emails/billing-email-service", () => ({
  sendProrationInvoiceEmails: mocks.sendProrationInvoiceEmails,
}));

vi.mock("@calcom/emails/templates/proration-reminder-email", () => ({
  default: mocks.ProrationReminderEmail,
}));

vi.mock("@calcom/features/ee/payments/server/stripe", () => ({
  default: mocks.stripe,
}));

describe("ProrationEmailService", () => {
  let service: ProrationEmailService;
  let mockT: TFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset individual mock functions
    mockFindForEmail.mockReset();
    mockGetUserAndTeamWithBillingPermission.mockReset();
    mocks.sendProrationInvoiceEmails.mockReset();
    mocks.stripe.invoices.retrieve.mockReset();

    service = new ProrationEmailService();
    mockT = vi.fn((key: string) => key) as unknown as TFunction;
  });

  describe("sendInvoiceEmail", () => {
    const defaultParams = {
      prorationId: "proration-123",
      teamId: 1,
      isAutoCharge: true,
    };

    it("should return early when proration not found", async () => {
      mockFindForEmail.mockResolvedValueOnce(null);

      await service.sendInvoiceEmail(defaultParams);

      expect(mockFindForEmail).toHaveBeenCalledWith("proration-123");
      expect(mockGetUserAndTeamWithBillingPermission).not.toHaveBeenCalled();
      expect(mocks.sendProrationInvoiceEmails).not.toHaveBeenCalled();
    });

    it("should return early when team not found", async () => {
      mockFindForEmail.mockResolvedValueOnce({
        invoiceId: "inv_123",
        monthKey: "2026-01",
        netSeatIncrease: 3,
        proratedAmount: 5000,
        status: "PENDING",
      });

      mockGetUserAndTeamWithBillingPermission.mockResolvedValueOnce({
        team: null,
      });

      await service.sendInvoiceEmail(defaultParams);

      expect(mockGetUserAndTeamWithBillingPermission).toHaveBeenCalledWith({
        teamId: 1,
        prismaClient: mockPrisma,
      });
      expect(mocks.sendProrationInvoiceEmails).not.toHaveBeenCalled();
    });

    it("should return early when no users with billing permission found", async () => {
      mockFindForEmail.mockResolvedValueOnce({
        invoiceId: "inv_123",
        monthKey: "2026-01",
        netSeatIncrease: 3,
        proratedAmount: 5000,
        status: "PENDING",
      });

      mockGetUserAndTeamWithBillingPermission.mockResolvedValueOnce({
        team: {
          id: 1,
          name: "Test Team",
          adminAndOwners: [],
        },
      });

      await service.sendInvoiceEmail(defaultParams);

      expect(mocks.sendProrationInvoiceEmails).not.toHaveBeenCalled();
    });

    it("should successfully send invoice email with invoice URL", async () => {
      const mockProration = {
        invoiceId: "inv_123",
        monthKey: "2026-01",
        netSeatIncrease: 3,
        proratedAmount: 5000,
        status: "PENDING",
      };

      const mockTeam = {
        id: 1,
        name: "Test Team",
        adminAndOwners: [
          {
            id: 1,
            name: "John Doe",
            email: "john@example.com",
            t: mockT,
          },
          {
            id: 2,
            name: "Jane Smith",
            email: "jane@example.com",
            t: mockT,
          },
        ],
      };

      mockFindForEmail.mockResolvedValueOnce(mockProration);
      mockGetUserAndTeamWithBillingPermission.mockResolvedValueOnce({
        team: mockTeam,
      });

      // Mock stripe to return invoice URL
      mocks.stripe.invoices.retrieve.mockResolvedValueOnce({
        hosted_invoice_url: "https://invoice.stripe.com/inv_123",
      });

      await service.sendInvoiceEmail(defaultParams);

      expect(mocks.stripe.invoices.retrieve).toHaveBeenCalledWith("inv_123");
      expect(mocks.sendProrationInvoiceEmails).toHaveBeenCalledWith({
        team: { id: 1, name: "Test Team" },
        proration: {
          monthKey: "2026-01",
          netSeatIncrease: 3,
          proratedAmount: 5000,
        },
        invoiceUrl: "https://invoice.stripe.com/inv_123",
        isAutoCharge: true,
        adminAndOwners: mockTeam.adminAndOwners,
      });
    });

    it("should successfully send invoice email without invoice URL when invoiceId is null", async () => {
      const mockProration = {
        invoiceId: null,
        monthKey: "2026-01",
        netSeatIncrease: 3,
        proratedAmount: 5000,
        status: "PENDING",
      };

      const mockTeam = {
        id: 1,
        name: "Test Team",
        adminAndOwners: [
          {
            id: 1,
            name: "John Doe",
            email: "john@example.com",
            t: mockT,
          },
        ],
      };

      mockFindForEmail.mockResolvedValueOnce(mockProration);
      mockGetUserAndTeamWithBillingPermission.mockResolvedValueOnce({
        team: mockTeam,
      });

      await service.sendInvoiceEmail(defaultParams);

      expect(mocks.stripe.invoices.retrieve).not.toHaveBeenCalled();
      expect(mocks.sendProrationInvoiceEmails).toHaveBeenCalledWith({
        team: { id: 1, name: "Test Team" },
        proration: {
          monthKey: "2026-01",
          netSeatIncrease: 3,
          proratedAmount: 5000,
        },
        invoiceUrl: null,
        isAutoCharge: true,
        adminAndOwners: mockTeam.adminAndOwners,
      });
    });

    it("should successfully send invoice email without invoice URL when stripe fails", async () => {
      const mockProration = {
        invoiceId: "inv_123",
        monthKey: "2026-01",
        netSeatIncrease: 3,
        proratedAmount: 5000,
        status: "PENDING",
      };

      const mockTeam = {
        id: 1,
        name: "Test Team",
        adminAndOwners: [
          {
            id: 1,
            name: "John Doe",
            email: "john@example.com",
            t: mockT,
          },
        ],
      };

      mockFindForEmail.mockResolvedValueOnce(mockProration);
      mockGetUserAndTeamWithBillingPermission.mockResolvedValueOnce({
        team: mockTeam,
      });

      // Mock stripe to throw an error
      mocks.stripe.invoices.retrieve.mockRejectedValueOnce(new Error("Stripe API error"));

      await service.sendInvoiceEmail(defaultParams);

      expect(mocks.stripe.invoices.retrieve).toHaveBeenCalledWith("inv_123");
      expect(mocks.sendProrationInvoiceEmails).toHaveBeenCalledWith({
        team: { id: 1, name: "Test Team" },
        proration: {
          monthKey: "2026-01",
          netSeatIncrease: 3,
          proratedAmount: 5000,
        },
        invoiceUrl: null,
        isAutoCharge: true,
        adminAndOwners: mockTeam.adminAndOwners,
      });
    });
  });

  describe("sendReminderEmail", () => {
    const defaultParams = {
      prorationId: "proration-456",
      teamId: 2,
    };

    it("should return early when proration not found", async () => {
      mockFindForEmail.mockResolvedValueOnce(null);

      await service.sendReminderEmail(defaultParams);

      expect(mockFindForEmail).toHaveBeenCalledWith("proration-456");
      expect(mockGetUserAndTeamWithBillingPermission).not.toHaveBeenCalled();
    });

    it("should return early when proration is already CHARGED", async () => {
      mockFindForEmail.mockResolvedValueOnce({
        invoiceId: "inv_456",
        monthKey: "2026-02",
        netSeatIncrease: 2,
        proratedAmount: 3000,
        status: "CHARGED",
      });

      await service.sendReminderEmail(defaultParams);

      expect(mockGetUserAndTeamWithBillingPermission).not.toHaveBeenCalled();
    });

    it("should return early when team not found", async () => {
      mockFindForEmail.mockResolvedValueOnce({
        invoiceId: "inv_456",
        monthKey: "2026-02",
        netSeatIncrease: 2,
        proratedAmount: 3000,
        status: "PENDING",
      });

      mockGetUserAndTeamWithBillingPermission.mockResolvedValueOnce({
        team: null,
      });

      await service.sendReminderEmail(defaultParams);

      expect(mockGetUserAndTeamWithBillingPermission).toHaveBeenCalledWith({
        teamId: 2,
        prismaClient: mockPrisma,
      });
    });

    it("should return early when no users with billing permission found", async () => {
      mockFindForEmail.mockResolvedValueOnce({
        invoiceId: "inv_456",
        monthKey: "2026-02",
        netSeatIncrease: 2,
        proratedAmount: 3000,
        status: "PENDING",
      });

      mockGetUserAndTeamWithBillingPermission.mockResolvedValueOnce({
        team: {
          id: 2,
          name: "Test Team 2",
          adminAndOwners: [],
        },
      });

      await service.sendReminderEmail(defaultParams);

      expect(mocks.ProrationReminderEmail).not.toHaveBeenCalled();
    });

    it("should successfully send reminder emails to multiple users", async () => {
      const mockProration = {
        invoiceId: "inv_456",
        monthKey: "2026-02",
        netSeatIncrease: 2,
        proratedAmount: 3000,
        status: "PENDING",
      };

      const mockUsers = [
        {
          id: 1,
          name: "Admin User",
          email: "admin@example.com",
          t: mockT,
        },
        {
          id: 2,
          name: "Owner User",
          email: "owner@example.com",
          t: mockT,
        },
      ];

      const mockTeam = {
        id: 2,
        name: "Test Team 2",
        adminAndOwners: mockUsers,
      };

      mockFindForEmail.mockResolvedValueOnce(mockProration);
      mockGetUserAndTeamWithBillingPermission.mockResolvedValueOnce({
        team: mockTeam,
      });

      // Mock stripe to return invoice URL
      mocks.stripe.invoices.retrieve.mockResolvedValueOnce({
        hosted_invoice_url: "https://invoice.stripe.com/inv_456",
      });

      // Mock email instances will be created by the class constructor

      await service.sendReminderEmail(defaultParams);

      expect(mocks.ProrationReminderEmail).toHaveBeenCalledTimes(2);

      // Check first email instance
      expect(mocks.ProrationReminderEmail).toHaveBeenNthCalledWith(1, {
        user: {
          name: "Admin User",
          email: "admin@example.com",
          t: mockT,
        },
        team: {
          id: 2,
          name: "Test Team 2",
        },
        proration: {
          monthKey: "2026-02",
          netSeatIncrease: 2,
          proratedAmount: 3000,
        },
        invoiceUrl: "https://invoice.stripe.com/inv_456",
      });

      // Check second email instance
      expect(mocks.ProrationReminderEmail).toHaveBeenNthCalledWith(2, {
        user: {
          name: "Owner User",
          email: "owner@example.com",
          t: mockT,
        },
        team: {
          id: 2,
          name: "Test Team 2",
        },
        proration: {
          monthKey: "2026-02",
          netSeatIncrease: 2,
          proratedAmount: 3000,
        },
        invoiceUrl: "https://invoice.stripe.com/inv_456",
      });

      // Check that the email constructor was called for each user
      // Note: we can't easily spy on individual instances with this setup,
      // but we can verify the service completed without errors
    });

    it("should send reminder emails without invoice URL when stripe retrieval fails", async () => {
      const mockProration = {
        invoiceId: "inv_456",
        monthKey: "2026-02",
        netSeatIncrease: 2,
        proratedAmount: 3000,
        status: "PENDING",
      };

      const mockTeam = {
        id: 2,
        name: "Test Team 2",
        adminAndOwners: [
          {
            id: 1,
            name: "Admin User",
            email: "admin@example.com",
            t: mockT,
          },
        ],
      };

      mockFindForEmail.mockResolvedValueOnce(mockProration);
      mockGetUserAndTeamWithBillingPermission.mockResolvedValueOnce({
        team: mockTeam,
      });

      // Mock stripe to throw an error
      mocks.stripe.invoices.retrieve.mockRejectedValueOnce(new Error("Stripe error"));

      await service.sendReminderEmail(defaultParams);

      expect(mocks.ProrationReminderEmail).toHaveBeenCalledWith({
        user: {
          name: "Admin User",
          email: "admin@example.com",
          t: mockT,
        },
        team: {
          id: 2,
          name: "Test Team 2",
        },
        proration: {
          monthKey: "2026-02",
          netSeatIncrease: 2,
          proratedAmount: 3000,
        },
        invoiceUrl: null,
      });

      // Verify the service completed without errors - individual email instances are created and called
    });
  });

  describe("getInvoiceUrl (tested indirectly)", () => {
    const defaultParams = {
      prorationId: "proration-789",
      teamId: 3,
      isAutoCharge: false,
    };

    it("should return null when invoiceId is null", async () => {
      const mockProration = {
        invoiceId: null,
        monthKey: "2026-03",
        netSeatIncrease: 1,
        proratedAmount: 1000,
        status: "PENDING",
      };

      const mockTeam = {
        id: 3,
        name: "Test Team 3",
        adminAndOwners: [
          {
            id: 1,
            name: "Test User",
            email: "test@example.com",
            t: mockT,
          },
        ],
      };

      mockFindForEmail.mockResolvedValueOnce(mockProration);
      mockGetUserAndTeamWithBillingPermission.mockResolvedValueOnce({
        team: mockTeam,
      });

      await service.sendInvoiceEmail(defaultParams);

      expect(mocks.stripe.invoices.retrieve).not.toHaveBeenCalled();
      expect(mocks.sendProrationInvoiceEmails).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceUrl: null,
        })
      );
    });

    it("should handle stripe error and return null", async () => {
      const mockProration = {
        invoiceId: "inv_789",
        monthKey: "2026-03",
        netSeatIncrease: 1,
        proratedAmount: 1000,
        status: "PENDING",
      };

      const mockTeam = {
        id: 3,
        name: "Test Team 3",
        adminAndOwners: [
          {
            id: 1,
            name: "Test User",
            email: "test@example.com",
            t: mockT,
          },
        ],
      };

      mockFindForEmail.mockResolvedValueOnce(mockProration);
      mockGetUserAndTeamWithBillingPermission.mockResolvedValueOnce({
        team: mockTeam,
      });

      mocks.stripe.invoices.retrieve.mockRejectedValueOnce(new Error("Network error"));

      await service.sendInvoiceEmail(defaultParams);

      expect(mocks.stripe.invoices.retrieve).toHaveBeenCalledWith("inv_789");
      expect(mocks.sendProrationInvoiceEmails).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceUrl: null,
        })
      );
    });

    it("should successfully return invoice URL", async () => {
      const mockProration = {
        invoiceId: "inv_success",
        monthKey: "2026-03",
        netSeatIncrease: 1,
        proratedAmount: 1000,
        status: "PENDING",
      };

      const mockTeam = {
        id: 3,
        name: "Test Team 3",
        adminAndOwners: [
          {
            id: 1,
            name: "Test User",
            email: "test@example.com",
            t: mockT,
          },
        ],
      };

      mockFindForEmail.mockResolvedValueOnce(mockProration);
      mockGetUserAndTeamWithBillingPermission.mockResolvedValueOnce({
        team: mockTeam,
      });

      mocks.stripe.invoices.retrieve.mockResolvedValueOnce({
        hosted_invoice_url: "https://invoice.stripe.com/success",
      });

      await service.sendInvoiceEmail(defaultParams);

      expect(mocks.stripe.invoices.retrieve).toHaveBeenCalledWith("inv_success");
      expect(mocks.sendProrationInvoiceEmails).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceUrl: "https://invoice.stripe.com/success",
        })
      );
    });

    it("should return null when invoice has no hosted_invoice_url", async () => {
      const mockProration = {
        invoiceId: "inv_no_url",
        monthKey: "2026-03",
        netSeatIncrease: 1,
        proratedAmount: 1000,
        status: "PENDING",
      };

      const mockTeam = {
        id: 3,
        name: "Test Team 3",
        adminAndOwners: [
          {
            id: 1,
            name: "Test User",
            email: "test@example.com",
            t: mockT,
          },
        ],
      };

      mockFindForEmail.mockResolvedValueOnce(mockProration);
      mockGetUserAndTeamWithBillingPermission.mockResolvedValueOnce({
        team: mockTeam,
      });

      mocks.stripe.invoices.retrieve.mockResolvedValueOnce({
        hosted_invoice_url: null,
      });

      await service.sendInvoiceEmail(defaultParams);

      expect(mocks.stripe.invoices.retrieve).toHaveBeenCalledWith("inv_no_url");
      expect(mocks.sendProrationInvoiceEmails).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceUrl: null,
        })
      );
    });
  });
});
