import { describe, expect, it } from "vitest";

import type { RoutingStep } from "../repositories/RoutingTraceRepository.interface";
import { SalesforceRoutingTracePresenter } from "./SalesforceRoutingTracePresenter";

function makeStep(step: string, data: Record<string, unknown> = {}): RoutingStep {
  return { domain: "salesforce", step, timestamp: Date.now(), data };
}

describe("SalesforceRoutingTracePresenter", () => {
  it("presents searching_by_website_value", () => {
    const result = SalesforceRoutingTracePresenter.present(
      makeStep("searching_by_website_value", { emailDomain: "acme.com" })
    );
    expect(result).toBe('Searching for Salesforce account by website matching domain "acme.com"');
  });

  it("presents account_found_by_website", () => {
    const result = SalesforceRoutingTracePresenter.present(
      makeStep("account_found_by_website", { accountId: "001ABC", website: "acme.com" })
    );
    expect(result).toBe('Account found by website "acme.com" (Account ID: 001ABC)');
  });

  it("presents searching_by_contact_email_domain", () => {
    const result = SalesforceRoutingTracePresenter.present(
      makeStep("searching_by_contact_email_domain", { emailDomain: "acme.com", contactCount: 5 })
    );
    expect(result).toBe('Searching contacts with email domain "acme.com" (5 contacts found)');
  });

  it("presents account_selected_by_most_contacts", () => {
    const result = SalesforceRoutingTracePresenter.present(
      makeStep("account_selected_by_most_contacts", { accountId: "001ABC", contactCount: 3 })
    );
    expect(result).toBe("Account selected with most contacts: 001ABC (3 contacts)");
  });

  it("presents no_account_found", () => {
    const result = SalesforceRoutingTracePresenter.present(
      makeStep("no_account_found", { email: "user@acme.com", reason: "free email domain" })
    );
    expect(result).toBe("No account found for user@acme.com: free email domain");
  });

  it("presents lookup_field_query with accountId", () => {
    const result = SalesforceRoutingTracePresenter.present(
      makeStep("lookup_field_query", {
        fieldName: "Owner__c",
        salesforceObject: "Account",
        accountId: "001ABC",
      })
    );
    expect(result).toBe('Querying lookup field "Owner__c" on Account (Account: 001ABC)');
  });

  it("presents lookup_field_query without accountId", () => {
    const result = SalesforceRoutingTracePresenter.present(
      makeStep("lookup_field_query", { fieldName: "Owner__c", salesforceObject: "Account", accountId: null })
    );
    expect(result).toBe('Querying lookup field "Owner__c" on Account');
  });

  it("presents user_query_from_lookup_field", () => {
    const result = SalesforceRoutingTracePresenter.present(
      makeStep("user_query_from_lookup_field", { lookupFieldUserId: "005ABC", userEmail: "owner@acme.com" })
    );
    expect(result).toBe("Lookup field resolved to user owner@acme.com (User ID: 005ABC)");
  });

  it("presents contact_owner_lookup", () => {
    const result = SalesforceRoutingTracePresenter.present(
      makeStep("contact_owner_lookup", {
        contactId: "003ABC",
        ownerEmail: "owner@acme.com",
        ownerId: "005ABC",
      })
    );
    expect(result).toBe("Contact owner lookup: owner@acme.com (Contact: 003ABC)");
  });

  it("presents lead_owner_lookup", () => {
    const result = SalesforceRoutingTracePresenter.present(
      makeStep("lead_owner_lookup", { leadId: "00Q123", ownerEmail: "owner@acme.com", ownerId: "005ABC" })
    );
    expect(result).toBe("Lead owner lookup: owner@acme.com (Lead: 00Q123)");
  });

  it("presents account_owner_lookup", () => {
    const result = SalesforceRoutingTracePresenter.present(
      makeStep("account_owner_lookup", {
        accountId: "001ABC",
        ownerEmail: "owner@acme.com",
        ownerId: "005ABC",
      })
    );
    expect(result).toBe("Account owner lookup: owner@acme.com (Account: 001ABC)");
  });

  it("presents owner_validated", () => {
    const result = SalesforceRoutingTracePresenter.present(
      makeStep("owner_validated", { ownerEmail: "owner@acme.com", isTeamMember: true })
    );
    expect(result).toBe("Owner owner@acme.com validated as team member: true");
  });

  it("presents owner_lookup_skipped with email", () => {
    const result = SalesforceRoutingTracePresenter.present(
      makeStep("owner_lookup_skipped", { reason: "free email domain", email: "user@gmail.com" })
    );
    expect(result).toBe("Owner lookup skipped: free email domain (user@gmail.com)");
  });

  it("presents owner_lookup_skipped without email", () => {
    const result = SalesforceRoutingTracePresenter.present(
      makeStep("owner_lookup_skipped", { reason: "feature disabled" })
    );
    expect(result).toBe("Owner lookup skipped: feature disabled");
  });

  it("presents contact_owner_check_skipped", () => {
    const result = SalesforceRoutingTracePresenter.present(
      makeStep("contact_owner_check_skipped", { reason: "route config" })
    );
    expect(result).toBe("Contact owner check skipped: route config");
  });

  it("presents graphql_query_initiated", () => {
    const result = SalesforceRoutingTracePresenter.present(
      makeStep("graphql_query_initiated", { email: "user@acme.com", emailDomain: "acme.com" })
    );
    expect(result).toBe("GraphQL account resolution initiated for user@acme.com (domain: acme.com)");
  });

  it("presents graphql_existing_contact_found", () => {
    const result = SalesforceRoutingTracePresenter.present(
      makeStep("graphql_existing_contact_found", {
        contactId: "003ABC",
        accountId: "001ABC",
        ownerEmail: "owner@acme.com",
      })
    );
    expect(result).toBe(
      "Existing contact found via GraphQL: 003ABC (Account: 001ABC, Owner: owner@acme.com)"
    );
  });

  it("presents graphql_account_found_by_website", () => {
    const result = SalesforceRoutingTracePresenter.present(
      makeStep("graphql_account_found_by_website", { accountId: "001ABC", ownerEmail: "owner@acme.com" })
    );
    expect(result).toBe("Account found by website via GraphQL: 001ABC (Owner: owner@acme.com)");
  });

  it("presents graphql_searching_by_contact_domain", () => {
    const result = SalesforceRoutingTracePresenter.present(
      makeStep("graphql_searching_by_contact_domain", { emailDomain: "acme.com", contactCount: 3 })
    );
    expect(result).toBe('Searching contacts by domain via GraphQL: "acme.com" (3 contacts)');
  });

  it("presents graphql_dominant_account_selected", () => {
    const result = SalesforceRoutingTracePresenter.present(
      makeStep("graphql_dominant_account_selected", {
        accountId: "001ABC",
        contactCount: 5,
        ownerEmail: "owner@acme.com",
      })
    );
    expect(result).toBe("Dominant account selected via GraphQL: 001ABC (5 contacts, Owner: owner@acme.com)");
  });

  it("presents graphql_no_account_found", () => {
    const result = SalesforceRoutingTracePresenter.present(
      makeStep("graphql_no_account_found", { email: "user@acme.com", reason: "no matching records" })
    );
    expect(result).toBe("No account found via GraphQL for user@acme.com: no matching records");
  });

  it("presents salesforce_assignment", () => {
    const result = SalesforceRoutingTracePresenter.present(
      makeStep("salesforce_assignment", {
        email: "owner@acme.com",
        recordType: "Contact",
        recordId: "003ABC",
      })
    );
    expect(result).toBe("Salesforce assignment: owner@acme.com via Contact (ID: 003ABC)");
  });

  it("returns fallback for unknown step", () => {
    const result = SalesforceRoutingTracePresenter.present(makeStep("unknown_step", {}));
    expect(result).toBe("Salesforce: unknown_step");
  });
});
