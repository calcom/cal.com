import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  IDunningRepository,
  RawDunningRecordForBilling,
} from "../../../repository/dunning/IDunningRepository";
import {
  BaseDunningService,
  CANCEL_DAYS,
  HARD_BLOCK_DAYS,
  SOFT_BLOCK_DAYS,
} from "../BaseDunningService";

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

vi.mock("../../../constants", () => ({
  ENTERPRISE_SLUGS: ["enterprise-acme"],
}));

function createMockRepository(): {
  [K in keyof IDunningRepository]: ReturnType<typeof vi.fn>;
} {
  return {
    findByBillingId: vi.fn(),
    upsert: vi.fn(),
    findEntitiesToAdvance: vi.fn(),
    findByBillingIds: vi.fn(),
    advanceStatus: vi.fn(),
  };
}

function makeRawRecord(
  overrides: Partial<{
    id: string;
    billingFk: string;
    status: string;
    firstFailedAt: Date | null;
    lastFailedAt: Date | null;
    resolvedAt: Date | null;
    subscriptionId: string | null;
    failedInvoiceId: string | null;
    invoiceUrl: string | null;
    failureReason: string | null;
    notificationsSent: number;
    createdAt: Date;
    updatedAt: Date;
  }> = {}
) {
  const now = new Date();
  return {
    id: "dun_1",
    billingFk: "billing_1",
    status: "WARNING" as const,
    firstFailedAt: now,
    lastFailedAt: now,
    resolvedAt: null,
    subscriptionId: null,
    failedInvoiceId: null,
    invoiceUrl: null,
    failureReason: null,
    notificationsSent: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeRawRecordForBilling(
  overrides: Partial<RawDunningRecordForBilling> = {}
): RawDunningRecordForBilling {
  return {
    billingFk: "billing_1",
    teamId: 100,
    status: "WARNING",
    firstFailedAt: new Date(),
    invoiceUrl: null,
    failureReason: null,
    entityName: "Team Alpha",
    entitySlug: "team-alpha",
    isOrganization: false,
    ...overrides,
  };
}

describe("BaseDunningService", () => {
  let service: BaseDunningService;
  let mockRepo: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-18T12:00:00Z"));
    mockRepo = createMockRepository();
    service = new BaseDunningService(
      { dunningRepository: mockRepo as unknown as IDunningRepository },
      "team"
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("constants", () => {
    it("defines SOFT_BLOCK_DAYS as 7", () => {
      expect(SOFT_BLOCK_DAYS).toBe(7);
    });

    it("defines HARD_BLOCK_DAYS as 14", () => {
      expect(HARD_BLOCK_DAYS).toBe(14);
    });

    it("defines CANCEL_DAYS as 90", () => {
      expect(CANCEL_DAYS).toBe(90);
    });
  });

  describe("onPaymentFailed", () => {
    const baseParams = {
      billingId: "billing_1",
      subscriptionId: "sub_123",
      failedInvoiceId: "inv_456",
      invoiceUrl: "https://stripe.com/invoice/inv_456",
      failureReason: "card_declined",
    };

    it("creates a new WARNING record when no existing dunning record", async () => {
      mockRepo.findByBillingId.mockResolvedValue(null);
      mockRepo.upsert.mockResolvedValue(makeRawRecord());

      const result = await service.onPaymentFailed(baseParams);

      expect(result).toEqual({ isNewDunningRecord: true });
      expect(mockRepo.findByBillingId).toHaveBeenCalledWith("billing_1");
      expect(mockRepo.upsert).toHaveBeenCalledWith("billing_1", {
        status: "WARNING",
        firstFailedAt: new Date("2026-02-18T12:00:00Z"),
        lastFailedAt: new Date("2026-02-18T12:00:00Z"),
        resolvedAt: null,
        subscriptionId: "sub_123",
        failedInvoiceId: "inv_456",
        invoiceUrl: "https://stripe.com/invoice/inv_456",
        failureReason: "card_declined",
      });
    });

    it("preserves existing status and firstFailedAt when record already exists in non-CURRENT state", async () => {
      const existingFirstFailed = new Date("2026-02-10T10:00:00Z");
      mockRepo.findByBillingId.mockResolvedValue(
        makeRawRecord({
          status: "SOFT_BLOCKED",
          firstFailedAt: existingFirstFailed,
          lastFailedAt: new Date("2026-02-15T10:00:00Z"),
        })
      );
      mockRepo.upsert.mockResolvedValue(makeRawRecord());

      const result = await service.onPaymentFailed(baseParams);

      expect(result).toEqual({ isNewDunningRecord: false });
      expect(mockRepo.upsert).toHaveBeenCalledWith(
        "billing_1",
        expect.objectContaining({
          status: "SOFT_BLOCKED",
          firstFailedAt: existingFirstFailed,
        })
      );
    });

    it("treats CURRENT status as new dunning record", async () => {
      mockRepo.findByBillingId.mockResolvedValue(
        makeRawRecord({
          status: "CURRENT",
          resolvedAt: new Date("2026-01-02T00:00:00Z"),
        })
      );
      mockRepo.upsert.mockResolvedValue(makeRawRecord());

      const result = await service.onPaymentFailed(baseParams);

      expect(result).toEqual({ isNewDunningRecord: true });
      expect(mockRepo.upsert).toHaveBeenCalledWith(
        "billing_1",
        expect.objectContaining({
          status: "WARNING",
          resolvedAt: null,
        })
      );
    });

    it("handles null invoiceUrl", async () => {
      mockRepo.findByBillingId.mockResolvedValue(null);
      mockRepo.upsert.mockResolvedValue(makeRawRecord());

      await service.onPaymentFailed({ ...baseParams, invoiceUrl: null });

      expect(mockRepo.upsert).toHaveBeenCalledWith(
        "billing_1",
        expect.objectContaining({ invoiceUrl: null })
      );
    });
  });

  describe("onPaymentSucceeded", () => {
    it("does nothing when no existing dunning record", async () => {
      mockRepo.findByBillingId.mockResolvedValue(null);

      await service.onPaymentSucceeded("billing_1");

      expect(mockRepo.upsert).not.toHaveBeenCalled();
    });

    it("does nothing when already CURRENT", async () => {
      mockRepo.findByBillingId.mockResolvedValue(
        makeRawRecord({ status: "CURRENT" })
      );

      await service.onPaymentSucceeded("billing_1");

      expect(mockRepo.upsert).not.toHaveBeenCalled();
    });

    it("recovers from WARNING to CURRENT", async () => {
      mockRepo.findByBillingId.mockResolvedValue(
        makeRawRecord({ status: "WARNING" })
      );
      mockRepo.upsert.mockResolvedValue(makeRawRecord());

      await service.onPaymentSucceeded("billing_1");

      expect(mockRepo.upsert).toHaveBeenCalledWith("billing_1", {
        status: "CURRENT",
        resolvedAt: new Date("2026-02-18T12:00:00Z"),
        failedInvoiceId: null,
        invoiceUrl: null,
      });
    });

    it("recovers from SOFT_BLOCKED to CURRENT", async () => {
      mockRepo.findByBillingId.mockResolvedValue(
        makeRawRecord({ status: "SOFT_BLOCKED" })
      );
      mockRepo.upsert.mockResolvedValue(makeRawRecord());

      await service.onPaymentSucceeded("billing_1");

      expect(mockRepo.upsert).toHaveBeenCalledWith("billing_1", {
        status: "CURRENT",
        resolvedAt: new Date("2026-02-18T12:00:00Z"),
        failedInvoiceId: null,
        invoiceUrl: null,
      });
    });

    it("recovers from HARD_BLOCKED to CURRENT", async () => {
      mockRepo.findByBillingId.mockResolvedValue(
        makeRawRecord({ status: "HARD_BLOCKED" })
      );
      mockRepo.upsert.mockResolvedValue(makeRawRecord());

      await service.onPaymentSucceeded("billing_1");

      expect(mockRepo.upsert).toHaveBeenCalledWith(
        "billing_1",
        expect.objectContaining({ status: "CURRENT" })
      );
    });

    it("recovers from CANCELLED to CURRENT", async () => {
      mockRepo.findByBillingId.mockResolvedValue(
        makeRawRecord({ status: "CANCELLED" })
      );
      mockRepo.upsert.mockResolvedValue(makeRawRecord());

      await service.onPaymentSucceeded("billing_1");

      expect(mockRepo.upsert).toHaveBeenCalledWith(
        "billing_1",
        expect.objectContaining({ status: "CURRENT" })
      );
    });
  });

  describe("getBillingIdsToAdvance", () => {
    it("returns empty array when no entities need advancement", async () => {
      mockRepo.findEntitiesToAdvance.mockResolvedValue([]);

      const result = await service.getBillingIdsToAdvance();

      expect(result).toEqual([]);
    });

    it("returns billingFk values from repository results", async () => {
      mockRepo.findEntitiesToAdvance.mockResolvedValue([
        makeRawRecord({ billingFk: "billing_10" }),
        makeRawRecord({ billingFk: "billing_20" }),
      ]);

      const result = await service.getBillingIdsToAdvance();

      expect(result).toEqual(["billing_10", "billing_20"]);
    });
  });

  describe("advanceDunning", () => {
    it("returns not advanced when no dunning record exists", async () => {
      mockRepo.findByBillingId.mockResolvedValue(null);

      const result = await service.advanceDunning("billing_1");

      expect(result).toEqual({ advanced: false });
      expect(mockRepo.advanceStatus).not.toHaveBeenCalled();
    });

    it("returns not advanced when status is CURRENT", async () => {
      mockRepo.findByBillingId.mockResolvedValue(
        makeRawRecord({ status: "CURRENT" })
      );

      const result = await service.advanceDunning("billing_1");

      expect(result).toEqual({ advanced: false });
    });

    it("returns not advanced when firstFailedAt is null", async () => {
      mockRepo.findByBillingId.mockResolvedValue(
        makeRawRecord({ status: "WARNING", firstFailedAt: null })
      );

      const result = await service.advanceDunning("billing_1");

      expect(result).toEqual({ advanced: false });
      expect(mockRepo.advanceStatus).not.toHaveBeenCalled();
    });

    it("advances WARNING to SOFT_BLOCKED after 7 days", async () => {
      mockRepo.findByBillingId.mockResolvedValue(
        makeRawRecord({
          billingFk: "billing_1",
          status: "WARNING",
          firstFailedAt: new Date("2026-02-11T11:00:00Z"),
        })
      );

      const result = await service.advanceDunning("billing_1");

      expect(mockRepo.advanceStatus).toHaveBeenCalledWith(
        "billing_1",
        "SOFT_BLOCKED"
      );
      expect(result).toEqual({
        advanced: true,
        from: "WARNING",
        to: "SOFT_BLOCKED",
      });
    });

    it("does not advance WARNING before 7 days", async () => {
      mockRepo.findByBillingId.mockResolvedValue(
        makeRawRecord({
          status: "WARNING",
          firstFailedAt: new Date("2026-02-12T13:00:00Z"),
        })
      );

      const result = await service.advanceDunning("billing_1");

      expect(result).toEqual({ advanced: false });
      expect(mockRepo.advanceStatus).not.toHaveBeenCalled();
    });

    it("advances SOFT_BLOCKED to HARD_BLOCKED after 14 days", async () => {
      mockRepo.findByBillingId.mockResolvedValue(
        makeRawRecord({
          billingFk: "billing_2",
          status: "SOFT_BLOCKED",
          firstFailedAt: new Date("2026-02-04T11:00:00Z"),
        })
      );

      const result = await service.advanceDunning("billing_2");

      expect(mockRepo.advanceStatus).toHaveBeenCalledWith(
        "billing_2",
        "HARD_BLOCKED"
      );
      expect(result).toEqual({
        advanced: true,
        from: "SOFT_BLOCKED",
        to: "HARD_BLOCKED",
      });
    });

    it("does not advance SOFT_BLOCKED before 14 days", async () => {
      mockRepo.findByBillingId.mockResolvedValue(
        makeRawRecord({
          status: "SOFT_BLOCKED",
          firstFailedAt: new Date("2026-02-05T13:00:00Z"),
        })
      );

      const result = await service.advanceDunning("billing_1");

      expect(result).toEqual({ advanced: false });
      expect(mockRepo.advanceStatus).not.toHaveBeenCalled();
    });

    it("advances WARNING directly to HARD_BLOCKED if 14+ days elapsed", async () => {
      mockRepo.findByBillingId.mockResolvedValue(
        makeRawRecord({
          billingFk: "billing_5",
          status: "WARNING",
          firstFailedAt: new Date("2026-02-01T00:00:00Z"),
        })
      );

      const result = await service.advanceDunning("billing_5");

      expect(mockRepo.advanceStatus).toHaveBeenCalledWith(
        "billing_5",
        "HARD_BLOCKED"
      );
      expect(result).toEqual({
        advanced: true,
        from: "WARNING",
        to: "HARD_BLOCKED",
      });
    });

    it("advances HARD_BLOCKED to CANCELLED after 90 days", async () => {
      mockRepo.findByBillingId.mockResolvedValue(
        makeRawRecord({
          billingFk: "billing_6",
          status: "HARD_BLOCKED",
          firstFailedAt: new Date("2025-11-19T11:00:00Z"),
        })
      );

      const result = await service.advanceDunning("billing_6");

      expect(mockRepo.advanceStatus).toHaveBeenCalledWith(
        "billing_6",
        "CANCELLED"
      );
      expect(result).toEqual({
        advanced: true,
        from: "HARD_BLOCKED",
        to: "CANCELLED",
      });
    });

    it("does not advance HARD_BLOCKED before 90 days", async () => {
      mockRepo.findByBillingId.mockResolvedValue(
        makeRawRecord({
          status: "HARD_BLOCKED",
          firstFailedAt: new Date("2025-11-22T13:00:00Z"),
        })
      );

      const result = await service.advanceDunning("billing_1");

      expect(result).toEqual({ advanced: false });
      expect(mockRepo.advanceStatus).not.toHaveBeenCalled();
    });

    it("does not advance CANCELLED status further", async () => {
      mockRepo.findByBillingId.mockResolvedValue(
        makeRawRecord({
          status: "CANCELLED",
          firstFailedAt: new Date("2025-12-01T00:00:00Z"),
        })
      );

      const result = await service.advanceDunning("billing_1");

      expect(result).toEqual({ advanced: false });
      expect(mockRepo.advanceStatus).not.toHaveBeenCalled();
    });
  });

  describe("getStatus", () => {
    it("returns CURRENT when no dunning record exists", async () => {
      mockRepo.findByBillingId.mockResolvedValue(null);

      const status = await service.getStatus("billing_1");

      expect(status).toBe("CURRENT");
    });

    it("returns the status from existing dunning record", async () => {
      mockRepo.findByBillingId.mockResolvedValue(
        makeRawRecord({ status: "SOFT_BLOCKED" })
      );

      const status = await service.getStatus("billing_1");

      expect(status).toBe("SOFT_BLOCKED");
    });

    it("returns HARD_BLOCKED status correctly", async () => {
      mockRepo.findByBillingId.mockResolvedValue(
        makeRawRecord({ status: "HARD_BLOCKED" })
      );

      const status = await service.getStatus("billing_1");

      expect(status).toBe("HARD_BLOCKED");
    });
  });

  describe("findByBillingIds", () => {
    it("returns empty array for empty input", async () => {
      const result = await service.findByBillingIds([]);

      expect(result).toEqual([]);
      expect(mockRepo.findByBillingIds).not.toHaveBeenCalled();
    });

    it("maps raw records to DunningRecordForBilling with correct entityType", async () => {
      mockRepo.findByBillingIds.mockResolvedValue([
        makeRawRecordForBilling({
          billingFk: "billing_10",
          teamId: 200,
          entityName: "Team Beta",
        }),
      ]);

      const result = await service.findByBillingIds(["billing_10"]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          billingId: "billing_10",
          teamId: 200,
          entityType: "team",
          entityName: "Team Beta",
        })
      );
    });
  });

  describe("getBannerData", () => {
    it("returns empty array when no billing ids provided", async () => {
      const result = await service.getBannerData([]);

      expect(result).toEqual([]);
    });

    it("returns banner records for multiple teams with different statuses", async () => {
      mockRepo.findByBillingIds.mockResolvedValue([
        makeRawRecordForBilling({
          billingFk: "billing_10",
          teamId: 200,
          status: "WARNING",
          entityName: "Team Alpha",
          entitySlug: "team-alpha",
          isOrganization: false,
          invoiceUrl: "https://stripe.com/invoice/inv_1",
        }),
        makeRawRecordForBilling({
          billingFk: "billing_20",
          teamId: 300,
          status: "SOFT_BLOCKED",
          entityName: "Team Beta",
          entitySlug: "team-beta",
          isOrganization: false,
          invoiceUrl: "https://stripe.com/invoice/inv_2",
        }),
        makeRawRecordForBilling({
          billingFk: "billing_30",
          teamId: 400,
          status: "HARD_BLOCKED",
          entityName: "Team Gamma",
          entitySlug: "team-gamma",
          isOrganization: false,
          invoiceUrl: null,
        }),
      ]);

      const result = await service.getBannerData([
        "billing_10",
        "billing_20",
        "billing_30",
      ]);

      expect(result).toHaveLength(3);
      expect(result).toEqual([
        {
          teamId: 200,
          teamName: "Team Alpha",
          isOrganization: false,
          status: "WARNING",
          isEnterprise: false,
          invoiceUrl: "https://stripe.com/invoice/inv_1",
        },
        {
          teamId: 300,
          teamName: "Team Beta",
          isOrganization: false,
          status: "SOFT_BLOCKED",
          isEnterprise: false,
          invoiceUrl: "https://stripe.com/invoice/inv_2",
        },
        {
          teamId: 400,
          teamName: "Team Gamma",
          isOrganization: false,
          status: "HARD_BLOCKED",
          isEnterprise: false,
          invoiceUrl: null,
        },
      ]);
    });

    it("sets isEnterprise true when entitySlug matches ENTERPRISE_SLUGS", async () => {
      mockRepo.findByBillingIds.mockResolvedValue([
        makeRawRecordForBilling({
          billingFk: "billing_ent",
          teamId: 500,
          status: "WARNING",
          entityName: "Enterprise Acme",
          entitySlug: "enterprise-acme",
          isOrganization: false,
        }),
      ]);

      const result = await service.getBannerData(["billing_ent"]);

      expect(result).toHaveLength(1);
      expect(result[0].isEnterprise).toBe(true);
    });

    it("sets isEnterprise false when entitySlug is null", async () => {
      mockRepo.findByBillingIds.mockResolvedValue([
        makeRawRecordForBilling({
          billingFk: "billing_no_slug",
          teamId: 600,
          entitySlug: null,
        }),
      ]);

      const result = await service.getBannerData(["billing_no_slug"]);

      expect(result[0].isEnterprise).toBe(false);
    });

    it("defaults teamName to empty string when entityName is null", async () => {
      mockRepo.findByBillingIds.mockResolvedValue([
        makeRawRecordForBilling({
          billingFk: "billing_no_name",
          teamId: 700,
          entityName: null,
        }),
      ]);

      const result = await service.getBannerData(["billing_no_name"]);

      expect(result[0].teamName).toBe("");
    });
  });
});
