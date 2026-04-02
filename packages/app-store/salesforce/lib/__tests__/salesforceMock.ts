import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { composeQuery, parseQuery } from "@jetstreamapp/soql-parser-js";
import { vi } from "vitest";

type Contact = {
  Id?: string;
  FirstName?: string;
  LastName?: string;
  Email?: string;
  AccountId?: string;
  Account?: Account;
  Owner?: {
    Email?: string;
  };
  OwnerId?: string;
};
type Lead = {
  Id?: string;
  FirstName?: string;
  LastName?: string;
  Email?: string;
  AccountId?: string;
  Account?: Account;
  Owner?: {
    Email?: string;
  };
  OwnerId?: string;
};
type Account = { Id?: string; OwnerId?: string; Owner?: { Email?: string }; Website?: string };
type User = { Id?: string; IsActive?: boolean; Email?: string };

// Salesforce mock factory
export const createSalesforceMock = () => {
  // Store for mock records
  const records = {
    contacts: [] as Contact[],
    leads: [] as Lead[],
    accounts: [] as Account[],
    users: [] as User[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    events: [] as any[],
  };

  // Query parser and responder
  const handleQuery = (rawQuery: string) => {
    const parsedQuery = parseQuery(rawQuery);
    // Validated Query
    const query = composeQuery(parsedQuery);

    // Simple SOQL parser
    console.log({ query });
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

    console.log({ whereClause });
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
            .match(/Email IN \((.+)\)/i)?.[1]
            ?.split("','")
            ?.map((e) => e.replace(/'/g, ""));
          result = result.filter((r) => emails?.includes(r.Email));
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
        }
      }

      if (whereClause.includes("Website IN")) {
        const websitesMatch = whereClause.match(/Website IN \((.+)\)/i);
        if (websitesMatch) {
          // Split by comma, trim spaces and quotes
          const websites = websitesMatch[1].split(",").map((w) => w.trim().replace(/^'|'$/g, ""));
          result = result.filter((r) => websites.includes(r.Website));
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
  const addContact = (contact: Contact) => {
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

  const addLead = (lead: Lead) => {
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
    logger.debug("[SalesforceMock] Adding lead", safeStringify(newLead));
    records.leads.push(newLead);
    return newLead;
  };

  const addAccount = (account: Account) => {
    const newAccount = {
      Id: account.Id || `001${Math.random().toString().slice(2, 10)}`,
      ...account,
      attributes: { type: "Account" },
    };
    records.accounts.push(newAccount);
    logger.debug("[SalesforceMock] Adding account", safeStringify(newAccount));
    return newAccount;
  };

  const addUser = (user: User) => {
    const newUser = {
      Id: user.Id || `005${Math.random().toString().slice(2, 10)}`,
      IsActive: user.IsActive !== undefined ? user.IsActive : true,
      attributes: { type: "User" },
      ...user,
    };
    logger.debug("[SalesforceMock] Adding user", safeStringify(newUser));
    records.users.push(newUser);
    return newUser;
  };

  // Mock connection interface
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const mockConnection = {
    query: vi.fn().mockImplementation(handleQuery),
    search: vi.fn().mockImplementation((searchQuery: string) => {
      const emailMatch = searchQuery.match(/FIND \{([^}]+)\}/i);
      if (!emailMatch) return { searchRecords: [] };

      const email = emailMatch[1];
      const searchRecords = [];

      const matchingContacts = records.contacts.filter((c) => c.Email === email);
      searchRecords.push(...matchingContacts);

      const matchingLeads = records.leads.filter((l) => l.Email === email);
      searchRecords.push(...matchingLeads);

      if (searchQuery.includes("Owner.Email")) {
        searchRecords.forEach((record) => {
          if (record.OwnerId) {
            const owner = records.users.find((u) => u.Id === record.OwnerId);
            record.Owner = {
              Email: owner ? owner.Email : undefined,
            };
          }
        });
      }

      return { searchRecords };
    }),
    sobject: vi.fn().mockReturnValue({
      create: vi.fn().mockImplementation(async (data) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const objectType = mockConnection.sobject.mock.calls[mockConnection.sobject.mock.calls.length - 1][0];
        let result;

        switch (objectType) {
          case "Contact":
            result = addContact(data);
            break;
          case "Lead":
            result = addLead(data);
            break;
          case "Account":
            result = addAccount(data);
            break;
          case "User":
            result = addUser(data);
            break;
          case "Event":
            records.events.push({ ...data, Id: `evt${Math.random().toString().slice(2, 10)}` });
            result = { Id: records.events[records.events.length - 1].Id };
            break;
          default:
            result = { Id: `gen${Math.random().toString().slice(2, 10)}` };
        }

        return {
          success: true,
          id: result.Id,
          ...result,
        };
      }),
      update: vi.fn().mockImplementation(async (data) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const objectType = mockConnection.sobject.mock.calls[mockConnection.sobject.mock.calls.length - 1][0];
        const id = data.Id;
        let record;

        switch (objectType) {
          case "Contact":
            record = records.contacts.find((r) => r.Id === id);
            if (record) Object.assign(record, data);
            break;
          case "Lead":
            record = records.leads.find((r) => r.Id === id);
            if (record) Object.assign(record, data);
            break;
          case "Account":
            record = records.accounts.find((r) => r.Id === id);
            if (record) Object.assign(record, data);
            break;
          case "User":
            record = records.users.find((r) => r.Id === id);
            if (record) Object.assign(record, data);
            break;
          case "Event":
            record = records.events.find((r) => r.Id === id);
            if (record) Object.assign(record, data);
            break;
        }

        return {
          success: !!record,
          id: record?.Id,
        };
      }),
      delete: vi.fn().mockImplementation(async () => ({ success: true })),
    }),
    describe: vi.fn().mockImplementation(() => {
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
      mockConnection.search.mockClear();
      mockConnection.sobject.mockClear();
      mockConnection.describe.mockClear();
    },
  };

  const getContacts = () => {
    return records.contacts;
  };

  const getLeads = () => {
    return records.leads;
  };

  const getAccounts = () => {
    return records.accounts;
  };

  return {
    mockConnection,
    addContact,
    getContacts,
    addLead,
    getLeads,
    addAccount,
    getAccounts,
    addUser,
    getRecords: () => records,
  };
};
