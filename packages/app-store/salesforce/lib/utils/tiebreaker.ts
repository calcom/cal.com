import type { Logger } from "tslog";

import { SalesforceRoutingTraceService } from "../tracing/SalesforceRoutingTraceService";

export interface TiebreakerCandidate {
  Id: string;
  Name?: string;
  Website?: string;
  OwnerId?: string;
  OwnerEmail?: string;
  /** P5: Count of child accounts in hierarchy */
  ChildAccountCount?: number | null;
  /** P6: Count of related Opportunities */
  OpportunityCount?: number | null;
  /** P7: Count of related Contacts */
  ContactCount?: number | null;
  LastActivityDate?: string | null;
  CreatedDate?: string | null;
}

interface TiebreakerRule {
  name: string;
  apply: (candidates: TiebreakerCandidate[]) => TiebreakerCandidate[];
}

const rules: TiebreakerRule[] = [
  {
    name: "P5_ChildAccounts_MAX",
    apply: (candidates) => filterByMax(candidates, (c) => c.ChildAccountCount),
  },
  {
    name: "P6_Opportunities_MAX",
    apply: (candidates) => filterByMax(candidates, (c) => c.OpportunityCount),
  },
  {
    name: "P7_Contacts_MAX",
    apply: (candidates) => filterByMax(candidates, (c) => c.ContactCount),
  },
  {
    name: "P8_LastActivity_MAX",
    apply: (candidates) => filterByMax(candidates, (c) => dateToNum(c.LastActivityDate)),
  },
  {
    name: "P9_CreatedDate_MIN",
    apply: (candidates) => filterByMin(candidates, (c) => dateToNum(c.CreatedDate)),
  },
];

function dateToNum(d: string | null | undefined): number | null {
  if (!d) return null;
  const ts = new Date(d).getTime();
  return Number.isNaN(ts) ? null : ts;
}

function filterByMax(
  candidates: TiebreakerCandidate[],
  accessor: (c: TiebreakerCandidate) => number | null | undefined
): TiebreakerCandidate[] {
  let max = -Infinity;
  for (const c of candidates) {
    const v = accessor(c);
    if (v != null && v > max) max = v;
  }
  if (max === -Infinity) return candidates;
  return candidates.filter((c) => accessor(c) === max);
}

function filterByMin(
  candidates: TiebreakerCandidate[],
  accessor: (c: TiebreakerCandidate) => number | null | undefined
): TiebreakerCandidate[] {
  let min = Infinity;
  for (const c of candidates) {
    const v = accessor(c);
    if (v != null && v < min) min = v;
  }
  if (min === Infinity) return candidates;
  return candidates.filter((c) => accessor(c) === min);
}

/**
 * When multiple Accounts resolve to the same Salesforce owner, only the
 * highest-ranked Account per owner enters the tiebreaker pool. "Highest-ranked"
 * means first in the input array order (callers sort by match quality).
 */
function dedupeByOwner(candidates: TiebreakerCandidate[]): TiebreakerCandidate[] {
  const seen = new Map<string, TiebreakerCandidate>();
  for (const c of candidates) {
    const key = c.OwnerEmail?.toLowerCase() ?? c.Id;
    if (!seen.has(key)) {
      seen.set(key, c);
    }
  }
  return Array.from(seen.values());
}

/**
 * Runs the tiebreaker waterfall (P5-P9) on a list of candidates.
 * Returns the single winner and the rule that was decisive.
 * If all rules tie, falls back to stable Id sort (deterministic).
 */
export function runTiebreakerWaterfall(
  candidates: TiebreakerCandidate[],
  log?: Logger<unknown>
): { winner: TiebreakerCandidate; decisiveRule: string } {
  if (candidates.length === 0) {
    throw new Error("runTiebreakerWaterfall called with empty candidates array");
  }

  if (candidates.length === 1) {
    return { winner: candidates[0], decisiveRule: "single_candidate" };
  }

  const deduped = dedupeByOwner(candidates);
  if (deduped.length === 1) {
    log?.info(`All candidates share same owner, skipping tiebreaker → ${deduped[0].Id}`);
    return { winner: deduped[0], decisiveRule: "single_owner_dedupe" };
  }

  SalesforceRoutingTraceService.tiebreakerStarted({
    candidateCount: deduped.length,
    candidateIds: deduped.map((c) => c.Id),
  });

  let remaining = [...deduped];

  for (const rule of rules) {
    const before = remaining.length;
    const after = rule.apply(remaining);

    SalesforceRoutingTraceService.tiebreakerStep({
      ruleName: rule.name,
      candidatesBefore: before,
      candidatesAfter: after.length,
    });

    if (after.length === 1) {
      log?.info(`Tiebreaker decisive: ${rule.name} → ${after[0].Id}`);
      SalesforceRoutingTraceService.tiebreakerWinner({
        accountId: after[0].Id,
        accountName: after[0].Name ?? "",
        decisiveRule: rule.name,
      });
      return { winner: after[0], decisiveRule: rule.name };
    }

    if (after.length < before) {
      remaining = after;
    }
  }

  remaining.sort((a, b) => a.Id.localeCompare(b.Id));
  const winner = remaining[0];
  log?.info(`Tiebreaker exhausted, fallback to Id sort → ${winner.Id}`);
  SalesforceRoutingTraceService.tiebreakerWinner({
    accountId: winner.Id,
    accountName: winner.Name ?? "",
    decisiveRule: "fallback_id_sort",
  });
  return { winner, decisiveRule: "fallback_id_sort" };
}
