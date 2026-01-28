import type { CrmRoutingTraceServiceInterface } from "@calcom/types/CrmService";

const DOMAIN = "salesforce";

/**
 * Static class providing trace methods for Salesforce CRM routing operations.
 * Each method accepts an optional CrmRoutingTraceServiceInterface and only records if present.
 */
export class SalesforceRoutingTraceService {
  // ===== Account Resolution (SOQL path) =====

  /**
   * Record when searching for account by website field (matching email domain).
   */
  static searchingByWebsiteValue(
    trace: CrmRoutingTraceServiceInterface | undefined,
    data: {
      emailDomain: string;
    }
  ): void {
    trace?.addStep(DOMAIN, "searching_by_website_value", data);
  }

  /**
   * Record when an account is found by website match.
   */
  static accountFoundByWebsite(
    trace: CrmRoutingTraceServiceInterface | undefined,
    data: {
      accountId: string;
      website: string;
    }
  ): void {
    trace?.addStep(DOMAIN, "account_found_by_website", data);
  }

  /**
   * Record when searching for account via contacts with same email domain.
   */
  static searchingByContactEmailDomain(
    trace: CrmRoutingTraceServiceInterface | undefined,
    data: {
      emailDomain: string;
      contactCount: number;
    }
  ): void {
    trace?.addStep(DOMAIN, "searching_by_contact_email_domain", data);
  }

  /**
   * Record when account is selected based on having most contacts.
   */
  static accountSelectedByMostContacts(
    trace: CrmRoutingTraceServiceInterface | undefined,
    data: {
      accountId: string;
      contactCount: number;
    }
  ): void {
    trace?.addStep(DOMAIN, "account_selected_by_most_contacts", data);
  }

  /**
   * Record when no account could be found.
   */
  static noAccountFound(
    trace: CrmRoutingTraceServiceInterface | undefined,
    data: {
      email: string;
      reason: string;
    }
  ): void {
    trace?.addStep(DOMAIN, "no_account_found", data);
  }

  // ===== Lookup Field =====

  /**
   * Record lookup field query execution.
   */
  static lookupFieldQuery(
    trace: CrmRoutingTraceServiceInterface | undefined,
    data: {
      fieldName: string;
      salesforceObject: string;
      accountId: string | null;
    }
  ): void {
    trace?.addStep(DOMAIN, "lookup_field_query", data);
  }

  /**
   * Record user query from lookup field result.
   */
  static userQueryFromLookupField(
    trace: CrmRoutingTraceServiceInterface | undefined,
    data: {
      lookupFieldUserId: string;
      userEmail: string | null;
    }
  ): void {
    trace?.addStep(DOMAIN, "user_query_from_lookup_field", data);
  }

  // ===== Owner Lookups =====

  /**
   * Record contact owner lookup.
   */
  static contactOwnerLookup(
    trace: CrmRoutingTraceServiceInterface | undefined,
    data: {
      contactId: string;
      ownerEmail: string | null;
      ownerId: string | null;
    }
  ): void {
    trace?.addStep(DOMAIN, "contact_owner_lookup", data);
  }

  /**
   * Record lead owner lookup.
   */
  static leadOwnerLookup(
    trace: CrmRoutingTraceServiceInterface | undefined,
    data: {
      leadId: string;
      ownerEmail: string | null;
      ownerId: string | null;
    }
  ): void {
    trace?.addStep(DOMAIN, "lead_owner_lookup", data);
  }

  /**
   * Record account owner lookup.
   */
  static accountOwnerLookup(
    trace: CrmRoutingTraceServiceInterface | undefined,
    data: {
      accountId: string;
      ownerEmail: string | null;
      ownerId: string | null;
    }
  ): void {
    trace?.addStep(DOMAIN, "account_owner_lookup", data);
  }

  // ===== Validation =====

  /**
   * Record when owner is validated as a team member.
   */
  static ownerValidated(
    trace: CrmRoutingTraceServiceInterface | undefined,
    data: {
      ownerEmail: string;
      isTeamMember: boolean;
    }
  ): void {
    trace?.addStep(DOMAIN, "owner_validated", data);
  }

  // ===== Skip =====

  /**
   * Record when owner lookup is skipped (e.g., free email domain).
   */
  static ownerLookupSkipped(
    trace: CrmRoutingTraceServiceInterface | undefined,
    data: {
      reason: string;
      email?: string;
    }
  ): void {
    trace?.addStep(DOMAIN, "owner_lookup_skipped", data);
  }

  /**
   * Record when contact owner check is skipped due to route config.
   */
  static contactOwnerCheckSkipped(
    trace: CrmRoutingTraceServiceInterface | undefined,
    data: {
      reason: string;
    }
  ): void {
    trace?.addStep(DOMAIN, "contact_owner_check_skipped", data);
  }

  // ===== GraphQL-specific (resolution in GetAccountRecordsForRRSkip) =====

  /**
   * Record when GraphQL query is initiated for account resolution.
   */
  static graphqlQueryInitiated(
    trace: CrmRoutingTraceServiceInterface | undefined,
    data: {
      email: string;
      emailDomain: string;
    }
  ): void {
    trace?.addStep(DOMAIN, "graphql_query_initiated", data);
  }

  /**
   * Record when existing contact is found and its account is used.
   */
  static graphqlExistingContactFound(
    trace: CrmRoutingTraceServiceInterface | undefined,
    data: {
      contactId: string;
      accountId: string;
      ownerEmail: string;
    }
  ): void {
    trace?.addStep(DOMAIN, "graphql_existing_contact_found", data);
  }

  /**
   * Record when account found by website match.
   */
  static graphqlAccountFoundByWebsite(
    trace: CrmRoutingTraceServiceInterface | undefined,
    data: {
      accountId: string;
      ownerEmail: string;
    }
  ): void {
    trace?.addStep(DOMAIN, "graphql_account_found_by_website", data);
  }

  /**
   * Record when searching related contacts by email domain.
   */
  static graphqlSearchingByContactDomain(
    trace: CrmRoutingTraceServiceInterface | undefined,
    data: {
      emailDomain: string;
      contactCount: number;
    }
  ): void {
    trace?.addStep(DOMAIN, "graphql_searching_by_contact_domain", data);
  }

  /**
   * Record when dominant account is selected from related contacts.
   */
  static graphqlDominantAccountSelected(
    trace: CrmRoutingTraceServiceInterface | undefined,
    data: {
      accountId: string;
      contactCount: number;
      ownerEmail: string;
    }
  ): void {
    trace?.addStep(DOMAIN, "graphql_dominant_account_selected", data);
  }

  /**
   * Record when no account is found via GraphQL.
   */
  static graphqlNoAccountFound(
    trace: CrmRoutingTraceServiceInterface | undefined,
    data: {
      email: string;
      reason: string;
    }
  ): void {
    trace?.addStep(DOMAIN, "graphql_no_account_found", data);
  }
}
