import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RawDunningRecord, RawDunningRecordForBilling } from "../../../repository/dunning/IDunningRepository";
import { toDunningRecordForBilling } from "../DunningMapper";
import { DunningState, SOFT_BLOCK_DAYS, HARD_BLOCK_DAYS, CANCEL_DAYS } from "../DunningState";

describe("DunningState.fromRecord", () => {
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
    const result = DunningState.fromRecord(raw, "team");
    expect(result.id).toBe("dun_1");
    expect(result.billingId).toBe("billing_123");
    expect(result.entityType).toBe("team");
    expect(result.status).toBe("WARNING");
    expect(result.firstFailedAt).toEqual(now);
    expect(result.lastFailedAt).toEqual(now);
    expect(result.resolvedAt).toBeNull();
    expect(result.subscriptionId).toBe("sub_1");
    expect(result.failedInvoiceId).toBe("inv_1");
    expect(result.invoiceUrl).toBe("https://example.com/inv");
    expect(result.failureReason).toBe("card_declined");
    expect(result.notificationsSent).toBe(2);
    expect(result.createdAt).toEqual(now);
    expect(result.updatedAt).toEqual(now);
  });

  it("maps billingFk to billingId", () => {
    const result = DunningState.fromRecord(raw, "team");
    expect(result.billingId).toBe("billing_123");
  });

  it("sets entityType to 'team' when passed 'team'", () => {
    const result = DunningState.fromRecord(raw, "team");
    expect(result.entityType).toBe("team");
  });

  it("sets entityType to 'organization' when passed 'organization'", () => {
    const result = DunningState.fromRecord(raw, "organization");
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
    const result = DunningState.fromRecord(rawWithNulls, "team");
    expect(result.firstFailedAt).toBeNull();
    expect(result.subscriptionId).toBeNull();
    expect(result.invoiceUrl).toBeNull();
  });
});

describe("DunningState.initial", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-18T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a CURRENT state with empty id", () => {
    const state = DunningState.initial("billing_1", "team");
    expect(state.id).toBe("");
    expect(state.billingId).toBe("billing_1");
    expect(state.entityType).toBe("team");
    expect(state.status).toBe("CURRENT");
    expect(state.isInDunning).toBe(false);
  });
});

describe("DunningState.recordPaymentFailure", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-18T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const failureParams = {
    subscriptionId: "sub_123",
    failedInvoiceId: "inv_456",
    invoiceUrl: "https://stripe.com/inv",
    failureReason: "card_declined",
  };

  it("transitions initial state to WARNING and marks as new", () => {
    const initial = DunningState.initial("billing_1", "team");
    const { state, isNewDunningRecord } = initial.recordPaymentFailure(failureParams);

    expect(isNewDunningRecord).toBe(true);
    expect(state.status).toBe("WARNING");
    expect(state.firstFailedAt).toEqual(new Date("2026-02-18T12:00:00Z"));
    expect(state.lastFailedAt).toEqual(new Date("2026-02-18T12:00:00Z"));
    expect(state.resolvedAt).toBeNull();
    expect(state.subscriptionId).toBe("sub_123");
  });

  it("transitions CURRENT status to WARNING and marks as new", () => {
    const raw: RawDunningRecord = {
      id: "dun_1",
      billingFk: "billing_1",
      status: "CURRENT",
      firstFailedAt: null,
      lastFailedAt: null,
      resolvedAt: new Date("2026-01-01T00:00:00Z"),
      subscriptionId: null,
      failedInvoiceId: null,
      invoiceUrl: null,
      failureReason: null,
      notificationsSent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const state = DunningState.fromRecord(raw, "team");
    const { state: next, isNewDunningRecord } = state.recordPaymentFailure(failureParams);

    expect(isNewDunningRecord).toBe(true);
    expect(next.status).toBe("WARNING");
  });

  it("preserves existing status and firstFailedAt for non-CURRENT records", () => {
    const existingFirstFailed = new Date("2026-02-10T10:00:00Z");
    const raw: RawDunningRecord = {
      id: "dun_1",
      billingFk: "billing_1",
      status: "SOFT_BLOCKED",
      firstFailedAt: existingFirstFailed,
      lastFailedAt: new Date("2026-02-15T10:00:00Z"),
      resolvedAt: null,
      subscriptionId: null,
      failedInvoiceId: null,
      invoiceUrl: null,
      failureReason: null,
      notificationsSent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const state = DunningState.fromRecord(raw, "team");
    const { state: next, isNewDunningRecord } = state.recordPaymentFailure(failureParams);

    expect(isNewDunningRecord).toBe(false);
    expect(next.status).toBe("SOFT_BLOCKED");
    expect(next.firstFailedAt).toEqual(existingFirstFailed);
    expect(next.lastFailedAt).toEqual(new Date("2026-02-18T12:00:00Z"));
  });
});

describe("DunningState.resolve", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-18T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves to CURRENT and clears invoice fields", () => {
    const raw: RawDunningRecord = {
      id: "dun_1",
      billingFk: "billing_1",
      status: "WARNING",
      firstFailedAt: new Date(),
      lastFailedAt: new Date(),
      resolvedAt: null,
      subscriptionId: "sub_1",
      failedInvoiceId: "inv_1",
      invoiceUrl: "https://stripe.com/inv",
      failureReason: "card_declined",
      notificationsSent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const state = DunningState.fromRecord(raw, "team");
    const resolved = state.resolve();

    expect(resolved.status).toBe("CURRENT");
    expect(resolved.resolvedAt).toEqual(new Date("2026-02-18T12:00:00Z"));
    expect(resolved.failedInvoiceId).toBeNull();
    expect(resolved.invoiceUrl).toBeNull();
  });
});

