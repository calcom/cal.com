import type { CrmRoutingTraceServiceInterface } from "@calcom/types/CrmService";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SalesforceRoutingTraceService } from "./SalesforceRoutingTraceService";

describe("SalesforceRoutingTraceService", () => {
  let mockTrace: CrmRoutingTraceServiceInterface;

  function createMockTrace(): CrmRoutingTraceServiceInterface {
    return {
      addStep: vi.fn(),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockTrace = createMockTrace();
  });

  describe("when trace is undefined", () => {
    it("should not throw when trace is undefined", () => {
      expect(() => {
        SalesforceRoutingTraceService.searchingByWebsiteValue(undefined, { emailDomain: "example.com" });
      }).not.toThrow();
    });

    it("should handle all methods gracefully when trace is undefined", () => {
      expect(() => {
        SalesforceRoutingTraceService.accountFoundByWebsite(undefined, {
          accountId: "123",
          website: "example.com",
        });
        SalesforceRoutingTraceService.searchingByContactEmailDomain(undefined, {
          emailDomain: "example.com",
          contactCount: 5,
        });
        SalesforceRoutingTraceService.noAccountFound(undefined, { email: "test@example.com", reason: "test" });
        SalesforceRoutingTraceService.graphqlQueryInitiated(undefined, {
          email: "test@example.com",
          emailDomain: "example.com",
        });
      }).not.toThrow();
    });
  });

  describe("Account Resolution (SOQL path)", () => {
    describe("searchingByWebsiteValue", () => {
      it("should add step with correct domain and data", () => {
        SalesforceRoutingTraceService.searchingByWebsiteValue(mockTrace, { emailDomain: "acme.com" });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "searching_by_website_value", {
          emailDomain: "acme.com",
        });
      });
    });

    describe("accountFoundByWebsite", () => {
      it("should add step with correct domain and data", () => {
        SalesforceRoutingTraceService.accountFoundByWebsite(mockTrace, {
          accountId: "001ABC123",
          website: "www.acme.com",
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "account_found_by_website", {
          accountId: "001ABC123",
          website: "www.acme.com",
        });
      });
    });

    describe("searchingByContactEmailDomain", () => {
      it("should add step with correct domain and data", () => {
        SalesforceRoutingTraceService.searchingByContactEmailDomain(mockTrace, {
          emailDomain: "acme.com",
          contactCount: 10,
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "searching_by_contact_email_domain", {
          emailDomain: "acme.com",
          contactCount: 10,
        });
      });
    });

    describe("accountSelectedByMostContacts", () => {
      it("should add step with correct domain and data", () => {
        SalesforceRoutingTraceService.accountSelectedByMostContacts(mockTrace, {
          accountId: "001ABC123",
          contactCount: 5,
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "account_selected_by_most_contacts", {
          accountId: "001ABC123",
          contactCount: 5,
        });
      });
    });

    describe("noAccountFound", () => {
      it("should add step with correct domain and data", () => {
        SalesforceRoutingTraceService.noAccountFound(mockTrace, {
          email: "user@unknown.com",
          reason: "No account found by website or contact domain",
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "no_account_found", {
          email: "user@unknown.com",
          reason: "No account found by website or contact domain",
        });
      });
    });
  });

  describe("Lookup Field", () => {
    describe("lookupFieldQuery", () => {
      it("should add step with correct domain and data when accountId is present", () => {
        SalesforceRoutingTraceService.lookupFieldQuery(mockTrace, {
          fieldName: "Account_Owner__c",
          salesforceObject: "Account",
          accountId: "001ABC123",
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "lookup_field_query", {
          fieldName: "Account_Owner__c",
          salesforceObject: "Account",
          accountId: "001ABC123",
        });
      });

      it("should add step with null accountId", () => {
        SalesforceRoutingTraceService.lookupFieldQuery(mockTrace, {
          fieldName: "Account_Owner__c",
          salesforceObject: "Account",
          accountId: null,
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "lookup_field_query", {
          fieldName: "Account_Owner__c",
          salesforceObject: "Account",
          accountId: null,
        });
      });
    });

    describe("userQueryFromLookupField", () => {
      it("should add step with correct domain and data", () => {
        SalesforceRoutingTraceService.userQueryFromLookupField(mockTrace, {
          lookupFieldUserId: "005ABC123",
          userEmail: "owner@acme.com",
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "user_query_from_lookup_field", {
          lookupFieldUserId: "005ABC123",
          userEmail: "owner@acme.com",
        });
      });

      it("should add step with null userEmail", () => {
        SalesforceRoutingTraceService.userQueryFromLookupField(mockTrace, {
          lookupFieldUserId: "005ABC123",
          userEmail: null,
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "user_query_from_lookup_field", {
          lookupFieldUserId: "005ABC123",
          userEmail: null,
        });
      });
    });
  });

  describe("Owner Lookups", () => {
    describe("contactOwnerLookup", () => {
      it("should add step with correct domain and data", () => {
        SalesforceRoutingTraceService.contactOwnerLookup(mockTrace, {
          contactId: "003ABC123",
          ownerEmail: "owner@acme.com",
          ownerId: "005DEF456",
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "contact_owner_lookup", {
          contactId: "003ABC123",
          ownerEmail: "owner@acme.com",
          ownerId: "005DEF456",
        });
      });

      it("should add step with null owner data", () => {
        SalesforceRoutingTraceService.contactOwnerLookup(mockTrace, {
          contactId: "003ABC123",
          ownerEmail: null,
          ownerId: null,
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "contact_owner_lookup", {
          contactId: "003ABC123",
          ownerEmail: null,
          ownerId: null,
        });
      });
    });

    describe("leadOwnerLookup", () => {
      it("should add step with correct domain and data", () => {
        SalesforceRoutingTraceService.leadOwnerLookup(mockTrace, {
          leadId: "00QABC123",
          ownerEmail: "owner@acme.com",
          ownerId: "005DEF456",
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "lead_owner_lookup", {
          leadId: "00QABC123",
          ownerEmail: "owner@acme.com",
          ownerId: "005DEF456",
        });
      });

      it("should add step with null owner data", () => {
        SalesforceRoutingTraceService.leadOwnerLookup(mockTrace, {
          leadId: "00QABC123",
          ownerEmail: null,
          ownerId: null,
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "lead_owner_lookup", {
          leadId: "00QABC123",
          ownerEmail: null,
          ownerId: null,
        });
      });
    });

    describe("accountOwnerLookup", () => {
      it("should add step with correct domain and data", () => {
        SalesforceRoutingTraceService.accountOwnerLookup(mockTrace, {
          accountId: "001ABC123",
          ownerEmail: "owner@acme.com",
          ownerId: "005DEF456",
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "account_owner_lookup", {
          accountId: "001ABC123",
          ownerEmail: "owner@acme.com",
          ownerId: "005DEF456",
        });
      });

      it("should add step with null owner data", () => {
        SalesforceRoutingTraceService.accountOwnerLookup(mockTrace, {
          accountId: "001ABC123",
          ownerEmail: null,
          ownerId: null,
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "account_owner_lookup", {
          accountId: "001ABC123",
          ownerEmail: null,
          ownerId: null,
        });
      });
    });
  });

  describe("Validation", () => {
    describe("ownerValidated", () => {
      it("should add step when owner is a team member", () => {
        SalesforceRoutingTraceService.ownerValidated(mockTrace, {
          ownerEmail: "owner@acme.com",
          isTeamMember: true,
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "owner_validated", {
          ownerEmail: "owner@acme.com",
          isTeamMember: true,
        });
      });

      it("should add step when owner is not a team member", () => {
        SalesforceRoutingTraceService.ownerValidated(mockTrace, {
          ownerEmail: "external@other.com",
          isTeamMember: false,
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "owner_validated", {
          ownerEmail: "external@other.com",
          isTeamMember: false,
        });
      });
    });
  });

  describe("Skip", () => {
    describe("ownerLookupSkipped", () => {
      it("should add step with reason and email", () => {
        SalesforceRoutingTraceService.ownerLookupSkipped(mockTrace, {
          reason: "Free email domain",
          email: "user@gmail.com",
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "owner_lookup_skipped", {
          reason: "Free email domain",
          email: "user@gmail.com",
        });
      });

      it("should add step with reason only (no email)", () => {
        SalesforceRoutingTraceService.ownerLookupSkipped(mockTrace, {
          reason: "No CRM configured",
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "owner_lookup_skipped", {
          reason: "No CRM configured",
        });
      });
    });

    describe("contactOwnerCheckSkipped", () => {
      it("should add step with correct domain and data", () => {
        SalesforceRoutingTraceService.contactOwnerCheckSkipped(mockTrace, {
          reason: "Route config disabled contact owner check",
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "contact_owner_check_skipped", {
          reason: "Route config disabled contact owner check",
        });
      });
    });
  });

  describe("GraphQL-specific", () => {
    describe("graphqlQueryInitiated", () => {
      it("should add step with correct domain and data", () => {
        SalesforceRoutingTraceService.graphqlQueryInitiated(mockTrace, {
          email: "user@acme.com",
          emailDomain: "acme.com",
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "graphql_query_initiated", {
          email: "user@acme.com",
          emailDomain: "acme.com",
        });
      });
    });

    describe("graphqlExistingContactFound", () => {
      it("should add step with correct domain and data", () => {
        SalesforceRoutingTraceService.graphqlExistingContactFound(mockTrace, {
          contactId: "003ABC123",
          accountId: "001DEF456",
          ownerEmail: "owner@acme.com",
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "graphql_existing_contact_found", {
          contactId: "003ABC123",
          accountId: "001DEF456",
          ownerEmail: "owner@acme.com",
        });
      });
    });

    describe("graphqlAccountFoundByWebsite", () => {
      it("should add step with correct domain and data", () => {
        SalesforceRoutingTraceService.graphqlAccountFoundByWebsite(mockTrace, {
          accountId: "001ABC123",
          ownerEmail: "owner@acme.com",
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "graphql_account_found_by_website", {
          accountId: "001ABC123",
          ownerEmail: "owner@acme.com",
        });
      });
    });

    describe("graphqlSearchingByContactDomain", () => {
      it("should add step with correct domain and data", () => {
        SalesforceRoutingTraceService.graphqlSearchingByContactDomain(mockTrace, {
          emailDomain: "acme.com",
          contactCount: 15,
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "graphql_searching_by_contact_domain", {
          emailDomain: "acme.com",
          contactCount: 15,
        });
      });
    });

    describe("graphqlDominantAccountSelected", () => {
      it("should add step with correct domain and data", () => {
        SalesforceRoutingTraceService.graphqlDominantAccountSelected(mockTrace, {
          accountId: "001ABC123",
          contactCount: 8,
          ownerEmail: "owner@acme.com",
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "graphql_dominant_account_selected", {
          accountId: "001ABC123",
          contactCount: 8,
          ownerEmail: "owner@acme.com",
        });
      });
    });

    describe("graphqlNoAccountFound", () => {
      it("should add step with correct domain and data", () => {
        SalesforceRoutingTraceService.graphqlNoAccountFound(mockTrace, {
          email: "user@unknown.com",
          reason: "No account found via any tier",
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "graphql_no_account_found", {
          email: "user@unknown.com",
          reason: "No account found via any tier",
        });
      });

      it("should add step with different reason", () => {
        SalesforceRoutingTraceService.graphqlNoAccountFound(mockTrace, {
          email: "user@example.com",
          reason: "Could not find dominant account from related contacts",
        });

        expect(mockTrace.addStep).toHaveBeenCalledWith("salesforce", "graphql_no_account_found", {
          email: "user@example.com",
          reason: "Could not find dominant account from related contacts",
        });
      });
    });
  });

  describe("domain constant", () => {
    it("should use 'salesforce' as the domain for all methods", () => {
      SalesforceRoutingTraceService.searchingByWebsiteValue(mockTrace, { emailDomain: "test.com" });
      SalesforceRoutingTraceService.accountFoundByWebsite(mockTrace, {
        accountId: "123",
        website: "test.com",
      });
      SalesforceRoutingTraceService.contactOwnerLookup(mockTrace, {
        contactId: "456",
        ownerEmail: "test@test.com",
        ownerId: "789",
      });
      SalesforceRoutingTraceService.graphqlQueryInitiated(mockTrace, {
        email: "test@test.com",
        emailDomain: "test.com",
      });

      const calls = vi.mocked(mockTrace.addStep).mock.calls;
      calls.forEach((call) => {
        expect(call[0]).toBe("salesforce");
      });
    });
  });
});
