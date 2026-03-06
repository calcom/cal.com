import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DunningServiceFactory } from "./DunningServiceFactory";
import { DunningEmailService } from "./DunningEmailService";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

const mockGetUserAndTeam = vi.fn();
vi.mock("../../helpers/getUserAndTeamWithBillingPermission", () => ({
  getUserAndTeamWithBillingPermission: (...args: unknown[]) => mockGetUserAndTeam(...args),
}));

const mockSendWarning = vi.fn();
const mockSendSoftBlock = vi.fn();
const mockSendPause = vi.fn();
const mockSendCancellation = vi.fn();
vi.mock("@calcom/emails/billing-email-service", () => ({
  sendDunningWarningEmails: (...args: unknown[]) => mockSendWarning(...args),
  sendDunningSoftBlockEmails: (...args: unknown[]) => mockSendSoftBlock(...args),
  sendDunningPauseEmails: (...args: unknown[]) => mockSendPause(...args),
  sendDunningCancellationEmails: (...args: unknown[]) => mockSendCancellation(...args),
}));

const mockPrismaClient = {} as never;
vi.mock("@calcom/prisma", () => ({
  prisma: {},
}));

const mockTeam = {
  id: 10,
  name: "Test Team",
  adminAndOwners: [{ id: 1, name: "Admin", email: "admin@test.com", t: ((key: string) => key) as never }],
};

const mockDunningRecord = {
  id: "dns_1",
  billingId: "billing_123",
  entityType: "team" as const,
  status: "WARNING" as const,
  firstFailedAt: new Date("2026-02-01T00:00:00Z"),
  lastFailedAt: new Date("2026-02-15T00:00:00Z"),
  resolvedAt: null,
  subscriptionId: "sub_123",
  failedInvoiceId: "inv_456",
  invoiceUrl: "https://stripe.com/invoice/inv_123",
  failureReason: "card_declined",
  notificationsSent: 1,
  createdAt: new Date("2026-02-01T00:00:00Z"),
  updatedAt: new Date("2026-02-15T00:00:00Z"),
};

function createMockDunningServiceFactory(record: typeof mockDunningRecord | null = mockDunningRecord) {
  const mockService = {
    findRecord: vi.fn().mockResolvedValue(record),
  };
  return {
    forTeam: vi.fn().mockResolvedValue(
      record ? { service: mockService, billingId: "billing_123", entityType: "team" as const } : null
    ),
    _mockService: mockService,
  };
}

describe("DunningEmailService", () => {
  let service: DunningEmailService;
  let mockFactory: ReturnType<typeof createMockDunningServiceFactory>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFactory = createMockDunningServiceFactory();
    service = new DunningEmailService({
      dunningServiceFactory: mockFactory as unknown as DunningServiceFactory,
      prismaClient: mockPrismaClient,
    });
  });

  describe("sendWarningEmail", () => {
    it("fetches dunning record and sends warning emails to team admins", async () => {
      mockGetUserAndTeam.mockResolvedValue({ team: mockTeam });

      await service.sendWarningEmail(10);

      expect(mockFactory.forTeam).toHaveBeenCalledWith(10);
      expect(mockFactory._mockService.findRecord).toHaveBeenCalledWith("billing_123");
      expect(mockSendWarning).toHaveBeenCalledWith({
        team: { id: 10, name: "Test Team" },
        invoiceUrl: "https://stripe.com/invoice/inv_123",
        adminAndOwners: mockTeam.adminAndOwners,
      });
    });

    it("skips when no dunning record exists", async () => {
      mockFactory = createMockDunningServiceFactory(null);
      service = new DunningEmailService({
        dunningServiceFactory: mockFactory as unknown as DunningServiceFactory,
        prismaClient: mockPrismaClient,
      });

      await service.sendWarningEmail(10);

      expect(mockGetUserAndTeam).not.toHaveBeenCalled();
      expect(mockSendWarning).not.toHaveBeenCalled();
    });

    it("skips when no team or admins found", async () => {
      mockGetUserAndTeam.mockResolvedValue({ team: undefined });

      await service.sendWarningEmail(10);

      expect(mockSendWarning).not.toHaveBeenCalled();
    });
  });

  describe("sendSoftBlockEmail", () => {
    it("fetches dunning record and sends soft block emails to team admins", async () => {
      mockGetUserAndTeam.mockResolvedValue({ team: mockTeam });

      await service.sendSoftBlockEmail(10);

      expect(mockFactory.forTeam).toHaveBeenCalledWith(10);
      expect(mockSendSoftBlock).toHaveBeenCalledWith({
        team: { id: 10, name: "Test Team" },
        invoiceUrl: "https://stripe.com/invoice/inv_123",
        adminAndOwners: mockTeam.adminAndOwners,
      });
    });

    it("skips when no dunning record exists", async () => {
      mockFactory = createMockDunningServiceFactory(null);
      service = new DunningEmailService({
        dunningServiceFactory: mockFactory as unknown as DunningServiceFactory,
        prismaClient: mockPrismaClient,
      });

      await service.sendSoftBlockEmail(10);

      expect(mockSendSoftBlock).not.toHaveBeenCalled();
    });
  });

  describe("sendPauseEmail", () => {
    it("fetches dunning record and sends pause emails", async () => {
      mockGetUserAndTeam.mockResolvedValue({ team: mockTeam });

      await service.sendPauseEmail(10);

      expect(mockSendPause).toHaveBeenCalledWith({
        team: { id: 10, name: "Test Team" },
        invoiceUrl: "https://stripe.com/invoice/inv_123",
        adminAndOwners: mockTeam.adminAndOwners,
      });
    });

    it("skips when no dunning record exists", async () => {
      mockFactory = createMockDunningServiceFactory(null);
      service = new DunningEmailService({
        dunningServiceFactory: mockFactory as unknown as DunningServiceFactory,
        prismaClient: mockPrismaClient,
      });

      await service.sendPauseEmail(10);

      expect(mockSendPause).not.toHaveBeenCalled();
    });
  });

  describe("sendCancellationEmail", () => {
    it("fetches dunning record and sends cancellation emails", async () => {
      mockGetUserAndTeam.mockResolvedValue({ team: mockTeam });

      await service.sendCancellationEmail(10);

      expect(mockSendCancellation).toHaveBeenCalledWith({
        team: { id: 10, name: "Test Team" },
        invoiceUrl: "https://stripe.com/invoice/inv_123",
        adminAndOwners: mockTeam.adminAndOwners,
      });
    });

    it("skips when no dunning record exists", async () => {
      mockFactory = createMockDunningServiceFactory(null);
      service = new DunningEmailService({
        dunningServiceFactory: mockFactory as unknown as DunningServiceFactory,
        prismaClient: mockPrismaClient,
      });

      await service.sendCancellationEmail(10);

      expect(mockSendCancellation).not.toHaveBeenCalled();
    });
  });
});