describe("DunningState.advance", () => {
  function makeRaw(overrides: Partial<RawDunningRecord> = {}): RawDunningRecord {
    const now = new Date();
    return {
      id: "dun_1",
      billingFk: "billing_1",
      status: "WARNING",
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

  it("returns null for CURRENT status", () => {
    const state = DunningState.fromRecord(makeRaw({ status: "CURRENT" }), "team");
    expect(state.advance(new Date())).toBeNull();
  });

  it("returns null when firstFailedAt is null", () => {
    const state = DunningState.fromRecord(makeRaw({ status: "WARNING", firstFailedAt: null }), "team");
    expect(state.advance(new Date())).toBeNull();
  });

  it("advances WARNING to SOFT_BLOCKED after 7 days", () => {
    const firstFailed = new Date("2026-02-11T11:00:00Z");
    const now = new Date("2026-02-18T12:00:00Z");
    const state = DunningState.fromRecord(makeRaw({ status: "WARNING", firstFailedAt: firstFailed }), "team");

    const result = state.advance(now);
    expect(result).not.toBeNull();
    expect(result!.from).toBe("WARNING");
    expect(result!.to).toBe("SOFT_BLOCKED");
    expect(result!.state.status).toBe("SOFT_BLOCKED");
  });

  it("does not advance WARNING before 7 days", () => {
    const firstFailed = new Date("2026-02-12T13:00:00Z");
    const now = new Date("2026-02-18T12:00:00Z");
    const state = DunningState.fromRecord(makeRaw({ status: "WARNING", firstFailedAt: firstFailed }), "team");

    expect(state.advance(now)).toBeNull();
  });

  it("advances WARNING directly to HARD_BLOCKED if 14+ days elapsed", () => {
    const firstFailed = new Date("2026-02-01T00:00:00Z");
    const now = new Date("2026-02-18T12:00:00Z");
    const state = DunningState.fromRecord(makeRaw({ status: "WARNING", firstFailedAt: firstFailed }), "team");

    const result = state.advance(now);
    expect(result).not.toBeNull();
    expect(result!.from).toBe("WARNING");
    expect(result!.to).toBe("HARD_BLOCKED");
  });

  it("advances SOFT_BLOCKED to HARD_BLOCKED after 14 days", () => {
    const firstFailed = new Date("2026-02-04T11:00:00Z");
    const now = new Date("2026-02-18T12:00:00Z");
    const state = DunningState.fromRecord(makeRaw({ status: "SOFT_BLOCKED", firstFailedAt: firstFailed }), "team");

    const result = state.advance(now);
    expect(result).not.toBeNull();
    expect(result!.from).toBe("SOFT_BLOCKED");
    expect(result!.to).toBe("HARD_BLOCKED");
  });

  it("advances HARD_BLOCKED to CANCELLED after 30 days", () => {
    const firstFailed = new Date("2026-01-19T11:00:00Z");
    const now = new Date("2026-02-18T12:00:00Z");
    const state = DunningState.fromRecord(makeRaw({ status: "HARD_BLOCKED", firstFailedAt: firstFailed }), "team");

    const result = state.advance(now);
    expect(result).not.toBeNull();
    expect(result!.from).toBe("HARD_BLOCKED");
    expect(result!.to).toBe("CANCELLED");
  });

  it("does not advance CANCELLED further", () => {
    const firstFailed = new Date("2025-12-01T00:00:00Z");
    const now = new Date("2026-02-18T12:00:00Z");
    const state = DunningState.fromRecord(makeRaw({ status: "CANCELLED", firstFailedAt: firstFailed }), "team");

    expect(state.advance(now)).toBeNull();
  });
});

describe("DunningState.isActionBlocked", () => {
  const defaultPolicy = {
    SOFT_BLOCKED: ["INVITE_MEMBER", "CREATE_EVENT_TYPE"] as const,
    HARD_BLOCKED: ["INVITE_MEMBER", "CREATE_EVENT_TYPE", "CREATE_BOOKING", "API_ACCESS"] as const,
    CANCELLED: ["INVITE_MEMBER", "CREATE_EVENT_TYPE", "CREATE_BOOKING", "API_ACCESS"] as const,
  };

  function makeState(status: string): DunningState {
    const raw: RawDunningRecord = {
      id: "dun_1",
      billingFk: "billing_1",
      status: status as RawDunningRecord["status"],
      firstFailedAt: new Date(),
      lastFailedAt: new Date(),
      resolvedAt: null,
      subscriptionId: null,
      failedInvoiceId: null,
      invoiceUrl: null,
      failureReason: null,
      notificationsSent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return DunningState.fromRecord(raw, "team");
  }

  it("returns false for CURRENT status", () => {
    const state = makeState("CURRENT");
    expect(state.isActionBlocked("INVITE_MEMBER", defaultPolicy)).toBe(false);
  });

  it("returns false for WARNING status", () => {
    const state = makeState("WARNING");
    expect(state.isActionBlocked("INVITE_MEMBER", defaultPolicy)).toBe(false);
  });

  it("returns true for blocked action at SOFT_BLOCKED", () => {
    const state = makeState("SOFT_BLOCKED");
    expect(state.isActionBlocked("INVITE_MEMBER", defaultPolicy)).toBe(true);
    expect(state.isActionBlocked("CREATE_EVENT_TYPE", defaultPolicy)).toBe(true);
  });

  it("returns false for non-blocked action at SOFT_BLOCKED", () => {
    const state = makeState("SOFT_BLOCKED");
    expect(state.isActionBlocked("CREATE_BOOKING", defaultPolicy)).toBe(false);
    expect(state.isActionBlocked("API_ACCESS", defaultPolicy)).toBe(false);
  });

  it("returns true for all actions at HARD_BLOCKED with default policy", () => {
    const state = makeState("HARD_BLOCKED");
    expect(state.isActionBlocked("INVITE_MEMBER", defaultPolicy)).toBe(true);
    expect(state.isActionBlocked("CREATE_BOOKING", defaultPolicy)).toBe(true);
    expect(state.isActionBlocked("API_ACCESS", defaultPolicy)).toBe(true);
  });
});

describe("DunningState.isInDunning", () => {
  function makeState(status: string): DunningState {
    const raw: RawDunningRecord = {
      id: "dun_1",
      billingFk: "billing_1",
      status: status as RawDunningRecord["status"],
      firstFailedAt: new Date(),
      lastFailedAt: new Date(),
      resolvedAt: null,
      subscriptionId: null,
      failedInvoiceId: null,
      invoiceUrl: null,
      failureReason: null,
      notificationsSent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return DunningState.fromRecord(raw, "team");
  }

  it("returns false for CURRENT", () => {
    expect(makeState("CURRENT").isInDunning).toBe(false);
  });

  it("returns true for WARNING", () => {
    expect(makeState("WARNING").isInDunning).toBe(true);
  });

  it("returns true for SOFT_BLOCKED", () => {
    expect(makeState("SOFT_BLOCKED").isInDunning).toBe(true);
  });
});

describe("DunningState.severity / severityOf", () => {
  it("CURRENT has lowest severity", () => {
    expect(DunningState.severityOf("CURRENT")).toBe(0);
  });

  it("CANCELLED has highest severity", () => {
    expect(DunningState.severityOf("CANCELLED")).toBe(4);
  });

  it("severity ordering is correct", () => {
    expect(DunningState.severityOf("CURRENT")).toBeLessThan(DunningState.severityOf("WARNING"));
    expect(DunningState.severityOf("WARNING")).toBeLessThan(DunningState.severityOf("SOFT_BLOCKED"));
    expect(DunningState.severityOf("SOFT_BLOCKED")).toBeLessThan(DunningState.severityOf("HARD_BLOCKED"));
    expect(DunningState.severityOf("HARD_BLOCKED")).toBeLessThan(DunningState.severityOf("CANCELLED"));
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
