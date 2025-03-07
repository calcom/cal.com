import { vi } from "vitest";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

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
  const mockConnection = {
    query: vi.fn().mockImplementation(handleQuery),
    sobject: vi.fn().mockReturnValue({
      create: vi.fn().mockImplementation(() => ({ success: true, id: `id_${Math.random()}` })),
      update: vi.fn().mockImplementation(() => ({ success: true })),
      delete: vi.fn().mockImplementation(() => ({ success: true })),
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
