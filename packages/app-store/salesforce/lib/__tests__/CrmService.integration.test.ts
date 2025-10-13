/**
 * Purpose of these tests is to ensure that we test from CrmService and salesforce interactions perspective purely
 * It allows us to document the behaviour more from User perspective and also verify it in parallel
 *
 * It will also give us confidence to refactor as it doesn't care about internal functions.
 *
 * CrmService.test.ts could still focus on testing detailed edge cases as needed.
 */
import "../../../../../tests/libs/__mocks__/prisma";

import jsforce from "@jsforce/jsforce-node";
import { describe, it, expect, vi, beforeEach } from "vitest";

import SalesforceCRMService from "../CrmService";
import { SalesforceRecordEnum } from "../enums";
import {
  mockValueOfAccountOwnershipQueryMatchingContact,
  mockValueOfAccountOwnershipQueryMatchingAccountWebsite,
  mockValueOfAccountOwnershipQueryMatchingRelatedContacts,
} from "../graphql/__tests__/urqlMock";
import { createSalesforceMock } from "./salesforceMock";

const mockUrqlQuery = vi.fn();

vi.mock("@urql/core", () => ({
  Client: class {
    query = mockUrqlQuery;
  },
  cacheExchange: vi.fn(),
  fetchExchange: vi.fn(),
}));

vi.mock("@calcom/lib/constants", () => {
  return {
    WEBAPP_URL: "https://app.cal.com",
    APP_CREDENTIAL_SHARING_ENABLED: false,
    IS_PRODUCTION: false,
  };
});
// Mock dependencies
vi.mock("@jsforce/jsforce-node", () => {
  return {
    default: {
      Connection: vi.fn().mockImplementation(() => ({})),
    },
  };
});

vi.mock("@calcom/features/watchlist/lib/checkIfFreeEmailDomain", () => ({
  checkIfFreeEmailDomain: vi.fn().mockResolvedValue(false),
}));

vi.mock("../getSalesforceAppKeys", () => ({
  getSalesforceAppKeys: vi.fn().mockResolvedValue({
    consumer_key: "test_consumer_key",
    consumer_secret: "test_consumer_secret",
  }),
}));

// Helper to create mock credential
const createMockCredential = () => {
  return {
    id: 1,
    key: {
      access_token: "test_access_token",
      refresh_token: "test_refresh_token",
      instance_url: "https://test.salesforce.com",
    },
    type: "salesforce_other_calendar",
    user: {
      email: "test@example.com",
    },
    userId: 1,
    teamId: 1,
    appId: "test_app_id",
    invalid: false,
    delegationCredentialId: null,
  };
};

const salesforceSettingScenario = {
  createOnLeadAndSearchOnAccount: () => {
    return {
      appOptions: {
        createEventOn: SalesforceRecordEnum.LEAD,
        createEventOnLeadCheckForContact: true,
        createNewContactUnderAccount: true,
        roundRobinSkipCheckRecordOn: SalesforceRecordEnum.ACCOUNT,
      },
      credential: createMockCredential(),
    };
  },
};

