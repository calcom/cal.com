import { CrmRoutingTraceService } from "@calcom/features/routing-trace/services/CrmRoutingTraceService";

const DOMAIN = "salesforce";

/**
 * Static class providing trace methods for Salesforce CRM routing operations.
 * Uses AsyncLocalStorage to automatically get the current trace context.
 * Methods are no-ops if called outside a trace context.
 */
export class SalesforceRoutingTraceService {
  private static addStep(step: string, data: Record<string, unknown> = {}): void {
    CrmRoutingTraceService.getCurrent()?.addStep(DOMAIN, step, data);
  }

  // ===== Account Resolution (SOQL path) =====

  /**
   * Record when searching for account by website field (matching email domain).
   */
  static searchingByWebsiteValue(data: { emailDomain: string }): void {
    SalesforceRoutingTraceService.addStep("searching_by_website_value", data);
  }

  /**
   * Record when an account is found by website match.
   */
  static accountFoundByWebsite(data: { accountId: string; website: string }): void {
    SalesforceRoutingTraceService.addStep("account_found_by_website", data);
  }

  /**
   * Record when searching for account via contacts with same email domain.
   */
  static searchingByContactEmailDomain(data: { emailDomain: string; contactCount: number }): void {
    SalesforceRoutingTraceService.addStep("searching_by_contact_email_domain", data);
  }

  /**
   * Record when account is selected based on having most contacts.
   */
  static accountSelectedByMostContacts(data: { accountId: string; contactCount: number }): void {
    SalesforceRoutingTraceService.addStep("account_selected_by_most_contacts", data);
  }

  /**
   * Record when no account could be found.
   */
  static noAccountFound(data: { email: string; reason: string }): void {
    SalesforceRoutingTraceService.addStep("no_account_found", data);
  }

  // ===== Lookup Field =====

  /**
   * Record lookup field query execution.
   */
  static lookupFieldQuery(data: {
    fieldName: string;
    salesforceObject: string;
    accountId: string | null;
  }): void {
    SalesforceRoutingTraceService.addStep("lookup_field_query", data);
  }

  /**
   * Record user query from lookup field result.
   */
  static userQueryFromLookupField(data: { lookupFieldUserId: string; userEmail: string | null }): void {
    SalesforceRoutingTraceService.addStep("user_query_from_lookup_field", data);
  }

  // ===== Owner Lookups =====

  /**
   * Record contact owner lookup.
   */
  static contactOwnerLookup(data: {
    contactId: string;
    ownerEmail: string | null;
    ownerId: string | null;
  }): void {
    SalesforceRoutingTraceService.addStep("contact_owner_lookup", data);
  }

  /**
   * Record lead owner lookup.
   */
  static leadOwnerLookup(data: { leadId: string; ownerEmail: string | null; ownerId: string | null }): void {
    SalesforceRoutingTraceService.addStep("lead_owner_lookup", data);
  }

  /**
   * Record account owner lookup.
   */
  static accountOwnerLookup(data: {
    accountId: string;
    ownerEmail: string | null;
    ownerId: string | null;
  }): void {
    SalesforceRoutingTraceService.addStep("account_owner_lookup", data);
  }

  // ===== Validation =====

  /**
   * Record when owner is validated as a team member.
   */
  static ownerValidated(data: { ownerEmail: string; isTeamMember: boolean }): void {
    SalesforceRoutingTraceService.addStep("owner_validated", data);
  }

  // ===== Skip =====

  /**
   * Record when owner lookup is skipped (e.g., free email domain).
   */
  static ownerLookupSkipped(data: { reason: string; email?: string }): void {
    SalesforceRoutingTraceService.addStep("owner_lookup_skipped", data);
  }

  /**
   * Record when contact owner check is skipped due to route config.
   */
  static contactOwnerCheckSkipped(data: { reason: string }): void {
    SalesforceRoutingTraceService.addStep("contact_owner_check_skipped", data);
  }

  // ===== GraphQL-specific (resolution in GetAccountRecordsForRRSkip) =====

  /**
   * Record when GraphQL query is initiated for account resolution.
   */
  static graphqlQueryInitiated(data: { email: string; emailDomain: string }): void {
    SalesforceRoutingTraceService.addStep("graphql_query_initiated", data);
  }

  /**
   * Record when existing contact is found and its account is used.
   */
  static graphqlExistingContactFound(data: {
    contactId: string;
    accountId: string;
    ownerEmail: string;
  }): void {
    SalesforceRoutingTraceService.addStep("graphql_existing_contact_found", data);
  }

  /**
   * Record when account found by website match.
   */
  static graphqlAccountFoundByWebsite(data: { accountId: string; ownerEmail: string }): void {
    SalesforceRoutingTraceService.addStep("graphql_account_found_by_website", data);
  }

  /**
   * Record when searching related contacts by email domain.
   */
  static graphqlSearchingByContactDomain(data: { emailDomain: string; contactCount: number }): void {
    SalesforceRoutingTraceService.addStep("graphql_searching_by_contact_domain", data);
  }

  /**
   * Record when dominant account is selected from related contacts.
   */
  static graphqlDominantAccountSelected(data: {
    accountId: string;
    contactCount: number;
    ownerEmail: string;
  }): void {
    SalesforceRoutingTraceService.addStep("graphql_dominant_account_selected", data);
  }

  /**
   * Record when no account is found via GraphQL.
   */
  static graphqlNoAccountFound(data: { email: string; reason: string }): void {
    SalesforceRoutingTraceService.addStep("graphql_no_account_found", data);
  }

  // ===== Field Rules =====

  /**
   * Record field rules validation result.
   */
  static fieldRulesValidated(data: {
    recordType: string;
    configuredCount: number;
    validCount: number;
    validFields?: string[];
  }): void {
    SalesforceRoutingTraceService.addStep("field_rules_validated", data);
  }

  /**
   * Record when a record is filtered out by field rules.
   */
  static fieldRuleFilteredRecord(data: {
    tier: string;
    recordId: string;
    reason: string;
    failedRule?: { field: string; value: string; action: string };
  }): void {
    SalesforceRoutingTraceService.addStep("field_rule_filtered_record", data);
  }

  /**
   * Record field rule evaluation detail.
   */
  static fieldRuleEvaluated(data: {
    field: string;
    action: string;
    ruleValue: string;
    actualValue: string;
    matches: boolean;
    result: "passed" | "filtered";
  }): void {
    SalesforceRoutingTraceService.addStep("field_rule_evaluated", data);
  }

  /**
   * Record when all records are filtered out by field rules in the SOQL path.
   */
  static allRecordsFilteredByFieldRules(data: { recordType: string }): void {
    SalesforceRoutingTraceService.addStep("all_records_filtered_by_field_rules", data);
  }
}
