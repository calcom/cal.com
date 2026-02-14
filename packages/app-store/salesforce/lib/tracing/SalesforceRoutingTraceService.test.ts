import { CrmRoutingTraceService } from "@calcom/features/routing-trace/services/CrmRoutingTraceService";
import type { RoutingTraceService } from "@calcom/features/routing-trace/services/RoutingTraceService";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SalesforceRoutingTraceService } from "./SalesforceRoutingTraceService";

describe("SalesforceRoutingTraceService", () => {
  let mockParentTraceService: RoutingTraceService;
  let addStepSpy: ReturnType<typeof vi.fn>;

  function createMockParentTraceService(): RoutingTraceService {
    return {
      addStep: vi.fn(),
      getTrace: vi.fn().mockReturnValue([]),
    } as unknown as RoutingTraceService;
  }

  /**
   * Helper to run a function within the CRM trace context.
   * This sets up AsyncLocalStorage so SalesforceRoutingTraceService methods work.
   */
  async function runWithTraceContext<T>(fn: () => T): Promise<T> {
    const crmTrace = CrmRoutingTraceService.create(mockParentTraceService);
    if (!crmTrace) throw new Error("Failed to create CRM trace service");
    return crmTrace.runAsync(async () => fn());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockParentTraceService = createMockParentTraceService();
    addStepSpy = mockParentTraceService.addStep as ReturnType<typeof vi.fn>;
  });

  describe("when called outside trace context", () => {
    it("should not throw when called outside trace context", () => {
      expect(() => {
        SalesforceRoutingTraceService.searchingByWebsiteValue({ emailDomain: "example.com" });
      }).not.toThrow();
    });

    it("should handle all methods gracefully when called outside trace context", () => {
      expect(() => {
        SalesforceRoutingTraceService.accountFoundByWebsite({
          accountId: "123",
          website: "example.com",
        });
        SalesforceRoutingTraceService.searchingByContactEmailDomain({
          emailDomain: "example.com",
          contactCount: 5,
        });
        SalesforceRoutingTraceService.noAccountFound({ email: "test@example.com", reason: "test" });
        SalesforceRoutingTraceService.graphqlQueryInitiated({
          email: "test@example.com",
          emailDomain: "example.com",
        });
      }).not.toThrow();
    });
  });

  describe("Account Resolution (SOQL path)", () => {
    describe("searchingByWebsiteValue", () => {
      it("should add step with correct domain and data", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.searchingByWebsiteValue({ emailDomain: "acme.com" });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "searching_by_website_value",
          data: { emailDomain: "acme.com" },
        });
      });
    });

    describe("accountFoundByWebsite", () => {
      it("should add step with correct domain and data", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.accountFoundByWebsite({
            accountId: "001ABC123",
            website: "www.acme.com",
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "account_found_by_website",
          data: { accountId: "001ABC123", website: "www.acme.com" },
        });
      });
    });

    describe("searchingByContactEmailDomain", () => {
      it("should add step with correct domain and data", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.searchingByContactEmailDomain({
            emailDomain: "acme.com",
            contactCount: 10,
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "searching_by_contact_email_domain",
          data: { emailDomain: "acme.com", contactCount: 10 },
        });
      });
    });

    describe("accountSelectedByMostContacts", () => {
      it("should add step with correct domain and data", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.accountSelectedByMostContacts({
            accountId: "001ABC123",
            contactCount: 5,
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "account_selected_by_most_contacts",
          data: { accountId: "001ABC123", contactCount: 5 },
        });
      });
    });

    describe("noAccountFound", () => {
      it("should add step with correct domain and data", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.noAccountFound({
            email: "user@unknown.com",
            reason: "No account found by website or contact domain",
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "no_account_found",
          data: { email: "user@unknown.com", reason: "No account found by website or contact domain" },
        });
      });
    });
  });

  describe("Lookup Field", () => {
    describe("lookupFieldQuery", () => {
      it("should add step with correct domain and data when accountId is present", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.lookupFieldQuery({
            fieldName: "Account_Owner__c",
            salesforceObject: "Account",
            accountId: "001ABC123",
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "lookup_field_query",
          data: { fieldName: "Account_Owner__c", salesforceObject: "Account", accountId: "001ABC123" },
        });
      });

      it("should add step with null accountId", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.lookupFieldQuery({
            fieldName: "Account_Owner__c",
            salesforceObject: "Account",
            accountId: null,
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "lookup_field_query",
          data: { fieldName: "Account_Owner__c", salesforceObject: "Account", accountId: null },
        });
      });
    });

    describe("userQueryFromLookupField", () => {
      it("should add step with correct domain and data", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.userQueryFromLookupField({
            lookupFieldUserId: "005ABC123",
            userEmail: "owner@acme.com",
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "user_query_from_lookup_field",
          data: { lookupFieldUserId: "005ABC123", userEmail: "owner@acme.com" },
        });
      });

      it("should add step with null userEmail", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.userQueryFromLookupField({
            lookupFieldUserId: "005ABC123",
            userEmail: null,
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "user_query_from_lookup_field",
          data: { lookupFieldUserId: "005ABC123", userEmail: null },
        });
      });
    });
  });

  describe("Owner Lookups", () => {
    describe("contactOwnerLookup", () => {
      it("should add step with correct domain and data", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.contactOwnerLookup({
            contactId: "003ABC123",
            ownerEmail: "owner@acme.com",
            ownerId: "005DEF456",
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "contact_owner_lookup",
          data: { contactId: "003ABC123", ownerEmail: "owner@acme.com", ownerId: "005DEF456" },
        });
      });

      it("should add step with null owner data", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.contactOwnerLookup({
            contactId: "003ABC123",
            ownerEmail: null,
            ownerId: null,
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "contact_owner_lookup",
          data: { contactId: "003ABC123", ownerEmail: null, ownerId: null },
        });
      });
    });

    describe("leadOwnerLookup", () => {
      it("should add step with correct domain and data", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.leadOwnerLookup({
            leadId: "00QABC123",
            ownerEmail: "owner@acme.com",
            ownerId: "005DEF456",
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "lead_owner_lookup",
          data: { leadId: "00QABC123", ownerEmail: "owner@acme.com", ownerId: "005DEF456" },
        });
      });

      it("should add step with null owner data", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.leadOwnerLookup({
            leadId: "00QABC123",
            ownerEmail: null,
            ownerId: null,
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "lead_owner_lookup",
          data: { leadId: "00QABC123", ownerEmail: null, ownerId: null },
        });
      });
    });

    describe("accountOwnerLookup", () => {
      it("should add step with correct domain and data", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.accountOwnerLookup({
            accountId: "001ABC123",
            ownerEmail: "owner@acme.com",
            ownerId: "005DEF456",
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "account_owner_lookup",
          data: { accountId: "001ABC123", ownerEmail: "owner@acme.com", ownerId: "005DEF456" },
        });
      });

      it("should add step with null owner data", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.accountOwnerLookup({
            accountId: "001ABC123",
            ownerEmail: null,
            ownerId: null,
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "account_owner_lookup",
          data: { accountId: "001ABC123", ownerEmail: null, ownerId: null },
        });
      });
    });
  });

  describe("Validation", () => {
    describe("ownerValidated", () => {
      it("should add step when owner is a team member", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.ownerValidated({
            ownerEmail: "owner@acme.com",
            isTeamMember: true,
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "owner_validated",
          data: { ownerEmail: "owner@acme.com", isTeamMember: true },
        });
      });

      it("should add step when owner is not a team member", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.ownerValidated({
            ownerEmail: "external@other.com",
            isTeamMember: false,
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "owner_validated",
          data: { ownerEmail: "external@other.com", isTeamMember: false },
        });
      });
    });
  });

  describe("Skip", () => {
    describe("ownerLookupSkipped", () => {
      it("should add step with reason and email", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.ownerLookupSkipped({
            reason: "Free email domain",
            email: "user@gmail.com",
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "owner_lookup_skipped",
          data: { reason: "Free email domain", email: "user@gmail.com" },
        });
      });

      it("should add step with reason only (no email)", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.ownerLookupSkipped({
            reason: "No CRM configured",
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "owner_lookup_skipped",
          data: { reason: "No CRM configured" },
        });
      });
    });

    describe("contactOwnerCheckSkipped", () => {
      it("should add step with correct domain and data", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.contactOwnerCheckSkipped({
            reason: "Route config disabled contact owner check",
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "contact_owner_check_skipped",
          data: { reason: "Route config disabled contact owner check" },
        });
      });
    });
  });

  describe("GraphQL-specific", () => {
    describe("graphqlQueryInitiated", () => {
      it("should add step with correct domain and data", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.graphqlQueryInitiated({
            email: "user@acme.com",
            emailDomain: "acme.com",
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "graphql_query_initiated",
          data: { email: "user@acme.com", emailDomain: "acme.com" },
        });
      });
    });

    describe("graphqlExistingContactFound", () => {
      it("should add step with correct domain and data", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.graphqlExistingContactFound({
            contactId: "003ABC123",
            accountId: "001DEF456",
            ownerEmail: "owner@acme.com",
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "graphql_existing_contact_found",
          data: { contactId: "003ABC123", accountId: "001DEF456", ownerEmail: "owner@acme.com" },
        });
      });
    });

    describe("graphqlAccountFoundByWebsite", () => {
      it("should add step with correct domain and data", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.graphqlAccountFoundByWebsite({
            accountId: "001ABC123",
            ownerEmail: "owner@acme.com",
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "graphql_account_found_by_website",
          data: { accountId: "001ABC123", ownerEmail: "owner@acme.com" },
        });
      });
    });

    describe("graphqlSearchingByContactDomain", () => {
      it("should add step with correct domain and data", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.graphqlSearchingByContactDomain({
            emailDomain: "acme.com",
            contactCount: 15,
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "graphql_searching_by_contact_domain",
          data: { emailDomain: "acme.com", contactCount: 15 },
        });
      });
    });

    describe("graphqlDominantAccountSelected", () => {
      it("should add step with correct domain and data", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.graphqlDominantAccountSelected({
            accountId: "001ABC123",
            contactCount: 8,
            ownerEmail: "owner@acme.com",
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "graphql_dominant_account_selected",
          data: { accountId: "001ABC123", contactCount: 8, ownerEmail: "owner@acme.com" },
        });
      });
    });

    describe("graphqlNoAccountFound", () => {
      it("should add step with correct domain and data", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.graphqlNoAccountFound({
            email: "user@unknown.com",
            reason: "No account found via any tier",
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "graphql_no_account_found",
          data: { email: "user@unknown.com", reason: "No account found via any tier" },
        });
      });

      it("should add step with different reason", async () => {
        await runWithTraceContext(() => {
          SalesforceRoutingTraceService.graphqlNoAccountFound({
            email: "user@example.com",
            reason: "Could not find dominant account from related contacts",
          });
        });

        expect(addStepSpy).toHaveBeenCalledWith({
          domain: "salesforce",
          step: "graphql_no_account_found",
          data: {
            email: "user@example.com",
            reason: "Could not find dominant account from related contacts",
          },
        });
      });
    });
  });

  describe("domain constant", () => {
    it("should use 'salesforce' as the domain for all methods", async () => {
      await runWithTraceContext(() => {
        SalesforceRoutingTraceService.searchingByWebsiteValue({ emailDomain: "test.com" });
        SalesforceRoutingTraceService.accountFoundByWebsite({
          accountId: "123",
          website: "test.com",
        });
        SalesforceRoutingTraceService.contactOwnerLookup({
          contactId: "456",
          ownerEmail: "test@test.com",
          ownerId: "789",
        });
        SalesforceRoutingTraceService.graphqlQueryInitiated({
          email: "test@test.com",
          emailDomain: "test.com",
        });
      });

      const calls = addStepSpy.mock.calls;
      calls.forEach((call: [{ domain: string; step: string; data: Record<string, unknown> }]) => {
        expect(call[0].domain).toBe("salesforce");
      });
    });
  });
});
