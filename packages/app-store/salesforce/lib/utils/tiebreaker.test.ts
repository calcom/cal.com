import { describe, expect, it, vi, beforeEach } from "vitest";

import type { TiebreakerCandidate } from "./tiebreaker";
import { runTiebreakerWaterfall } from "./tiebreaker";

vi.mock("../tracing/SalesforceRoutingTraceService", () => ({
  SalesforceRoutingTraceService: {
    tiebreakerStarted: vi.fn(),
    tiebreakerStep: vi.fn(),
    tiebreakerWinner: vi.fn(),
  },
}));

function makeCandidate(overrides: Partial<TiebreakerCandidate> & { Id: string }): TiebreakerCandidate {
  return {
    Name: `Account ${overrides.Id}`,
    Website: `https://${overrides.Id.toLowerCase()}.com`,
    ChildAccountCount: null,
    OpportunityCount: null,
    ContactCount: null,
    LastActivityDate: null,
    CreatedDate: null,
    ...overrides,
  };
}

describe("runTiebreakerWaterfall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the single candidate when only one is provided", () => {
    const candidate = makeCandidate({ Id: "001A" });
    const { winner, decisiveRule } = runTiebreakerWaterfall([candidate]);
    expect(winner.Id).toBe("001A");
    expect(decisiveRule).toBe("single_candidate");
  });

  it("P5: picks account with most child accounts", () => {
    const a = makeCandidate({ Id: "001A", ChildAccountCount: 2 });
    const b = makeCandidate({ Id: "001B", ChildAccountCount: 8 });
    const c = makeCandidate({ Id: "001C", ChildAccountCount: 3 });

    const { winner, decisiveRule } = runTiebreakerWaterfall([a, b, c]);
    expect(winner.Id).toBe("001B");
    expect(decisiveRule).toBe("P5_ChildAccounts_MAX");
  });

  it("P5: skips to next rule when all child account counts are null", () => {
    const a = makeCandidate({ Id: "001A", OpportunityCount: 10 });
    const b = makeCandidate({ Id: "001B", OpportunityCount: 25 });

    const { winner, decisiveRule } = runTiebreakerWaterfall([a, b]);
    expect(winner.Id).toBe("001B");
    expect(decisiveRule).toBe("P6_Opportunities_MAX");
  });

  it("P6: picks account with most opportunities when child accounts tie", () => {
    const a = makeCandidate({ Id: "001A", ChildAccountCount: 3, OpportunityCount: 5 });
    const b = makeCandidate({ Id: "001B", ChildAccountCount: 3, OpportunityCount: 20 });

    const { winner, decisiveRule } = runTiebreakerWaterfall([a, b]);
    expect(winner.Id).toBe("001B");
    expect(decisiveRule).toBe("P6_Opportunities_MAX");
  });

  it("P7: picks account with most contacts when child accounts and opps tie", () => {
    const a = makeCandidate({ Id: "001A", ChildAccountCount: 3, OpportunityCount: 10, ContactCount: 30 });
    const b = makeCandidate({ Id: "001B", ChildAccountCount: 3, OpportunityCount: 10, ContactCount: 50 });

    const { winner, decisiveRule } = runTiebreakerWaterfall([a, b]);
    expect(winner.Id).toBe("001B");
    expect(decisiveRule).toBe("P7_Contacts_MAX");
  });

  it("P8: picks account with most recent activity when size metrics tie", () => {
    const a = makeCandidate({
      Id: "001A",
      ChildAccountCount: 3,
      LastActivityDate: "2025-01-01T00:00:00Z",
    });
    const b = makeCandidate({
      Id: "001B",
      ChildAccountCount: 3,
      LastActivityDate: "2026-03-15T00:00:00Z",
    });

    const { winner, decisiveRule } = runTiebreakerWaterfall([a, b]);
    expect(winner.Id).toBe("001B");
    expect(decisiveRule).toBe("P8_LastActivity_MAX");
  });

  it("P9: picks oldest account when all other metrics tie", () => {
    const a = makeCandidate({
      Id: "001A",
      CreatedDate: "2022-06-01T00:00:00Z",
    });
    const b = makeCandidate({
      Id: "001B",
      CreatedDate: "2024-01-15T00:00:00Z",
    });

    const { winner, decisiveRule } = runTiebreakerWaterfall([a, b]);
    expect(winner.Id).toBe("001A");
    expect(decisiveRule).toBe("P9_CreatedDate_MIN");
  });

  it("falls back to Id sort when all metrics are null", () => {
    const a = makeCandidate({ Id: "001B" });
    const b = makeCandidate({ Id: "001A" });

    const { winner, decisiveRule } = runTiebreakerWaterfall([a, b]);
    expect(winner.Id).toBe("001A");
    expect(decisiveRule).toBe("fallback_id_sort");
  });

  it("cascades through multiple rules before finding decisive one", () => {
    const a = makeCandidate({
      Id: "001A",
      ChildAccountCount: 3,
      OpportunityCount: 10,
      ContactCount: 5,
      LastActivityDate: "2026-04-01T00:00:00Z",
    });
    const b = makeCandidate({
      Id: "001B",
      ChildAccountCount: 3,
      OpportunityCount: 10,
      ContactCount: 5,
      LastActivityDate: "2025-01-01T00:00:00Z",
    });

    const { winner, decisiveRule } = runTiebreakerWaterfall([a, b]);
    expect(winner.Id).toBe("001A");
    expect(decisiveRule).toBe("P8_LastActivity_MAX");
  });

  it("narrows candidates progressively across rules", () => {
    const a = makeCandidate({ Id: "001A", ChildAccountCount: 5, OpportunityCount: 10 });
    const b = makeCandidate({ Id: "001B", ChildAccountCount: 5, OpportunityCount: 30 });
    const c = makeCandidate({ Id: "001C", ChildAccountCount: 1, OpportunityCount: 50 });

    const { winner, decisiveRule } = runTiebreakerWaterfall([a, b, c]);
    expect(winner.Id).toBe("001B");
    expect(decisiveRule).toBe("P6_Opportunities_MAX");
  });

  it("handles partial null values correctly (some candidates have data, some don't)", () => {
    const a = makeCandidate({ Id: "001A", ChildAccountCount: null });
    const b = makeCandidate({ Id: "001B", ChildAccountCount: 4 });

    const { winner, decisiveRule } = runTiebreakerWaterfall([a, b]);
    expect(winner.Id).toBe("001B");
    expect(decisiveRule).toBe("P5_ChildAccounts_MAX");
  });

  it("dedupes candidates with same owner email, keeps first per owner", () => {
    const a = makeCandidate({ Id: "001A", OwnerEmail: "host@cal.com", OpportunityCount: 5 });
    const b = makeCandidate({ Id: "001B", OwnerEmail: "host@cal.com", OpportunityCount: 10 });
    const c = makeCandidate({ Id: "001C", OwnerEmail: "other@cal.com", OpportunityCount: 3 });

    const { winner, decisiveRule } = runTiebreakerWaterfall([a, b, c]);
    expect(winner.Id).toBe("001A");
    expect(decisiveRule).toBe("P6_Opportunities_MAX");
  });

  it("returns single_owner_dedupe when all candidates share the same owner", () => {
    const a = makeCandidate({ Id: "001A", OwnerEmail: "host@cal.com" });
    const b = makeCandidate({ Id: "001B", OwnerEmail: "host@cal.com" });

    const { winner, decisiveRule } = runTiebreakerWaterfall([a, b]);
    expect(winner.Id).toBe("001A");
    expect(decisiveRule).toBe("single_owner_dedupe");
  });

  it("dedupe is case-insensitive on owner email", () => {
    const a = makeCandidate({ Id: "001A", OwnerEmail: "Host@Cal.com", OpportunityCount: 2 });
    const b = makeCandidate({ Id: "001B", OwnerEmail: "host@cal.com", OpportunityCount: 10 });
    const c = makeCandidate({ Id: "001C", OwnerEmail: "other@cal.com", OpportunityCount: 1 });

    const { winner, decisiveRule } = runTiebreakerWaterfall([a, b, c]);
    expect(winner.Id).toBe("001A");
    expect(decisiveRule).toBe("P6_Opportunities_MAX");
  });

  // --- Gap 4: Empty array guard ---
  it("throws when called with empty candidates array", () => {
    expect(() => runTiebreakerWaterfall([])).toThrow(
      "runTiebreakerWaterfall called with empty candidates array"
    );
  });

  // --- Gap 7: Full cascade exhaustion P5-P8 tie → P9 decides ---
  it("P5-P8 all tie, P9 CreatedDate breaks the tie (oldest wins)", () => {
    const a = makeCandidate({
      Id: "001A",
      OwnerEmail: "owner-a@cal.com",
      ChildAccountCount: 5,
      OpportunityCount: 10,
      ContactCount: 20,
      LastActivityDate: "2026-03-01T00:00:00Z",
      CreatedDate: "2020-01-15T00:00:00Z",
    });
    const b = makeCandidate({
      Id: "001B",
      OwnerEmail: "owner-b@cal.com",
      ChildAccountCount: 5,
      OpportunityCount: 10,
      ContactCount: 20,
      LastActivityDate: "2026-03-01T00:00:00Z",
      CreatedDate: "2023-06-01T00:00:00Z",
    });
    const c = makeCandidate({
      Id: "001C",
      OwnerEmail: "owner-c@cal.com",
      ChildAccountCount: 5,
      OpportunityCount: 10,
      ContactCount: 20,
      LastActivityDate: "2026-03-01T00:00:00Z",
      CreatedDate: "2018-09-20T00:00:00Z",
    });

    const { winner, decisiveRule } = runTiebreakerWaterfall([a, b, c]);
    expect(winner.Id).toBe("001C");
    expect(decisiveRule).toBe("P9_CreatedDate_MIN");
  });

  it("P5-P9 all tie → falls back to deterministic Id sort", () => {
    const a = makeCandidate({
      Id: "001B",
      OwnerEmail: "owner-a@cal.com",
      ChildAccountCount: 5,
      OpportunityCount: 10,
      ContactCount: 20,
      LastActivityDate: "2026-03-01T00:00:00Z",
      CreatedDate: "2020-01-15T00:00:00Z",
    });
    const b = makeCandidate({
      Id: "001A",
      OwnerEmail: "owner-b@cal.com",
      ChildAccountCount: 5,
      OpportunityCount: 10,
      ContactCount: 20,
      LastActivityDate: "2026-03-01T00:00:00Z",
      CreatedDate: "2020-01-15T00:00:00Z",
    });

    const { winner, decisiveRule } = runTiebreakerWaterfall([a, b]);
    expect(winner.Id).toBe("001A");
    expect(decisiveRule).toBe("fallback_id_sort");
  });

  // --- Gap 5: Trace emission assertions ---
  describe("trace emission", () => {
    let mockTraceService: {
      tiebreakerStarted: ReturnType<typeof vi.fn>;
      tiebreakerStep: ReturnType<typeof vi.fn>;
      tiebreakerWinner: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
      const mod = await import("../tracing/SalesforceRoutingTraceService");
      mockTraceService = mod.SalesforceRoutingTraceService as unknown as typeof mockTraceService;
    });

    it("emits tiebreakerStarted with correct candidate count and ids", () => {
      const a = makeCandidate({ Id: "001A", OwnerEmail: "a@cal.com", ChildAccountCount: 5 });
      const b = makeCandidate({ Id: "001B", OwnerEmail: "b@cal.com", ChildAccountCount: 3 });

      runTiebreakerWaterfall([a, b]);

      expect(mockTraceService.tiebreakerStarted).toHaveBeenCalledOnce();
      expect(mockTraceService.tiebreakerStarted).toHaveBeenCalledWith({
        candidateCount: 2,
        candidateIds: ["001A", "001B"],
      });
    });

    it("emits tiebreakerStep for each rule evaluated", () => {
      const a = makeCandidate({ Id: "001A", OwnerEmail: "a@cal.com", ChildAccountCount: 5 });
      const b = makeCandidate({ Id: "001B", OwnerEmail: "b@cal.com", ChildAccountCount: 3 });

      runTiebreakerWaterfall([a, b]);

      // P5 is decisive, so only 1 step emitted
      expect(mockTraceService.tiebreakerStep).toHaveBeenCalledOnce();
      expect(mockTraceService.tiebreakerStep).toHaveBeenCalledWith({
        ruleName: "P5_ChildAccounts_MAX",
        candidatesBefore: 2,
        candidatesAfter: 1,
      });
    });

    it("emits tiebreakerStep for all 5 rules when waterfall exhausts to fallback", () => {
      const a = makeCandidate({ Id: "001B", OwnerEmail: "a@cal.com" });
      const b = makeCandidate({ Id: "001A", OwnerEmail: "b@cal.com" });

      runTiebreakerWaterfall([a, b]);

      expect(mockTraceService.tiebreakerStep).toHaveBeenCalledTimes(5);
      expect(mockTraceService.tiebreakerStep).toHaveBeenNthCalledWith(1, {
        ruleName: "P5_ChildAccounts_MAX",
        candidatesBefore: 2,
        candidatesAfter: 2,
      });
      expect(mockTraceService.tiebreakerStep).toHaveBeenNthCalledWith(2, {
        ruleName: "P6_Opportunities_MAX",
        candidatesBefore: 2,
        candidatesAfter: 2,
      });
      expect(mockTraceService.tiebreakerStep).toHaveBeenNthCalledWith(3, {
        ruleName: "P7_Contacts_MAX",
        candidatesBefore: 2,
        candidatesAfter: 2,
      });
      expect(mockTraceService.tiebreakerStep).toHaveBeenNthCalledWith(4, {
        ruleName: "P8_LastActivity_MAX",
        candidatesBefore: 2,
        candidatesAfter: 2,
      });
      expect(mockTraceService.tiebreakerStep).toHaveBeenNthCalledWith(5, {
        ruleName: "P9_CreatedDate_MIN",
        candidatesBefore: 2,
        candidatesAfter: 2,
      });
    });

    it("emits tiebreakerWinner with decisive rule on normal win", () => {
      const a = makeCandidate({ Id: "001A", Name: "Acme Corp", OwnerEmail: "a@cal.com", ChildAccountCount: 10 });
      const b = makeCandidate({ Id: "001B", Name: "Beta Inc", OwnerEmail: "b@cal.com", ChildAccountCount: 2 });

      runTiebreakerWaterfall([a, b]);

      expect(mockTraceService.tiebreakerWinner).toHaveBeenCalledOnce();
      expect(mockTraceService.tiebreakerWinner).toHaveBeenCalledWith({
        accountId: "001A",
        accountName: "Acme Corp",
        decisiveRule: "P5_ChildAccounts_MAX",
      });
    });

    it("emits tiebreakerWinner with fallback_id_sort when waterfall exhausts", () => {
      const a = makeCandidate({ Id: "001B", Name: "Beta Inc", OwnerEmail: "a@cal.com" });
      const b = makeCandidate({ Id: "001A", Name: "Alpha Corp", OwnerEmail: "b@cal.com" });

      runTiebreakerWaterfall([a, b]);

      expect(mockTraceService.tiebreakerWinner).toHaveBeenCalledOnce();
      expect(mockTraceService.tiebreakerWinner).toHaveBeenCalledWith({
        accountId: "001A",
        accountName: "Alpha Corp",
        decisiveRule: "fallback_id_sort",
      });
    });

    it("does not emit trace events for single candidate (no waterfall needed)", () => {
      const a = makeCandidate({ Id: "001A" });

      runTiebreakerWaterfall([a]);

      expect(mockTraceService.tiebreakerStarted).not.toHaveBeenCalled();
      expect(mockTraceService.tiebreakerStep).not.toHaveBeenCalled();
      expect(mockTraceService.tiebreakerWinner).not.toHaveBeenCalled();
    });

    it("does not emit trace events for single_owner_dedupe (skips waterfall)", () => {
      const a = makeCandidate({ Id: "001A", OwnerEmail: "same@cal.com" });
      const b = makeCandidate({ Id: "001B", OwnerEmail: "same@cal.com" });

      runTiebreakerWaterfall([a, b]);

      expect(mockTraceService.tiebreakerStarted).not.toHaveBeenCalled();
      expect(mockTraceService.tiebreakerStep).not.toHaveBeenCalled();
      expect(mockTraceService.tiebreakerWinner).not.toHaveBeenCalled();
    });

    it("emits progressive narrowing in tiebreakerStep when rules eliminate candidates", () => {
      const a = makeCandidate({
        Id: "001A",
        OwnerEmail: "a@cal.com",
        ChildAccountCount: 5,
        OpportunityCount: 10,
        ContactCount: 20,
        LastActivityDate: "2026-03-01T00:00:00Z",
        CreatedDate: "2018-01-01T00:00:00Z",
      });
      const b = makeCandidate({
        Id: "001B",
        OwnerEmail: "b@cal.com",
        ChildAccountCount: 5,
        OpportunityCount: 10,
        ContactCount: 20,
        LastActivityDate: "2026-03-01T00:00:00Z",
        CreatedDate: "2023-06-01T00:00:00Z",
      });
      const c = makeCandidate({
        Id: "001C",
        OwnerEmail: "c@cal.com",
        ChildAccountCount: 3,
        OpportunityCount: 50,
        ContactCount: 100,
        LastActivityDate: "2026-04-01T00:00:00Z",
        CreatedDate: "2015-01-01T00:00:00Z",
      });

      const { winner, decisiveRule } = runTiebreakerWaterfall([a, b, c]);

      // P5 narrows 3→2 (drops c with ChildAccountCount=3), then P6-P8 tie, P9 decides
      expect(decisiveRule).toBe("P9_CreatedDate_MIN");
      expect(winner.Id).toBe("001A");

      // P5 narrowed from 3 to 2
      expect(mockTraceService.tiebreakerStep).toHaveBeenNthCalledWith(1, {
        ruleName: "P5_ChildAccounts_MAX",
        candidatesBefore: 3,
        candidatesAfter: 2,
      });
    });
  });
});
