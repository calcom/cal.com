import type { RoutingStep } from "../repositories/RoutingTraceRepository.interface";

export const SF_ROUNDS = {
  EXACT_MATCH: "Exact Match",
  FUZZY_MATCH: "Fuzzy Match",
  HOST_FILTER: "Host Filter",
  TIEBREAKER: "Tiebreaker",
  OWNER_RESOLUTION: "Owner Resolution",
  DECISION: "Decision",
  FIELD_RULES: "Field Rules",
  SYNC: "Sync",
} as const;

const STEP_TO_ROUND: Record<string, string> = {
  searching_by_website_value: SF_ROUNDS.EXACT_MATCH,
  account_found_by_website: SF_ROUNDS.EXACT_MATCH,
  searching_by_contact_email_domain: SF_ROUNDS.EXACT_MATCH,
  account_selected_by_most_contacts: SF_ROUNDS.EXACT_MATCH,
  no_account_found: SF_ROUNDS.EXACT_MATCH,
  graphql_query_initiated: SF_ROUNDS.EXACT_MATCH,
  graphql_existing_contact_found: SF_ROUNDS.EXACT_MATCH,
  graphql_account_found_by_website: SF_ROUNDS.EXACT_MATCH,
  graphql_searching_by_contact_domain: SF_ROUNDS.EXACT_MATCH,
  graphql_dominant_account_selected: SF_ROUNDS.EXACT_MATCH,
  graphql_no_account_found: SF_ROUNDS.EXACT_MATCH,

  fuzzy_match_initiated: SF_ROUNDS.FUZZY_MATCH,
  fuzzy_match_soql_results: SF_ROUNDS.FUZZY_MATCH,
  fuzzy_match_result: SF_ROUNDS.DECISION,
  fuzzy_match_no_result: SF_ROUNDS.FUZZY_MATCH,
  record_type_excluded: SF_ROUNDS.FUZZY_MATCH,

  host_filter_summary: SF_ROUNDS.HOST_FILTER,

  tiebreaker_started: SF_ROUNDS.TIEBREAKER,
  tiebreaker_step: SF_ROUNDS.TIEBREAKER,
  tiebreaker_winner: SF_ROUNDS.TIEBREAKER,

  lookup_field_query: SF_ROUNDS.OWNER_RESOLUTION,
  user_query_from_lookup_field: SF_ROUNDS.OWNER_RESOLUTION,
  contact_owner_lookup: SF_ROUNDS.OWNER_RESOLUTION,
  lead_owner_lookup: SF_ROUNDS.OWNER_RESOLUTION,
  account_owner_lookup: SF_ROUNDS.OWNER_RESOLUTION,
  owner_validated: SF_ROUNDS.OWNER_RESOLUTION,
  owner_lookup_skipped: SF_ROUNDS.OWNER_RESOLUTION,
  contact_owner_check_skipped: SF_ROUNDS.OWNER_RESOLUTION,

  routing_final_selection: SF_ROUNDS.DECISION,
  routing_fallback_round_robin: SF_ROUNDS.DECISION,
  salesforce_assignment: SF_ROUNDS.DECISION,

  field_rules_validated: SF_ROUNDS.FIELD_RULES,
  field_rule_filtered_record: SF_ROUNDS.FIELD_RULES,
  field_rule_evaluated: SF_ROUNDS.FIELD_RULES,
  all_records_filtered_by_field_rules: SF_ROUNDS.FIELD_RULES,

  sync_error: SF_ROUNDS.SYNC,
  event_field_type_coerced: SF_ROUNDS.SYNC,
};

export class SalesforceRoutingTracePresenter {
  static getRound(step: RoutingStep): string {
    return STEP_TO_ROUND[step.step] ?? "Salesforce";
  }

