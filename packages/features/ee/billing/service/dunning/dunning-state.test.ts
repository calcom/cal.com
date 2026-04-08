import { describe, expect, it } from "vitest";

import type { RawDunningRecord } from "../../repository/dunning/IDunningRepository";
import { CANCEL_DAYS, DunningState, HARD_BLOCK_DAYS, SOFT_BLOCK_DAYS, type DunningPolicy } from "./DunningState";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function makeRawRecord(overrides: Partial<RawDunningRecord> = {}): RawDunningRecord {
  const now = new Date();
  return {
    id: "dunning-1",
    billingFk: "billing-1",
    status: "WARNING",
    firstFailedAt: now,
    lastFailedAt: now,
    resolvedAt: null,
    subscriptionId: "sub-1",
    failedInvoiceId: "inv-1",
    invoiceUrl: "https://stripe.com/invoice/1",
    failureReason: "card_declined",
    notificationsSent: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("DunningState", () => {
  describe("fromRecord", () => {
    it("creates state from raw record", () => {
      const raw = makeRawRecord();
      const state = DunningState.fromRecord(raw, "team");
      expect(state.id).toBe("dunning-1");
      expect(state.billingId).toBe("billing-1");
      expect(state.entityType).toBe("team");
      expect(state.status).toBe("WARNING");
      expect(state.failureReason).toBe("card_declined");
    });

    it("handles organization entity type", () => {
      const raw = makeRawRecord();
      const state = DunningState.fromRecord(raw, "organization");
      expect(state.entityType).toBe("organization");
    });
  });

  describe("initial", () => {
    it("creates CURRENT state with no failures", () => {
      const state = DunningState.initial("billing-1", "team");
      expect(state.status).toBe("CURRENT");
      expect(state.billingId).toBe("billing-1");
      expect(state.entityType).toBe("team");
      expect(state.firstFailedAt).toBeNull();
      expect(state.lastFailedAt).toBeNull();
      expect(state.resolvedAt).toBeNull();
      expect(state.notificationsSent).toBe(0);
    });
  });

  describe("isInDunning", () => {
    it("returns false for CURRENT status", () => {
      const state = DunningState.initial("billing-1", "team");
      expect(state.isInDunning).toBe(false);
    });

    it("returns true for WARNING status", () => {
      const state = DunningState.fromRecord(makeRawRecord({ status: "WARNING" }), "team");
      expect(state.isInDunning).toBe(true);
    });

    it("returns true for SOFT_BLOCKED status", () => {
      const state = DunningState.fromRecord(makeRawRecord({ status: "SOFT_BLOCKED" }), "team");
      expect(state.isInDunning).toBe(true);
    });

    it("returns true for HARD_BLOCKED status", () => {
      const state = DunningState.fromRecord(makeRawRecord({ status: "HARD_BLOCKED" }), "team");
      expect(state.isInDunning).toBe(true);
    });

    it("returns true for CANCELLED status", () => {
      const state = DunningState.fromRecord(makeRawRecord({ status: "CANCELLED" }), "team");
      expect(state.isInDunning).toBe(true);
    });
  });

  describe("severity", () => {
    it("returns 0 for CURRENT", () => {
      expect(DunningState.severityOf("CURRENT")).toBe(0);
    });

    it("returns increasing severity values", () => {
      expect(DunningState.severityOf("WARNING")).toBe(1);
      expect(DunningState.severityOf("SOFT_BLOCKED")).toBe(2);
      expect(DunningState.severityOf("HARD_BLOCKED")).toBe(3);
      expect(DunningState.severityOf("CANCELLED")).toBe(4);
    });

    it("instance severity matches static severity", () => {
      const state = DunningState.fromRecord(makeRawRecord({ status: "HARD_BLOCKED" }), "team");
      expect(state.severity).toBe(DunningState.severityOf("HARD_BLOCKED"));
    });
  });

  describe("recordPaymentFailure", () => {
    const failureParams = {
      subscriptionId: "sub-new",
      failedInvoiceId: "inv-new",
      invoiceUrl: "https://stripe.com/invoice/new",
      failureReason: "insufficient_funds",
    };

    it("transitions CURRENT to WARNING on first failure", () => {
      const initial = DunningState.initial("billing-1", "team");
      const { state, isNewDunningRecord } = initial.recordPaymentFailure(failureParams);
      expect(state.status).toBe("WARNING");
      expect(isNewDunningRecord).toBe(true);
      expect(state.firstFailedAt).not.toBeNull();
      expect(state.lastFailedAt).not.toBeNull();
      expect(state.resolvedAt).toBeNull();
    });

    it("keeps existing status for subsequent failures", () => {
      const existing = DunningState.fromRecord(makeRawRecord({ status: "SOFT_BLOCKED" }), "team");
      const { state, isNewDunningRecord } = existing.recordPaymentFailure(failureParams);
      expect(state.status).toBe("SOFT_BLOCKED");
      expect(isNewDunningRecord).toBe(false);
    });

    it("preserves firstFailedAt on subsequent failures", () => {
      const originalDate = new Date("2025-01-01");
      const existing = DunningState.fromRecord(
        makeRawRecord({ status: "WARNING", firstFailedAt: originalDate }),
        "team"
      );
      const { state } = existing.recordPaymentFailure(failureParams);
      expect(state.firstFailedAt).toBe(originalDate);
    });

    it("updates failureReason and invoice info", () => {
      const existing = DunningState.fromRecord(makeRawRecord(), "team");
      const { state } = existing.recordPaymentFailure(failureParams);
      expect(state.failureReason).toBe("insufficient_funds");
      expect(state.failedInvoiceId).toBe("inv-new");
      expect(state.subscriptionId).toBe("sub-new");
    });
  });

  describe("resolve", () => {
    it("sets status back to CURRENT", () => {
      const warning = DunningState.fromRecord(makeRawRecord({ status: "WARNING" }), "team");
      const resolved = warning.resolve();
      expect(resolved.status).toBe("CURRENT");
      expect(resolved.resolvedAt).not.toBeNull();
      expect(resolved.failedInvoiceId).toBeNull();
      expect(resolved.invoiceUrl).toBeNull();
    });

    it("can resolve from HARD_BLOCKED", () => {
      const blocked = DunningState.fromRecord(makeRawRecord({ status: "HARD_BLOCKED" }), "team");
      const resolved = blocked.resolve();
      expect(resolved.status).toBe("CURRENT");
    });
  });

  describe("advance", () => {
    it("returns null for CURRENT status", () => {
      const state = DunningState.initial("billing-1", "team");
      expect(state.advance(new Date())).toBeNull();
    });

    it("returns null when no firstFailedAt", () => {
      const state = DunningState.fromRecord(
        makeRawRecord({ status: "WARNING", firstFailedAt: null }),
        "team"
      );
      expect(state.advance(new Date())).toBeNull();
    });

    it("advances WARNING to SOFT_BLOCKED after soft block days", () => {
      const firstFailed = new Date("2025-01-01");
      const state = DunningState.fromRecord(
        makeRawRecord({ status: "WARNING", firstFailedAt: firstFailed }),
        "team"
      );
      const now = new Date(firstFailed.getTime() + SOFT_BLOCK_DAYS * MS_PER_DAY);
      const result = state.advance(now);
      expect(result).not.toBeNull();
      expect(result!.from).toBe("WARNING");
      expect(result!.to).toBe("SOFT_BLOCKED");
      expect(result!.state.status).toBe("SOFT_BLOCKED");
    });

    it("does not advance WARNING before soft block days", () => {
      const firstFailed = new Date("2025-01-01");
      const state = DunningState.fromRecord(
        makeRawRecord({ status: "WARNING", firstFailedAt: firstFailed }),
        "team"
      );
      const now = new Date(firstFailed.getTime() + (SOFT_BLOCK_DAYS - 1) * MS_PER_DAY);
      expect(state.advance(now)).toBeNull();
    });

    it("advances WARNING to HARD_BLOCKED after hard block days", () => {
      const firstFailed = new Date("2025-01-01");
      const state = DunningState.fromRecord(
        makeRawRecord({ status: "WARNING", firstFailedAt: firstFailed }),
        "team"
      );
      const now = new Date(firstFailed.getTime() + HARD_BLOCK_DAYS * MS_PER_DAY);
      const result = state.advance(now);
      expect(result).not.toBeNull();
      // HARD_BLOCK_DAYS >= SOFT_BLOCK_DAYS so it picks the highest applicable transition
      expect(result!.to).toBe("HARD_BLOCKED");
    });

    it("advances SOFT_BLOCKED to HARD_BLOCKED after hard block days", () => {
      const firstFailed = new Date("2025-01-01");
      const state = DunningState.fromRecord(
        makeRawRecord({ status: "SOFT_BLOCKED", firstFailedAt: firstFailed }),
        "team"
      );
      const now = new Date(firstFailed.getTime() + HARD_BLOCK_DAYS * MS_PER_DAY);
      const result = state.advance(now);
      expect(result).not.toBeNull();
      expect(result!.from).toBe("SOFT_BLOCKED");
      expect(result!.to).toBe("HARD_BLOCKED");
    });

    it("advances HARD_BLOCKED to CANCELLED after cancel days", () => {
      const firstFailed = new Date("2025-01-01");
      const state = DunningState.fromRecord(
        makeRawRecord({ status: "HARD_BLOCKED", firstFailedAt: firstFailed }),
        "team"
      );
      const now = new Date(firstFailed.getTime() + CANCEL_DAYS * MS_PER_DAY);
      const result = state.advance(now);
      expect(result).not.toBeNull();
      expect(result!.from).toBe("HARD_BLOCKED");
      expect(result!.to).toBe("CANCELLED");
    });

    it("does not advance HARD_BLOCKED before cancel days", () => {
      const firstFailed = new Date("2025-01-01");
      const state = DunningState.fromRecord(
        makeRawRecord({ status: "HARD_BLOCKED", firstFailedAt: firstFailed }),
        "team"
      );
      const now = new Date(firstFailed.getTime() + (CANCEL_DAYS - 1) * MS_PER_DAY);
      expect(state.advance(now)).toBeNull();
    });
  });

  describe("isActionBlocked", () => {
    const policy: DunningPolicy = {
      SOFT_BLOCKED: ["INVITE_MEMBER"],
      HARD_BLOCKED: ["INVITE_MEMBER", "CREATE_EVENT_TYPE", "CREATE_BOOKING"],
      CANCELLED: ["INVITE_MEMBER", "CREATE_EVENT_TYPE", "CREATE_BOOKING", "API_ACCESS"],
    };

    it("returns false for CURRENT status", () => {
      const state = DunningState.initial("billing-1", "team");
      expect(state.isActionBlocked("INVITE_MEMBER", policy)).toBe(false);
    });

    it("returns false for WARNING status", () => {
      const state = DunningState.fromRecord(makeRawRecord({ status: "WARNING" }), "team");
      expect(state.isActionBlocked("INVITE_MEMBER", policy)).toBe(false);
    });

    it("blocks actions in SOFT_BLOCKED policy", () => {
      const state = DunningState.fromRecord(makeRawRecord({ status: "SOFT_BLOCKED" }), "team");
      expect(state.isActionBlocked("INVITE_MEMBER", policy)).toBe(true);
      expect(state.isActionBlocked("CREATE_BOOKING", policy)).toBe(false);
    });

    it("blocks more actions in HARD_BLOCKED policy", () => {
      const state = DunningState.fromRecord(makeRawRecord({ status: "HARD_BLOCKED" }), "team");
      expect(state.isActionBlocked("INVITE_MEMBER", policy)).toBe(true);
      expect(state.isActionBlocked("CREATE_EVENT_TYPE", policy)).toBe(true);
      expect(state.isActionBlocked("CREATE_BOOKING", policy)).toBe(true);
      expect(state.isActionBlocked("API_ACCESS", policy)).toBe(false);
    });

    it("blocks all actions in CANCELLED policy", () => {
      const state = DunningState.fromRecord(makeRawRecord({ status: "CANCELLED" }), "team");
      expect(state.isActionBlocked("INVITE_MEMBER", policy)).toBe(true);
      expect(state.isActionBlocked("CREATE_EVENT_TYPE", policy)).toBe(true);
      expect(state.isActionBlocked("CREATE_BOOKING", policy)).toBe(true);
      expect(state.isActionBlocked("API_ACCESS", policy)).toBe(true);
    });
  });

  describe("constants", () => {
    it("SOFT_BLOCK_DAYS is 7", () => {
      expect(SOFT_BLOCK_DAYS).toBe(7);
    });

    it("HARD_BLOCK_DAYS is 14", () => {
      expect(HARD_BLOCK_DAYS).toBe(14);
    });

    it("CANCEL_DAYS is 90", () => {
      expect(CANCEL_DAYS).toBe(90);
    });
  });
});
