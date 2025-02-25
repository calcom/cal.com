/**
 * Purpose of these tests is to ensure that we test from CrmService and salesforce interactions perspective purely
 * It allows us to document the behaviour more from User perspective and also verify it in parallel
 *
 * It will also give us confidence to refactor as it doesn't care about internal functions.
 *
 * CrmService.test.ts could still focus on testing detailed edge cases as needed.
 */
import "../../../../tests/libs/__mocks__/prisma";

import jsforce from "@jsforce/jsforce-node";
import { describe, it, expect, vi, beforeEach } from "vitest";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import SalesforceCRMService from "./CrmService";
import { SalesforceRecordEnum } from "./enums";

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

vi.mock("@calcom/lib/freeEmailDomainCheck/checkIfFreeEmailDomain", () => ({
  checkIfFreeEmailDomain: vi.fn().mockResolvedValue(false),
}));

vi.mock("./getSalesforceAppKeys", () => ({
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
  };
};

// Salesforce mock factory
const createSalesforceMock = () => {
  // Store for mock records
  const records = {
    contacts: [] as { Id?: string; Email?: string; AccountId?: string }[],
    leads: [] as { Id?: string; Email?: string; AccountId?: string }[],
    accounts: [] as { Id?: string; OwnerId?: string; Owner?: { Email?: string }; Website?: string }[],
    users: [] as { Id?: string; IsActive?: boolean }[],
    events: [],
  };

  // Query parser and responder
  const handleQuery = (query: string) => {
    // Simple SOQL parser
    const fromMatch = query.match(/FROM\s+(\w+)/i);
    const whereMatch = query.match(/WHERE\s+(.+?)(?:\s+LIMIT|\s+ORDER|\s*$)/i);
    const limitMatch = query.match(/LIMIT\s+(\d+)/i);

    if (!fromMatch) return { records: [] };

    const objectType = fromMatch[1];
    const whereClause = whereMatch ? whereMatch[1] : null;
    const limit = limitMatch ? parseInt(limitMatch[1]) : Infinity;

    let result = [];

    switch (objectType) {
      case "Contact":
        result = records.contacts;
        break;
      case "Lead":
        result = records.leads;
        break;
      case "Account":
        result = records.accounts;
        break;
      case "User":
        result = records.users;
        break;
      case "Event":
        result = records.events;
        break;
      default:
        return { records: [] };
    }

    // Apply where clause filtering (basic implementation)
    if (whereClause) {
      if (whereClause.includes("Email =")) {
        const emailMatch = whereClause.match(/Email\s*=\s*'([^']+)'/i);
        if (emailMatch) {
          const email = emailMatch[1];
          result = result.filter((r) => r.Email === email);
        }
      }

      if (whereClause.includes("Email IN")) {
        const emailsMatch = whereClause.match(/Email IN \('([^']+)(?:','([^']+))*'\)/i);
        if (emailsMatch) {
          const emails = whereClause
            .match(/Email IN \((.+)\)/i)[1]
            .split("','")
            .map((e) => e.replace(/'/g, ""));
          result = result.filter((r) => emails.includes(r.Email));
        }
      }

      if (whereClause.includes("Email LIKE")) {
        const emailLikeMatch = whereClause.match(/Email LIKE '%@([^']+)'/i);
        if (emailLikeMatch) {
          const domain = emailLikeMatch[1];
          result = result.filter((r) => r.Email && r.Email.endsWith(`@${domain}`));
        }
      }

      if (whereClause.includes("Id =")) {
        const idMatch = whereClause.match(/Id\s*=\s*'([^']+)'/i);
        if (idMatch) {
          const id = idMatch[1];
          result = result.filter((r) => r.Id === id);
        }
      }

      if (whereClause.includes("AccountId =")) {
        const accountIdMatch = whereClause.match(/AccountId\s*=\s*'([^']+)'/i);
        if (accountIdMatch) {
          const accountId = accountIdMatch[1];
          result = result.filter((r) => r.AccountId === accountId);
        }
      }

      if (whereClause.includes("AccountId != null")) {
        result = result.filter((r) => r.AccountId);
      }

      if (whereClause.includes("Website LIKE")) {
        const websiteLikeMatch = whereClause.match(/Website LIKE '%([^']+)%'/i);
        if (websiteLikeMatch) {
          const websitePart = websiteLikeMatch[1];
          result = result.filter((r) => r.Website && r.Website.includes(websitePart));
          console.log("websiteLikeMatch", result);
        }
      }

      if (whereClause.includes("IsActive = true")) {
        result = result.filter((r) => r.IsActive === true);
      }
    }

    // Apply limit
    result = result.slice(0, limit);

    // Handle special cases with nested property selection
    if (query.includes("Account.Owner.Email")) {
      result = result.map((r) => {
        if (r.AccountId) {
          const account = records.accounts.find((a) => a.Id === r.AccountId);
          if (account && account.OwnerId) {
            const owner = records.users.find((u) => u.Id === account.OwnerId);
            r.Account = {
              Owner: {
                Email: owner ? owner.Email : null,
              },
              OwnerId: account.OwnerId,
            };
          }
        }
        return r;
      });
    }

    if (query.includes("Owner.Email")) {
      result = result.map((r) => {
        if (r.OwnerId) {
          const owner = records.users.find((u) => u.Id === r.OwnerId);
          r.Owner = {
            Email: owner ? owner.Email : null,
          };
        }
        return r;
      });
    }

    return { records: result };
  };

  const getAccountById = (id: string) => {
    return records.accounts.find((a) => a.Id === id);
  };

  // Add record helpers
  const addContact = (contact) => {
    const newContact = {
      Id: contact.Id || `003${Math.random().toString().slice(2, 10)}`,
      attributes: { type: "Contact" },
      ...contact,
    };

    if (newContact.AccountId) {
      const account = getAccountById(newContact.AccountId);
      if (account) {
        newContact.Account = {
          ...account,
        };
      } else {
        throw new Error(`Account with id ${newContact.AccountId} not found`);
      }
    }

    logger.debug("[SalesforceMock]Adding contact", safeStringify(newContact));
    records.contacts.push(newContact);
    return newContact;
  };

  const addLead = (lead) => {
    const newLead = {
      Id: lead.Id || `00Q${Math.random().toString().slice(2, 10)}`,
      attributes: { type: "Lead" },
      ...lead,
    };
    if (newLead.AccountId) {
      const account = getAccountById(newLead.AccountId);
      if (account) {
        newLead.Account = {
          ...account,
        };
      } else {
        throw new Error(`Account with id ${newLead.AccountId} not found`);
      }
    }
    records.leads.push(newLead);
    return newLead;
  };

  const addAccount = (account: {
    Id?: string;
    OwnerId?: string;
    Owner?: { Email?: string };
    Website?: string;
  }) => {
    const newAccount = {
      Id: account.Id || `001${Math.random().toString().slice(2, 10)}`,
      ...account,
      attributes: { type: "Account" },
    };
    records.accounts.push(newAccount);
    return newAccount;
  };

  const addUser = (user) => {
    const newUser = {
      Id: user.Id || `005${Math.random().toString().slice(2, 10)}`,
      IsActive: user.IsActive !== undefined ? user.IsActive : true,
      attributes: { type: "User" },
      ...user,
    };
    records.users.push(newUser);
    return newUser;
  };

  // Mock connection interface
  const mockConnection = {
    query: vi.fn().mockImplementation(handleQuery),
    sobject: vi.fn().mockReturnValue({
      create: vi.fn().mockImplementation((data) => ({ success: true, id: `id_${Math.random()}` })),
      update: vi.fn().mockImplementation(() => ({ success: true })),
      delete: vi.fn().mockImplementation(() => ({ success: true })),
    }),
    describe: vi.fn().mockImplementation((objectName) => {
      return {
        fields: [
          { name: "Id", type: "id" },
          { name: "Email", type: "email" },
          { name: "FirstName", type: "string" },
          { name: "LastName", type: "string" },
          { name: "Company", type: "string" },
          { name: "Website", type: "url" },
          { name: "OwnerId", type: "reference" },
          { name: "NoShow__c", type: "boolean", length: 0 },
          { name: "LastMeetingDate__c", type: "date" },
        ],
      };
    }),
    clear: () => {
      records.contacts = [];
      records.leads = [];
      records.accounts = [];
      records.users = [];
      records.events = [];
      mockConnection.query.mockClear();
      mockConnection.sobject.mockClear();
      mockConnection.describe.mockClear();
    },
  };

  return {
    mockConnection,
    addContact,
    addLead,
    addAccount,
    addUser,
    getRecords: () => records,
  };
};