  static present(step: RoutingStep): string {
    const d = step.data;
    switch (step.step) {
      // ── Exact Match ──
      case "searching_by_website_value":
        return `Searching accounts by website matching "${d.emailDomain}"`;
      case "account_found_by_website":
        return `Found account by website "${d.website}" (${d.accountId})`;
      case "searching_by_contact_email_domain":
        return `Searching contacts with domain "${d.emailDomain}" — ${d.contactCount} found`;
      case "account_selected_by_most_contacts":
        return `Selected account ${d.accountId} with most contacts (${d.contactCount})`;
      case "no_account_found":
        return `No account found for ${d.email}: ${d.reason}`;

      // ── Exact Match (GraphQL) ──
      case "graphql_query_initiated":
        return `GraphQL resolution for ${d.email} (domain: ${d.emailDomain})`;
      case "graphql_existing_contact_found":
        return `Existing contact ${d.contactId} (Account: ${d.accountId}, Owner: ${d.ownerEmail})`;
      case "graphql_account_found_by_website":
        return `Account by website: ${d.accountId} (Owner: ${d.ownerEmail})`;
      case "graphql_searching_by_contact_domain":
        return `Searching contacts by domain "${d.emailDomain}" — ${d.contactCount} found`;
      case "graphql_dominant_account_selected":
        return `Dominant account ${d.accountId} (${d.contactCount} contacts, Owner: ${d.ownerEmail})`;
      case "graphql_no_account_found":
        return `No account found for ${d.email}: ${d.reason}`;

      // ── Fuzzy Match ──
      case "fuzzy_match_initiated":
        return `Initiated for base domain "${d.baseDomain}" (email: ${d.email})`;
      case "fuzzy_match_soql_results":
        return `${d.rawCount} accounts matched "%${d.baseDomain}%", ${d.baseDomainMatchCount} contain base domain, ${d.afterExclusionCount} after exclusion`;
      case "fuzzy_match_result":
        return `Selected account ${d.accountId} (website: ${d.accountWebsite}, confidence: ${d.confidence})`;
      case "fuzzy_match_no_result":
        return `No match for "${d.baseDomain}": ${d.reason}`;
      case "record_type_excluded":
        return `Excluded "${d.accountName}" (${d.accountId}) — record type "${d.recordType}"`;

      // ── Host Filter ──
      case "host_filter_summary": {
        const raw = d.droppedOwners;
        let droppedLabel = "";
        if ((d.droppedCount as number) > 0) {
          if (raw && typeof raw === "object" && !Array.isArray(raw)) {
            const parts = Object.entries(raw as Record<string, number>).map(([email, count]) =>
              count > 1 ? `${email} (${count} accounts)` : email
            );
            droppedLabel = `; dropped: ${parts.join(", ")}`;
          } else {
            droppedLabel = `; dropped ${d.droppedCount}`;
          }
        }
        return `${d.eligibleCount} of ${d.totalCandidates} candidates eligible (hosts: ${(d.eligibleOwners as string[]).join(", ")}${droppedLabel})`;
      }

      // ── Tiebreaker ──
      case "tiebreaker_started":
        return `Started with ${d.candidateCount} candidates`;
      case "tiebreaker_step":
        return `Rule "${d.ruleName}": ${d.candidatesBefore} → ${d.candidatesAfter} candidates`;
      case "tiebreaker_winner":
        return `Winner: ${d.accountName} (${d.accountId}) by "${d.decisiveRule}"`;

      // ── Owner Resolution ──
      case "lookup_field_query":
        return `Querying "${d.fieldName}" on ${d.salesforceObject}${d.accountId ? ` (${d.accountId})` : ""}`;
      case "user_query_from_lookup_field":
        return `Resolved to ${d.userEmail} (User: ${d.lookupFieldUserId})`;
      case "contact_owner_lookup":
        return `Contact owner: ${d.ownerEmail} (Contact: ${d.contactId})`;
      case "lead_owner_lookup":
        return `Lead owner: ${d.ownerEmail} (Lead: ${d.leadId})`;
      case "account_owner_lookup":
        return `Account owner: ${d.ownerEmail} (Account: ${d.accountId})`;
      case "owner_validated":
        return `${d.ownerEmail} is ${d.isTeamMember ? "" : "not "}a team member`;
      case "owner_lookup_skipped":
        return `Skipped: ${d.reason}${d.email ? ` (${d.email})` : ""}`;
      case "contact_owner_check_skipped":
        return `Contact owner check skipped: ${d.reason}`;

      // ── Decision ──
      case "routing_final_selection":
        return `Selected ${d.ownerEmail} from ${d.accountId} (${d.matchMethod}, rule: ${d.decisiveRule})`;
      case "routing_fallback_round_robin":
        return `Fallback to round-robin: ${d.reason}`;
      case "salesforce_assignment":
        return `Assigned ${d.email} via ${d.recordType} (ID: ${d.recordId})`;

      // ── Field Rules ──
      case "field_rules_validated":
        return `${d.validCount}/${d.configuredCount} valid for ${d.recordType}${d.validFields ? `: ${(d.validFields as string[]).join(", ")}` : ""}`;
      case "field_rule_filtered_record":
        return `Filtered ${d.recordId}${d.failedRule ? ` — ${(d.failedRule as Record<string, string>).field} ${(d.failedRule as Record<string, string>).action} "${(d.failedRule as Record<string, string>).value}"` : ""}`;
      case "field_rule_evaluated":
        return `"${d.field}" (${d.action}): expected "${d.ruleValue}", got "${d.actualValue}" → ${d.result}`;
      case "all_records_filtered_by_field_rules":
        return `All ${d.recordType} records filtered out`;

      // ── Sync ──
      case "sync_error":
        return `Error on ${d.objectType} ${d.operation}: ${d.sfErrorCode} — ${d.sfErrorMessage}${d.droppedFields ? ` (dropped: ${(d.droppedFields as string[]).join(", ")})` : ""}`;
      case "event_field_type_coerced":
        return `Coerced "${d.fieldName}" from "${d.originalValue}" to ${d.coercedValue} (SF type: ${d.sfFieldType})`;

      default:
        return step.step;
    }
  }
}
