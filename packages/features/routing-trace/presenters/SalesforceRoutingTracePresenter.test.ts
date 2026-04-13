import { describe, expect, it } from "vitest";
import type { RoutingStep } from "../repositories/RoutingTraceRepository.interface";
import { SalesforceRoutingTracePresenter, SF_ROUNDS } from "./SalesforceRoutingTracePresenter";

function makeStep(step: string, data: Record<string, unknown> = {}): RoutingStep {
  return { domain: "salesforce", step, timestamp: Date.now(), data };
}

describe("SalesforceRoutingTracePresenter", () => {
  describe("getRound", () => {
    it.each([
      ["searching_by_website_value", SF_ROUNDS.EXACT_MATCH],
      ["graphql_query_initiated", SF_ROUNDS.EXACT_MATCH],
      ["fuzzy_match_initiated", SF_ROUNDS.FUZZY_MATCH],
      ["host_filter_summary", SF_ROUNDS.HOST_FILTER],
      ["tiebreaker_started", SF_ROUNDS.TIEBREAKER],
      ["lookup_field_query", SF_ROUNDS.OWNER_RESOLUTION],
      ["routing_final_selection", SF_ROUNDS.DECISION],
      ["field_rules_validated", SF_ROUNDS.FIELD_RULES],
      ["sync_error", SF_ROUNDS.SYNC],
      ["unknown_step", "Salesforce"],
    ])("maps %s → %s", (step, expected) => {
      expect(SalesforceRoutingTracePresenter.getRound(makeStep(step))).toBe(expected);
    });
  });

  describe("present", () => {
    // ── Exact Match ──

    it("presents searching_by_website_value", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("searching_by_website_value", { emailDomain: "acme.com" })
      );
      expect(result).toBe('Searching accounts by website matching "acme.com"');
    });

    it("presents account_found_by_website", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("account_found_by_website", { accountId: "001ABC", website: "acme.com" })
      );
      expect(result).toBe('Found account by website "acme.com" (001ABC)');
    });

    it("presents searching_by_contact_email_domain", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("searching_by_contact_email_domain", { emailDomain: "acme.com", contactCount: 5 })
      );
      expect(result).toBe('Searching contacts with domain "acme.com" — 5 found');
    });

    it("presents account_selected_by_most_contacts", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("account_selected_by_most_contacts", { accountId: "001ABC", contactCount: 3 })
      );
      expect(result).toBe("Selected account 001ABC with most contacts (3)");
    });

    it("presents no_account_found", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("no_account_found", { email: "user@acme.com", reason: "free email domain" })
      );
      expect(result).toBe("No account found for user@acme.com: free email domain");
    });

    // ── Exact Match (GraphQL) ──

    it("presents graphql_query_initiated", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("graphql_query_initiated", { email: "user@acme.com", emailDomain: "acme.com" })
      );
      expect(result).toBe("GraphQL resolution for user@acme.com (domain: acme.com)");
    });

    it("presents graphql_existing_contact_found", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("graphql_existing_contact_found", {
          contactId: "003ABC",
          accountId: "001ABC",
          ownerEmail: "owner@acme.com",
        })
      );
      expect(result).toBe("Existing contact 003ABC (Account: 001ABC, Owner: owner@acme.com)");
    });

    it("presents graphql_account_found_by_website", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("graphql_account_found_by_website", { accountId: "001ABC", ownerEmail: "owner@acme.com" })
      );
      expect(result).toBe("Account by website: 001ABC (Owner: owner@acme.com)");
    });

    it("presents graphql_searching_by_contact_domain", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("graphql_searching_by_contact_domain", { emailDomain: "acme.com", contactCount: 3 })
      );
      expect(result).toBe('Searching contacts by domain "acme.com" — 3 found');
    });

    it("presents graphql_dominant_account_selected", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("graphql_dominant_account_selected", {
          accountId: "001ABC",
          contactCount: 5,
          ownerEmail: "owner@acme.com",
        })
      );
      expect(result).toBe("Dominant account 001ABC (5 contacts, Owner: owner@acme.com)");
    });

    it("presents graphql_no_account_found", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("graphql_no_account_found", { email: "user@acme.com", reason: "no matching records" })
      );
      expect(result).toBe("No account found for user@acme.com: no matching records");
    });

    // ── Fuzzy Match ──

    it("presents fuzzy_match_initiated", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("fuzzy_match_initiated", { email: "user@acme.in", baseDomain: "acme", isFreeEmail: false })
      );
      expect(result).toBe('Initiated for base domain "acme" (email: user@acme.in)');
    });

    it("presents fuzzy_match_soql_results", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("fuzzy_match_soql_results", {
          baseDomain: "acme",
          rawCount: 10,
          baseDomainMatchCount: 5,
          afterExclusionCount: 3,
        })
      );
      expect(result).toBe('10 accounts matched "%acme%", 5 contain base domain, 3 after exclusion');
    });

    it("presents fuzzy_match_result", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("fuzzy_match_result", {
          accountId: "001ABC",
          accountWebsite: "acme.com",
          confidence: "fuzzy_tiebreak",
        })
      );
      expect(result).toBe("Selected account 001ABC (website: acme.com, confidence: fuzzy_tiebreak)");
    });

    it("presents fuzzy_match_no_result", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("fuzzy_match_no_result", {
          email: "user@acme.in",
          baseDomain: "acme",
          reason: "all candidates filtered by host check",
        })
      );
      expect(result).toBe('No match for "acme": all candidates filtered by host check');
    });

    it("presents record_type_excluded", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("record_type_excluded", {
          accountId: "001ABC",
          accountName: "Acme Archived",
          recordType: "Archived",
        })
      );
      expect(result).toBe('Excluded "Acme Archived" (001ABC) — record type "Archived"');
    });

    // ── Host Filter ──

    it("presents host_filter_summary with per-owner counts", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("host_filter_summary", {
          totalCandidates: 10,
          eligibleCount: 3,
          droppedCount: 7,
          eligibleOwners: ["owner1@example.com", "owner2@example.com", "owner3@example.com"],
          droppedOwners: { "ali@cal.com": 7 },
          eventTypeId: 42,
        })
      );
      expect(result).toBe(
        "3 of 10 candidates eligible (hosts: owner1@example.com, owner2@example.com, owner3@example.com; dropped: ali@cal.com (7 accounts))"
      );
    });

    it("presents host_filter_summary with single drop per owner", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("host_filter_summary", {
          totalCandidates: 4,
          eligibleCount: 3,
          droppedCount: 1,
          eligibleOwners: ["owner1@example.com", "owner2@example.com", "owner3@example.com"],
          droppedOwners: { "bob@cal.com": 1 },
          eventTypeId: 42,
        })
      );
      expect(result).toBe(
        "3 of 4 candidates eligible (hosts: owner1@example.com, owner2@example.com, owner3@example.com; dropped: bob@cal.com)"
      );
    });

    it("presents host_filter_summary with no drops", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("host_filter_summary", {
          totalCandidates: 2,
          eligibleCount: 2,
          droppedCount: 0,
          eligibleOwners: ["owner1@example.com", "owner2@example.com"],
          droppedOwners: {},
          eventTypeId: 42,
        })
      );
      expect(result).toBe("2 of 2 candidates eligible (hosts: owner1@example.com, owner2@example.com)");
    });

    // ── Tiebreaker ──

    it("presents tiebreaker_started", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("tiebreaker_started", { candidateCount: 3, candidateIds: ["001A", "001B", "001C"] })
      );
      expect(result).toBe("Started with 3 candidates");
    });

    it("presents tiebreaker_step", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("tiebreaker_step", {
          ruleName: "Opportunities_MAX",
          candidatesBefore: 3,
          candidatesAfter: 1,
        })
      );
      expect(result).toBe('Rule "Opportunities_MAX": 3 → 1 candidates');
    });

    it("presents tiebreaker_winner", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("tiebreaker_winner", {
          accountId: "001ABC",
          accountName: "Acme Clean",
          decisiveRule: "Opportunities_MAX",
        })
      );
      expect(result).toBe('Winner: Acme Clean (001ABC) by "Opportunities_MAX"');
    });

    // ── Owner Resolution ──

    it("presents lookup_field_query with accountId", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("lookup_field_query", {
          fieldName: "Owner__c",
          salesforceObject: "Account",
          accountId: "001ABC",
        })
      );
      expect(result).toBe('Querying "Owner__c" on Account (001ABC)');
    });

    it("presents lookup_field_query without accountId", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("lookup_field_query", {
          fieldName: "Owner__c",
          salesforceObject: "Account",
          accountId: null,
        })
      );
      expect(result).toBe('Querying "Owner__c" on Account');
    });

    it("presents user_query_from_lookup_field", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("user_query_from_lookup_field", {
          lookupFieldUserId: "005ABC",
          userEmail: "owner@acme.com",
        })
      );
      expect(result).toBe("Resolved to owner@acme.com (User: 005ABC)");
    });

    it("presents contact_owner_lookup", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("contact_owner_lookup", {
          contactId: "003ABC",
          ownerEmail: "owner@acme.com",
          ownerId: "005ABC",
        })
      );
      expect(result).toBe("Contact owner: owner@acme.com (Contact: 003ABC)");
    });

    it("presents lead_owner_lookup", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("lead_owner_lookup", {
          leadId: "00Q123",
          ownerEmail: "owner@acme.com",
          ownerId: "005ABC",
        })
      );
      expect(result).toBe("Lead owner: owner@acme.com (Lead: 00Q123)");
    });

    it("presents account_owner_lookup", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("account_owner_lookup", {
          accountId: "001ABC",
          ownerEmail: "owner@acme.com",
          ownerId: "005ABC",
        })
      );
      expect(result).toBe("Account owner: owner@acme.com (Account: 001ABC)");
    });

    it("presents owner_validated as team member", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("owner_validated", { ownerEmail: "owner@acme.com", isTeamMember: true })
      );
      expect(result).toBe("owner@acme.com is a team member");
    });

    it("presents owner_validated not team member", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("owner_validated", { ownerEmail: "owner@acme.com", isTeamMember: false })
      );
      expect(result).toBe("owner@acme.com is not a team member");
    });

    it("presents owner_lookup_skipped with email", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("owner_lookup_skipped", { reason: "free email domain", email: "user@gmail.com" })
      );
      expect(result).toBe("Skipped: free email domain (user@gmail.com)");
    });

    it("presents owner_lookup_skipped without email", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("owner_lookup_skipped", { reason: "feature disabled" })
      );
      expect(result).toBe("Skipped: feature disabled");
    });

    it("presents contact_owner_check_skipped", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("contact_owner_check_skipped", { reason: "route config" })
      );
      expect(result).toBe("Contact owner check skipped: route config");
    });

    // ── Decision ──

    it("presents routing_final_selection", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("routing_final_selection", {
          accountId: "001ABC",
          ownerEmail: "owner@example.com",
          matchMethod: "fuzzy_tiebreak",
          decisiveRule: "Opportunities_MAX",
        })
      );
      expect(result).toBe("Selected owner@example.com from 001ABC (fuzzy_tiebreak, rule: Opportunities_MAX)");
    });

    it("presents routing_fallback_round_robin", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("routing_fallback_round_robin", { reason: "all owners filtered by host check" })
      );
      expect(result).toBe("Fallback to round-robin: all owners filtered by host check");
    });

    it("presents salesforce_assignment", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("salesforce_assignment", {
          email: "owner@acme.com",
          recordType: "Contact",
          recordId: "003ABC",
        })
      );
      expect(result).toBe("Assigned owner@acme.com via Contact (ID: 003ABC)");
    });

    // ── Field Rules ──

    it("presents field_rules_validated", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("field_rules_validated", {
          recordType: "Account",
          configuredCount: 3,
          validCount: 2,
          validFields: ["Industry", "BillingCountry"],
        })
      );
      expect(result).toBe("2/3 valid for Account: Industry, BillingCountry");
    });

    it("presents field_rule_filtered_record", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("field_rule_filtered_record", {
          tier: "Account",
          recordId: "001ABC",
          reason: "field mismatch",
          failedRule: { field: "Industry", value: "Tech", action: "equals" },
        })
      );
      expect(result).toBe('Filtered 001ABC — Industry equals "Tech"');
    });

    it("presents field_rule_evaluated", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("field_rule_evaluated", {
          field: "Industry",
          action: "equals",
          ruleValue: "Tech",
          actualValue: "Finance",
          matches: false,
          result: "filtered",
        })
      );
      expect(result).toBe('"Industry" (equals): expected "Tech", got "Finance" → filtered');
    });

    it("presents all_records_filtered_by_field_rules", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("all_records_filtered_by_field_rules", { recordType: "Account" })
      );
      expect(result).toBe("All Account records filtered out");
    });

    // ── Sync ──

    it("presents sync_error", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("sync_error", {
          objectType: "Event",
          operation: "create",
          sfErrorCode: "INVALID_FIELD",
          sfErrorMessage: "No such column",
          droppedFields: ["Custom__c"],
        })
      );
      expect(result).toBe("Error on Event create: INVALID_FIELD — No such column (dropped: Custom__c)");
    });

    it("presents event_field_type_coerced", () => {
      const result = SalesforceRoutingTracePresenter.present(
        makeStep("event_field_type_coerced", {
          fieldName: "Is_Demo__c",
          originalValue: "True",
          coercedValue: true,
          sfFieldType: "boolean",
        })
      );
      expect(result).toBe('Coerced "Is_Demo__c" from "True" to true (SF type: boolean)');
    });

    // ── Fallback ──

    it("returns step name for unknown step", () => {
      const result = SalesforceRoutingTracePresenter.present(makeStep("unknown_step", {}));
      expect(result).toBe("unknown_step");
    });
  });
});
