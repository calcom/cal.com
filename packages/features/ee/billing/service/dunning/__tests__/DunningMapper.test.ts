import { describe, expect, it } from "vitest";

import type { RawDunningRecord, RawDunningRecordForBilling } from "../../../repository/dunning/IDunningRepository";
import { toDunningRecord, toDunningRecordForBilling } from "../DunningMapper";

describe("DunningMapper", () => {
  describe("toDunningRecord", () => {
    const now = new Date("2026-02-18T12:00:00Z");
    const raw: RawDunningRecord = {
      id: "dun_1",
      billingFk: "billing_123",
      status: "WARNING",
      firstFailedAt: now,
      lastFailedAt: now,
      resolvedAt: null,
      subscriptionId: "sub_1",
      failedInvoiceId: "inv_1",
      invoiceUrl: "https://example.com/inv",
      failureReason: "card_declined",
      notificationsSent: 2,
      createdAt: now,
      updatedAt: now,
    };

    it("maps all fields correctly", () => {
      const result = toDunningRecord(raw, "team");
      expect(result).toEqual({
        id: "dun_1",
        billingId: "billing_123",
        entityType: "team",
        status: "WARNING",
        firstFailedAt: now,
        lastFailedAt: now,
        resolvedAt: null,
        subscriptionId: "sub_1",
        failedInvoiceId: "inv_1",
        invoiceUrl: "https://example.com/inv",
        failureReason: "card_declined",
        notificationsSent: 2,
        createdAt: now,
        updatedAt: now,
      });
    });

    it("maps billingFk to billingId", () => {
      const result = toDunningRecord(raw, "team");
      expect(result.billingId).toBe("billing_123");
    });

    it("sets entityType to 'team' when passed 'team'", () => {
      const result = toDunningRecord(raw, "team");
      expect(result.entityType).toBe("team");
    });

    it("sets entityType to 'organization' when passed 'organization'", () => {
      const result = toDunningRecord(raw, "organization");
      expect(result.entityType).toBe("organization");
    });

    it("preserves null fields", () => {
      const rawWithNulls: RawDunningRecord = {
        ...raw,
        firstFailedAt: null,
        lastFailedAt: null,
        resolvedAt: null,
        subscriptionId: null,
        failedInvoiceId: null,
        invoiceUrl: null,
        failureReason: null,
      };
      const result = toDunningRecord(rawWithNulls, "team");
      expect(result.firstFailedAt).toBeNull();
      expect(result.subscriptionId).toBeNull();
      expect(result.invoiceUrl).toBeNull();
    });
  });

  describe("toDunningRecordForBilling", () => {
    const raw: RawDunningRecordForBilling = {
      billingFk: "billing_456",
      teamId: 42,
      status: "SOFT_BLOCKED",
      firstFailedAt: new Date("2026-02-10T00:00:00Z"),
      invoiceUrl: "https://example.com/inv2",
      failureReason: "insufficient_funds",
      entityName: "Acme Corp",
      isOrganization: true,
    };

    it("maps all fields correctly", () => {
      const result = toDunningRecordForBilling(raw, "organization");
      expect(result).toEqual({
        billingId: "billing_456",
        teamId: 42,
        entityType: "organization",
        status: "SOFT_BLOCKED",
        firstFailedAt: new Date("2026-02-10T00:00:00Z"),
        invoiceUrl: "https://example.com/inv2",
        failureReason: "insufficient_funds",
        entityName: "Acme Corp",
        isOrganization: true,
      });
    });

    it("sets entityType to 'team' when passed 'team'", () => {
      const result = toDunningRecordForBilling(raw, "team");
      expect(result.entityType).toBe("team");
    });

    it("maps billingFk to billingId", () => {
      const result = toDunningRecordForBilling(raw, "organization");
      expect(result.billingId).toBe("billing_456");
    });
  });
});