describe("SalesforceCRMService", () => {
  let salesforceMock: ReturnType<typeof createSalesforceMock>;

  beforeEach(() => {
    salesforceMock = createSalesforceMock();
    fetchMock.mockReturnValueOnce(
      Promise.resolve(
        new Response(
          JSON.stringify({
            id: "abc",
            issued_at: "123",
            instance_url: "https://test.salesforce.com",
            signature: "123",
            access_token: "123",
            scope: "123",
            token_type: "123",
          }),
          {
            status: 200,
          }
        )
      )
    );
    // Override jsforce mock with our custom mock
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Not full implementation of jsforce.Connection
    vi.mocked(jsforce.Connection).mockImplementation(() => ({
      ...salesforceMock.mockConnection,
      version: "1.0",
      loginUrl: "https://test.salesforce.com",
      instanceUrl: "https://test.salesforce.com",
      accessToken: "123",
    }));
  });

  describe("createOnLeadAndSearchOnAccount", () => {
    const { appOptions, credential } = salesforceSettingScenario.createOnLeadAndSearchOnAccount();
    describe("getContacts: forRoundRobinSkip=true", () => {
      const forRoundRobinSkip = true;
      it("(Lookup-1) should return contact's account owner's email as ownerEmail if the contact is found directly by email", async () => {
        mockUrqlQuery.mockResolvedValue(mockValueOfAccountOwnershipQueryMatchingContact());
        const crmService = new SalesforceCRMService(credential, appOptions);
        const contactAccountOwnerEmail = "owner@test.com";
        const lookingForEmail = "contact@email.com";

        const contacts = await crmService.getContacts({
          emails: lookingForEmail,
          forRoundRobinSkip,
        });

        expect(contacts).toHaveLength(1);
        expect(contacts[0].ownerEmail).toBe(contactAccountOwnerEmail);
        expect(contacts[0].email).toBe(lookingForEmail);
        expect(contacts[0].recordType).toBe(SalesforceRecordEnum.ACCOUNT);
        expect(contacts[0].id).toBe("accountId");
      });

      it("(Lookup-2) should fallback to account(and use the account owner email as ownerEmail) matched by emailDomain if the contact is not found(i.e Lookup-1 fails)", async () => {
        mockUrqlQuery.mockResolvedValue(mockValueOfAccountOwnershipQueryMatchingAccountWebsite());
        const crmService = new SalesforceCRMService(credential, appOptions);
        const contactAccountOwnerEmail = "owner@test.com";
        const emailDomain = "example.com";
        const lookingForEmail = `test@${emailDomain}`;

        const contacts = await crmService.getContacts({
          emails: lookingForEmail,
          forRoundRobinSkip,
        });

        expect(contacts).toHaveLength(1);
        expect(contacts[0].ownerEmail).toBe(contactAccountOwnerEmail);
        // Account doesn't have email
        expect(contacts[0].email).toBe("");
        expect(contacts[0].recordType).toBe(SalesforceRecordEnum.ACCOUNT);
        // FIXME: Seems like a bug as this should have been accountId but it is undefined
        // expect(contacts[0].id).toBe(account.Id);
      });

      it("(Lookup-3) should fallback to account having most number of contacts matched by emailDomain when Lookup-1 and Lookup-2 fails", async () => {
        mockUrqlQuery.mockResolvedValue(mockValueOfAccountOwnershipQueryMatchingRelatedContacts());
        const crmService = new SalesforceCRMService(credential, appOptions);
        const accountOwnerEmail = "owner1@test.com";
        const emailDomain = "example.com";
        const lookingForEmail = `test@${emailDomain}`;

        const contacts = await crmService.getContacts({
          emails: lookingForEmail,
          forRoundRobinSkip,
        });

        expect(contacts).toHaveLength(1);
        expect(contacts[0].ownerEmail).toBe(accountOwnerEmail);
        // Account doesn't have email
        expect(contacts[0].email).toBe("");
        expect(contacts[0].recordType).toBe(SalesforceRecordEnum.ACCOUNT);
        // FIXME: Seems like a bug as this should have been accountId but it is undefined
        // expect(contacts[0].id).toBe(dominatingAccount.Id);
      });
    });

    describe("getContacts: forRoundRobinSkip=false i.e. how it is called when creating event", () => {
      const forRoundRobinSkip = false;
      it("should return lead object if the lead is found directly by email and contact is not found by that email", async () => {
        const crmService = new SalesforceCRMService(credential, appOptions);
        const contactAccountOwnerEmail = "contact-account-owner@acme.com";
        const contactOwnerEmail = "contact-owner@acme.com";
        const leadOwnerEmail = "lead-owner@acme.com";
        const lookingForEmail = "test1@example.com";
        const contactEmail = "test2@example.com";

        const account = salesforceMock.addAccount({
          Id: "test-account-id",
          Owner: {
            Email: contactAccountOwnerEmail,
          },
          Website: "https://anything",
        });

        const contact = salesforceMock.addContact({
          // Contact doesn't have the matching email
          Email: contactEmail,
          FirstName: "Test",
          LastName: "User",
          AccountId: account.Id,
          Owner: {
            Email: contactOwnerEmail,
          },
        });

        const lead = salesforceMock.addLead({
          // Lead has the matching email
          Email: lookingForEmail,
          FirstName: "Test",
          LastName: "User",
          Owner: {
            Email: leadOwnerEmail,
          },
        });

        const contactsOrLeadsOrAccounts = await crmService.getContacts({
          emails: lookingForEmail,
          forRoundRobinSkip,
        });

        expect(contactsOrLeadsOrAccounts).toHaveLength(1);
        // Because we intentionally don't include owner data in this case
        expect(contactsOrLeadsOrAccounts[0].ownerEmail).toBe(undefined);
        expect(contactsOrLeadsOrAccounts[0].email).toBe(lookingForEmail);
        expect(contactsOrLeadsOrAccounts[0].recordType).toBe(SalesforceRecordEnum.LEAD);
        expect(contactsOrLeadsOrAccounts[0].id).toBe(lead.Id);
      });

      it("should return contact object(if there is one by that email) even if lead is found by that email", async () => {
        const crmService = new SalesforceCRMService(credential, appOptions);
        const contactAccountOwnerEmail = "contact-account-owner@acme.com";
        const contactOwnerEmail = "contact-owner@acme.com";
        const leadOwnerEmail = "lead-owner@acme.com";
        const lookingForEmail = "test1@example.com";
        const contactEmail = "test2@example.com";

        const account = salesforceMock.addAccount({
          Id: "test-account-id",
          Owner: {
            Email: contactAccountOwnerEmail,
          },
          Website: "https://anything",
        });

        const contact = salesforceMock.addContact({
          // Contact doesn't have the matching email
          Email: lookingForEmail,
          FirstName: "Test",
          LastName: "User",
          AccountId: account.Id,
          Owner: {
            Email: contactOwnerEmail,
          },
        });

        const lead = salesforceMock.addLead({
          // Lead has the matching email
          Email: lookingForEmail,
          FirstName: "Test",
          LastName: "User",
          Owner: {
            Email: leadOwnerEmail,
          },
        });

        const contactsOrLeadsOrAccounts = await crmService.getContacts({
          emails: lookingForEmail,
          forRoundRobinSkip,
        });

        expect(contactsOrLeadsOrAccounts).toHaveLength(1);
        // Because we intentionally don't include owner data in this case
        expect(contactsOrLeadsOrAccounts[0].ownerEmail).toBe(undefined);
        expect(contactsOrLeadsOrAccounts[0].id).toBe(contact.Id);
        expect(contactsOrLeadsOrAccounts[0].email).toBe(lookingForEmail);
        expect(contactsOrLeadsOrAccounts[0].recordType).toBe(SalesforceRecordEnum.CONTACT);
      });
    });

    describe("createContact", () => {
      it("should create a contact under an account if the attendee has an account", async () => {
        const crmService = new SalesforceCRMService(credential, appOptions);
        const attendeeEmail = "test@booker.com";
        const account = salesforceMock.addAccount({
          Id: "test-account-id",
          Owner: {
            Email: "test@example.com",
          },
          Website: "https://booker.com",
        });

        expect(salesforceMock.getContacts()).toHaveLength(0);

        const result = await crmService.createContacts([
          {
            name: "Test User",
            email: attendeeEmail,
          },
        ]);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBeDefined();
        expect(result[0].email).toBe(attendeeEmail);

        const allContactsInSalesforce = salesforceMock.getContacts();
        expect(allContactsInSalesforce).toHaveLength(1);
        expect(allContactsInSalesforce[0].Id).toBeDefined();
        expect(allContactsInSalesforce[0].Email).toBe(attendeeEmail);
        expect(allContactsInSalesforce[0].AccountId).toBe(account.Id);

        const allLeadsInSalesforce = salesforceMock.getLeads();
        expect(allLeadsInSalesforce).toHaveLength(0);
      });

      it("should create a lead if the attendee has no account", async () => {
        const crmService = new SalesforceCRMService(credential, appOptions);
        const attendeeEmail = "test@booker.com";
        const result = await crmService.createContacts([
          {
            name: "Test User",
            email: attendeeEmail,
          },
        ]);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBeDefined();
        expect(result[0].email).toBe(attendeeEmail);

        const allLeadsInSalesforce = salesforceMock.getLeads();
        expect(allLeadsInSalesforce).toHaveLength(1);
        expect(allLeadsInSalesforce[0].Id).toBeDefined();
        expect(allLeadsInSalesforce[0].Email).toBe(attendeeEmail);

        const allContactsInSalesforce = salesforceMock.getContacts();
        expect(allContactsInSalesforce).toHaveLength(0);
      });
    });
  });
});