const salesforceSettingScenario = {
  createOnLeadAndSearchOnAccount: () => {
    return {
      appOptions: {
        createEventOn: SalesforceRecordEnum.LEAD,
        createEventOnLeadCheckForContact: true,
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
    // @ts-expect-error - Not full implementation of jsforce.Connection
    vi.mocked(jsforce.Connection).mockImplementation(() => ({
      ...salesforceMock.mockConnection,
      version: "1.0",
      loginUrl: "https://test.salesforce.com",
      instanceUrl: "https://test.salesforce.com",
      accessToken: "123",
    }));
  });

  describe("createOnLeadAndSearchOnAccount", () => {
    describe("getContacts: forRoundRobinSkip", () => {
      it("(Lookup-1) should return contact's account owner's email as ownerEmail if the contact is found directly by email", async () => {
        const { appOptions, credential } = salesforceSettingScenario.createOnLeadAndSearchOnAccount();
        const crmService = new SalesforceCRMService(credential, appOptions);
        const contactAccountOwnerEmail = "contact-account-owner@acme.com";
        const contactOwnerEmail = "contact-owner@acme.com";
        const lookingForEmail = "test@example.com";

        const account = salesforceMock.addAccount({
          Id: "test-account-id",
          Owner: {
            Email: contactAccountOwnerEmail,
          },
          Website: "https://anything",
        });

        salesforceMock.addContact({
          Email: lookingForEmail,
          FirstName: "Test",
          LastName: "User",
          AccountId: account.Id,
          Owner: {
            Email: contactOwnerEmail,
          },
        });

        const contacts = await crmService.getContacts({
          emails: lookingForEmail,
          forRoundRobinSkip: true,
        });

        expect(contacts).toHaveLength(1);
        expect(contacts[0].ownerEmail).toBe(contactAccountOwnerEmail);
        expect(contacts[0].recordType).toBe(SalesforceRecordEnum.ACCOUNT);
      });

      it("(Lookup-2) should fallback to account(and use the account owner email as ownerEmail) matched by emailDomain if the contact is not found(i.e Lookup-1 fails)", async () => {
        const { appOptions, credential } = salesforceSettingScenario.createOnLeadAndSearchOnAccount();
        const crmService = new SalesforceCRMService(credential, appOptions);
        const contactAccountOwnerEmail = "contact-account-owner@example.com";
        const emailDomain = "example.com";
        const lookingForEmail = `test@${emailDomain}`;
        salesforceMock.addAccount({
          Id: "test-account-id",
          Owner: {
            Email: contactAccountOwnerEmail,
          },
          Website: `https://${emailDomain}`,
        });

        const contacts = await crmService.getContacts({
          emails: lookingForEmail,
          forRoundRobinSkip: true,
        });

        expect(contacts).toHaveLength(1);
        expect(contacts[0].ownerEmail).toBe(contactAccountOwnerEmail);
        expect(contacts[0].recordType).toBe(SalesforceRecordEnum.ACCOUNT);
      });

      it("(Lookup-3) should fallback to account having most number of contacts matched by emailDomain when Lookup-1 and Lookup-2 fails", async () => {
        const { appOptions, credential } = salesforceSettingScenario.createOnLeadAndSearchOnAccount();
        const crmService = new SalesforceCRMService(credential, appOptions);
        const account1OwnerEmail = "contact-account-owner1@example.com";
        const account2OwnerEmail = "contact-account-owner2@example.com";
        const emailDomain = "example.com";
        const lookingForEmail = `test@${emailDomain}`;
        const account1 = salesforceMock.addAccount({
          Id: "test-account-id1",
          Owner: {
            Email: account1OwnerEmail,
          },
          Website: `https://anything`,
        });

        const dominatingAccount = salesforceMock.addAccount({
          Id: "test-account-id2",
          Owner: {
            Email: account2OwnerEmail,
          },
          Website: `https://anything`,
        });

        salesforceMock.addContact({
          Email: `some-other-contact_acc2_1@${emailDomain}`,
          FirstName: "Test",
          LastName: "User",
          AccountId: dominatingAccount.Id,
        });

        salesforceMock.addContact({
          Email: `some-other-contact_acc2_2@${emailDomain}`,
          FirstName: "Test",
          LastName: "User",
          AccountId: dominatingAccount.Id,
        });

        salesforceMock.addContact({
          Email: `some-other-contact_acc1_1@${emailDomain}`,
          FirstName: "Test",
          LastName: "User",
          AccountId: account1.Id,
        });

        const contacts = await crmService.getContacts({
          emails: lookingForEmail,
          forRoundRobinSkip: true,
        });

        expect(contacts).toHaveLength(1);
        expect(contacts[0].ownerEmail).toBe(account2OwnerEmail);
        expect(contacts[0].recordType).toBe(SalesforceRecordEnum.ACCOUNT);
      });
    });
  });
});
