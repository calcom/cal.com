import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";
import type { CredentialPayload } from "@calcom/types/Credential";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import type { appDataSchema } from "../zod";
import type { SalesforceCRM } from "./CrmService";
import { createSalesforceCrmServiceWithSalesforceType } from "./CrmService";
import { SalesforceRecordEnum } from "./enums";

type AppOptions = z.infer<typeof appDataSchema>;

const contactQueryResponse = {
  records: [
    {
      Id: "001",
      Email: "test@example.com",
      OwnerId: "owner001",
      attributes: { type: "Contact" },
      Owner: {
        Email: "owner@example.com",
      },
    },
  ],
};

const contactUnderAccountQueryResponse = {
  records: [
    {
      Id: "001",
      Email: "test@example.com",
      OwnerId: "owner001",
      AccountId: "acc001",
      attributes: { type: "Contact" },
      Account: {
        attributes: { type: "Account" },
        Owner: {
          Email: "owner@example.com",
        },
      },
    },
  ],
};

const leadQueryResponse = {
  records: [
    {
      Id: "001",
      Email: "test@example.com",
      OwnerId: "owner001",
      attributes: { type: "Lead" },
      Owner: {
        Email: "owner@example.com",
      },
    },
  ],
};

const _ownerQueryResponse = {
  records: [
    {
      Id: "owner001",
      Email: "owner@example.com",
      Name: "Test Owner",
    },
  ],
};

const accountQueryResponse = {
  records: [
    {
      Id: "acc001",
      OwnerId: "owner001",
      Email: "test@example.com",
      attributes: { type: "Account" },
    },
  ],
};

const mockSalesforceGraphQLClientQuery = vi.fn();

vi.mock("./graphql/SalesforceGraphQLClient", () => ({
  SalesforceGraphQLClient: class {
    GetAccountRecordsForRRSkip = mockSalesforceGraphQLClientQuery;
  },
}));

describe("SalesforceCRMService", () => {
  let service: SalesforceCRM;
  let mockConnection: {
    query: ReturnType<typeof vi.fn>;
    sobject: ReturnType<typeof vi.fn>;
    search: ReturnType<typeof vi.fn>;
  };

  setupAndTeardown();

  beforeEach(() => {
    mockConnection = {
      query: vi.fn(),
      sobject: vi.fn(),
      search: vi.fn(),
    };

    const mockCredential: CredentialPayload = {
      id: 1,
      type: "salesforce_crm",
      key: {
        access_token: "mock_token",
        refresh_token: "mock_refresh",
        instance_url: "https://mock.salesforce.com",
      },
      userId: 1,
      appId: "salesforce",
      teamId: null,
      invalid: false,
      user: {
        email: "test-user@example.com",
      },
      delegationCredentialId: null,
      encryptedKey: null,
    };

    service = createSalesforceCrmServiceWithSalesforceType(mockCredential, {}, true);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error - accessing private property for testing
    service.conn = Promise.resolve(mockConnection);
  });

  const mockAppOptions = (appOptions: AppOptions) => {
    const appOptionsSpy = vi.spyOn(service, "getAppOptions");
    appOptionsSpy.mockReturnValue(appOptions);
  };

  describe("getContacts", () => {
    it("should return empty array when no records found", async () => {
      // Setup mock response
      mockConnection.query.mockResolvedValueOnce({ records: [] });

      const result = await service.getContacts({ emails: "test@example.com" });

      expect(result).toEqual([]);
      expect(mockConnection.query).toHaveBeenCalledWith(
        "SELECT Id, Email, OwnerId, Owner.Email FROM Contact WHERE Email IN ('test@example.com')"
      );
    });

    it("should handle single email string input", async () => {
      // Setup mock response with descriptive name
      const contactQueryResponse = {
        records: [
          {
            Id: "001",
            Email: "test@example.com",
            OwnerId: "owner001",
            attributes: { type: "Contact" },
          },
        ],
      };

      // Setup query spy
      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce(contactQueryResponse);

      const result = await service.getContacts({ emails: "test@example.com" });

      expect(result).toEqual([
        {
          id: "001",
          email: "test@example.com",
          recordType: "Contact",
        },
      ]);

      // Verify the exact query made
      expect(querySpy).toHaveBeenCalledWith(
        "SELECT Id, Email, OwnerId, Owner.Email FROM Contact WHERE Email IN ('test@example.com')"
      );
    });

    it("should handle array of emails input", async () => {
      const contactsQueryResponse = {
        records: [
          {
            Id: "001",
            Email: "test1@example.com",
            OwnerId: "owner001",
            attributes: { type: "Contact" },
          },
          {
            Id: "002",
            Email: "test2@example.com",
            OwnerId: "owner002",
            attributes: { type: "Contact" },
          },
        ],
      };

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce(contactsQueryResponse);

      const result = await service.getContacts({
        emails: ["test1@example.com", "test2@example.com"],
      });

      expect(result).toEqual([
        {
          id: "001",
          email: "test1@example.com",
          recordType: "Contact",
        },
        {
          id: "002",
          email: "test2@example.com",
          recordType: "Contact",
        },
      ]);

      expect(querySpy).toHaveBeenCalledWith(
        "SELECT Id, Email, OwnerId, Owner.Email FROM Contact WHERE Email IN ('test1@example.com','test2@example.com')"
      );
    });

    it("should return contacts when includeOwner is true but no owner is found", async () => {
      mockAppOptions({
        roundRobinSkipCheckRecordOn: SalesforceRecordEnum.CONTACT,
        createEventOn: SalesforceRecordEnum.CONTACT,
      });

      const contactQueryResponse = {
        records: [
          {
            Id: "001",
            Email: "test@example.com",
            // OwnerId: "owner001",
            attributes: { type: "Contact" },
            Owner: {
              Email: "owner@example.com",
            },
          },
        ],
      };

      // Setup query spy with specific responses
      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce(contactQueryResponse); // Contact query

      const result = await service.getContacts({
        emails: "test@example.com",
        includeOwner: true,
      });

      expect(result).toEqual([
        {
          id: "001",
          email: "test@example.com",
          ownerId: undefined,
          ownerEmail: "owner@example.com",
          recordType: "Contact",
        },
      ]);

      expect(querySpy).toHaveBeenNthCalledWith(
        1,
        "SELECT Id, Email, OwnerId, Owner.Email FROM Contact WHERE Email IN ('test@example.com')"
      );
    });

    describe("no additional params are passed", () => {
      it("when createEventOn is contact", async () => {
        mockAppOptions({
          createEventOn: SalesforceRecordEnum.CONTACT,
        });

        const querySpy = vi.spyOn(mockConnection, "query");
        querySpy.mockResolvedValueOnce(contactQueryResponse);

        const result = await service.getContacts({
          emails: "test@example.com",
        });

        expect(result).toEqual([
          {
            id: "001",
            email: "test@example.com",
            recordType: "Contact",
          },
        ]);

        expect(querySpy).toHaveBeenNthCalledWith(
          1,
          "SELECT Id, Email, OwnerId, Owner.Email FROM Contact WHERE Email IN ('test@example.com')"
        );
      });
      it("when createEventOn is lead", async () => {
        mockAppOptions({
          createEventOn: SalesforceRecordEnum.LEAD,
        });

        const querySpy = vi.spyOn(mockConnection, "query");
        querySpy.mockResolvedValueOnce(leadQueryResponse);

        const result = await service.getContacts({
          emails: "test@example.com",
        });

        expect(result).toEqual([
          {
            id: "001",
            email: "test@example.com",
            recordType: "Lead",
          },
        ]);

        expect(querySpy).toHaveBeenNthCalledWith(
          1,
          "SELECT Id, Email, OwnerId, Owner.Email FROM Lead WHERE Email IN ('test@example.com')"
        );
      });
      it("when createEventOn is contact under an account", async () => {
        mockAppOptions({
          createEventOn: SalesforceRecordEnum.ACCOUNT,
        });

        const querySpy = vi.spyOn(mockConnection, "query");
        querySpy.mockResolvedValueOnce(contactUnderAccountQueryResponse);

        const result = await service.getContacts({
          emails: "test@example.com",
        });

        expect(result).toEqual([
          {
            id: "001",
            email: "test@example.com",
            recordType: "Contact",
          },
        ]);

        expect(querySpy).toHaveBeenNthCalledWith(
          1,
          "SELECT Id, Email, OwnerId, AccountId, Account.OwnerId, Account.Owner.Email, Account.Website FROM Contact WHERE Email = 'test@example.com' AND AccountId != null"
        );
      });
    });

    describe("includeOwner param is passed", () => {
      it("when createEventOn is contact", async () => {
        mockAppOptions({
          createEventOn: SalesforceRecordEnum.CONTACT,
        });

        // Setup query spy with specific responses
        const querySpy = vi.spyOn(mockConnection, "query");
        querySpy.mockResolvedValueOnce(contactQueryResponse); // Contact query

        const result = await service.getContacts({
          emails: "test@example.com",
          includeOwner: true,
        });

        expect(result).toEqual([
          {
            id: "001",
            email: "test@example.com",
            ownerId: "owner001",
            ownerEmail: "owner@example.com",
            recordType: "Contact",
          },
        ]);

        expect(querySpy).toHaveBeenNthCalledWith(
          1,
          "SELECT Id, Email, OwnerId, Owner.Email FROM Contact WHERE Email IN ('test@example.com')"
        );
      });
      it("when createEventOn is lead", async () => {
        mockAppOptions({
          createEventOn: SalesforceRecordEnum.LEAD,
        });

        // Setup query spy with specific responses
        const querySpy = vi.spyOn(mockConnection, "query");
        querySpy.mockResolvedValueOnce(leadQueryResponse);

        const result = await service.getContacts({
          emails: "test@example.com",
          includeOwner: true,
        });

        expect(result).toEqual([
          {
            id: "001",
            email: "test@example.com",
            ownerId: "owner001",
            ownerEmail: "owner@example.com",
            recordType: "Lead",
          },
        ]);

        expect(querySpy).toHaveBeenNthCalledWith(
          1,
          "SELECT Id, Email, OwnerId, Owner.Email FROM Lead WHERE Email IN ('test@example.com')"
        );
      });
      it("when createEventOn is contact under an account", async () => {
        mockAppOptions({
          createEventOn: SalesforceRecordEnum.ACCOUNT,
        });

        // Setup query spy with specific responses
        const querySpy = vi.spyOn(mockConnection, "query");
        querySpy.mockResolvedValueOnce(contactUnderAccountQueryResponse);

        const result = await service.getContacts({
          emails: "test@example.com",
          includeOwner: true,
        });

        expect(result).toEqual([
          {
            id: "001",
            email: "test@example.com",
            ownerId: "owner001",
            ownerEmail: "owner@example.com",
            recordType: "Contact",
          },
        ]);

        expect(querySpy).toHaveBeenNthCalledWith(
          1,
          "SELECT Id, Email, OwnerId, AccountId, Account.OwnerId, Account.Owner.Email, Account.Website FROM Contact WHERE Email = 'test@example.com' AND AccountId != null"
        );
      });
    });

    describe("forRoundRobinSkip param is passed", () => {
      it("checking against contacts", async () => {
        mockAppOptions({
          roundRobinSkipCheckRecordOn: SalesforceRecordEnum.CONTACT,
          createEventOn: SalesforceRecordEnum.CONTACT,
        });

        // Setup query spy with specific responses
        const querySpy = vi.spyOn(mockConnection, "query");
        querySpy.mockResolvedValueOnce(contactQueryResponse); // Contact query

        const result = await service.getContacts({
          emails: "test@example.com",
          forRoundRobinSkip: true,
        });

        expect(result).toEqual([
          {
            id: "001",
            email: "test@example.com",
            ownerId: "owner001",
            ownerEmail: "owner@example.com",
            recordType: "Contact",
          },
        ]);

        expect(querySpy).toHaveBeenNthCalledWith(
          1,
          "SELECT Id, Email, OwnerId, Owner.Email FROM Contact WHERE Email IN ('test@example.com')"
        );
      });
      it("checking against leads", async () => {
        mockAppOptions({
          roundRobinSkipCheckRecordOn: SalesforceRecordEnum.LEAD,
        });

        // Setup query spy with specific responses
        const querySpy = vi.spyOn(mockConnection, "query");
        querySpy.mockResolvedValueOnce(leadQueryResponse);

        const result = await service.getContacts({
          emails: "test@example.com",
          forRoundRobinSkip: true,
        });

        expect(result).toEqual([
          {
            id: "001",
            email: "test@example.com",
            ownerId: "owner001",
            ownerEmail: "owner@example.com",
            recordType: "Lead",
          },
        ]);

        expect(querySpy).toHaveBeenNthCalledWith(
          1,
          "SELECT Id, Email, OwnerId, Owner.Email FROM Lead WHERE Email IN ('test@example.com')"
        );
      });
      it("checking against contacts under an account", async () => {
        mockAppOptions({
          roundRobinSkipCheckRecordOn: SalesforceRecordEnum.ACCOUNT,
        });

        mockSalesforceGraphQLClientQuery.mockResolvedValueOnce([
          {
            id: "acc001",
            email: "test@example.com",
            ownerId: "owner001",
            ownerEmail: "owner@example.com",
            recordType: SalesforceRecordEnum.ACCOUNT,
          },
        ]);

        const result = await service.getContacts({
          emails: "test@example.com",
          forRoundRobinSkip: true,
        });

        expect(result).toEqual([
          {
            id: "acc001",
            email: "test@example.com",
            ownerId: "owner001",
            ownerEmail: "owner@example.com",
            recordType: "Account",
          },
        ]);
      });
    });
  });

  describe("getContactOrLeadFromEmail via getContacts", () => {
    describe("with roundRobinSkipFallbackToLeadOwner enabled", () => {
      it("should return contact when contact is found", async () => {
        mockAppOptions({
          createEventOn: SalesforceRecordEnum.CONTACT,
          roundRobinSkipCheckRecordOn: SalesforceRecordEnum.CONTACT,
          roundRobinSkipFallbackToLeadOwner: true,
        });

        const searchSpy = vi.spyOn(mockConnection, "search");
        searchSpy.mockResolvedValueOnce({
          searchRecords: [
            {
              Id: "contact001",
              Email: "test@example.com",
              OwnerId: "owner001",
              attributes: { type: "Contact" },
              Owner: { Email: "owner@example.com" },
            },
          ],
        });

        const result = await service.getContacts({
          emails: "test@example.com",
          forRoundRobinSkip: true,
        });

        expect(result).toEqual([
          {
            id: "contact001",
            email: "test@example.com",
            ownerId: "owner001",
            ownerEmail: "owner@example.com",
            recordType: "Contact",
          },
        ]);

        expect(searchSpy).toHaveBeenCalledWith(
          "FIND {test@example.com} IN EMAIL FIELDS RETURNING Lead(Id, Email, OwnerId, Owner.Email), Contact(Id, Email, OwnerId, Owner.Email)"
        );
      });

      it("should return lead when no contact exists but lead is found", async () => {
        mockAppOptions({
          createEventOn: SalesforceRecordEnum.CONTACT,
          roundRobinSkipCheckRecordOn: SalesforceRecordEnum.CONTACT,
          roundRobinSkipFallbackToLeadOwner: true,
        });

        const searchSpy = vi.spyOn(mockConnection, "search");
        searchSpy.mockResolvedValueOnce({
          searchRecords: [
            {
              Id: "lead001",
              Email: "test@example.com",
              OwnerId: "owner001",
              attributes: { type: "Lead" },
              Owner: { Email: "owner@example.com" },
            },
          ],
        });

        const result = await service.getContacts({
          emails: "test@example.com",
          forRoundRobinSkip: true,
        });

        expect(result).toEqual([
          {
            id: "lead001",
            email: "test@example.com",
            ownerId: "owner001",
            ownerEmail: "owner@example.com",
            recordType: "Lead",
          },
        ]);

        expect(searchSpy).toHaveBeenCalled();
      });

      it("should prefer contact over lead when both exist", async () => {
        mockAppOptions({
          createEventOn: SalesforceRecordEnum.CONTACT,
          roundRobinSkipCheckRecordOn: SalesforceRecordEnum.CONTACT,
          roundRobinSkipFallbackToLeadOwner: true,
        });

        const searchSpy = vi.spyOn(mockConnection, "search");
        searchSpy.mockResolvedValueOnce({
          searchRecords: [
            {
              Id: "lead001",
              Email: "test@example.com",
              OwnerId: "owner002",
              attributes: { type: "Lead" },
              Owner: { Email: "lead-owner@example.com" },
            },
            {
              Id: "contact001",
              Email: "test@example.com",
              OwnerId: "owner001",
              attributes: { type: "Contact" },
              Owner: { Email: "contact-owner@example.com" },
            },
          ],
        });

        const result = await service.getContacts({
          emails: "test@example.com",
          forRoundRobinSkip: true,
        });

        expect(result).toEqual([
          {
            id: "contact001",
            email: "test@example.com",
            ownerId: "owner001",
            ownerEmail: "contact-owner@example.com",
            recordType: "Contact",
          },
        ]);

        expect(searchSpy).toHaveBeenCalled();
      });

      it("should return empty array when no records found", async () => {
        mockAppOptions({
          createEventOn: SalesforceRecordEnum.CONTACT,
          roundRobinSkipCheckRecordOn: SalesforceRecordEnum.CONTACT,
          roundRobinSkipFallbackToLeadOwner: true,
        });

        const searchSpy = vi.spyOn(mockConnection, "search");
        searchSpy.mockResolvedValueOnce({
          searchRecords: [],
        });

        const result = await service.getContacts({
          emails: "test@example.com",
          forRoundRobinSkip: true,
        });

        expect(result).toEqual([]);
        expect(searchSpy).toHaveBeenCalled();
      });
    });

    describe("with createEventOnLeadCheckForContact enabled", () => {
      it("should find and return contact when it exists", async () => {
        mockAppOptions({
          createEventOn: SalesforceRecordEnum.LEAD,
          createEventOnLeadCheckForContact: true,
        });

        const searchSpy = vi.spyOn(mockConnection, "search");
        searchSpy.mockResolvedValueOnce({
          searchRecords: [
            {
              Id: "contact001",
              Email: "test@example.com",
              OwnerId: "owner001",
              attributes: { type: "Contact" },
              Owner: { Email: "owner@example.com" },
            },
          ],
        });

        const result = await service.getContacts({
          emails: "test@example.com",
        });

        expect(result).toEqual([
          {
            id: "contact001",
            email: "test@example.com",
            recordType: "Contact",
          },
        ]);

        expect(searchSpy).toHaveBeenCalled();
      });

      it("should fallback to lead when contact not found", async () => {
        mockAppOptions({
          createEventOn: SalesforceRecordEnum.LEAD,
          createEventOnLeadCheckForContact: true,
        });

        const searchSpy = vi.spyOn(mockConnection, "search");
        searchSpy.mockResolvedValueOnce({
          searchRecords: [
            {
              Id: "lead001",
              Email: "test@example.com",
              OwnerId: "owner001",
              attributes: { type: "Lead" },
              Owner: { Email: "owner@example.com" },
            },
          ],
        });

        const result = await service.getContacts({
          emails: "test@example.com",
        });

        expect(result).toEqual([
          {
            id: "lead001",
            email: "test@example.com",
            recordType: "Lead",
          },
        ]);

        expect(searchSpy).toHaveBeenCalled();
      });
    });
  });

  describe("createContacts", () => {
    describe("createEventOn lead", () => {
      describe("createNewContactUnderAccount enabled", () => {
        it("when attendee has an account", async () => {
          mockAppOptions({
            createNewContactUnderAccount: true,
            createEventOn: SalesforceRecordEnum.LEAD,
          });

          const querySpy = vi.spyOn(mockConnection, "query");
          querySpy.mockResolvedValueOnce(accountQueryResponse);
          querySpy.mockResolvedValueOnce({ records: [] });

          mockConnection.sobject.mockReturnValue({
            create: vi.fn().mockResolvedValue({
              success: true,
              id: "newContactId",
              name: "New Contact",
              email: "test@example.com",
            }),
          });

          const result = await service.createContacts([{ name: "New Contact", email: "test@example.com" }]);
          expect(result).toEqual([{ id: "newContactId", email: "test@example.com" }]);
        });
        it("matches account via normalized fallback when email domain has uppercase", async () => {
          mockAppOptions({
            createNewContactUnderAccount: true,
            createEventOn: SalesforceRecordEnum.LEAD,
          });

          const querySpy = vi.spyOn(mockConnection, "query");
          querySpy.mockResolvedValueOnce({ records: [] }); // Website IN (...) exact match — misses
          querySpy.mockResolvedValueOnce({
            records: [{ Id: "acc-upper", Website: "https://www.acme.com/about" }],
          }); // Website LIKE — broad match returned, normalizes to acme.com
          querySpy.mockResolvedValueOnce({ records: [] }); // Contact lookup under account

          mockConnection.sobject.mockReturnValue({
            create: vi.fn().mockResolvedValue({
              success: true,
              id: "newContactId",
              name: "New Contact",
              email: "test@ACME.COM",
            }),
          });

          const result = await service.createContacts([{ name: "New Contact", email: "test@ACME.COM" }]);
          expect(result).toEqual([{ id: "newContactId", email: "test@ACME.COM" }]);
          expect(querySpy).toHaveBeenCalledTimes(3);
        });
        it("falls through to contact lookup when LIKE returns candidates but none normalize to target domain", async () => {
          mockAppOptions({
            createNewContactUnderAccount: true,
            createEventOn: SalesforceRecordEnum.LEAD,
          });

          const querySpy = vi.spyOn(mockConnection, "query");
          querySpy.mockResolvedValueOnce({ records: [] }); // Website IN (...) exact match — misses
          querySpy.mockResolvedValueOnce({
            // Website LIKE '%acme.com%' returns false hits that don't normalize to acme.com
            records: [
              { Id: "acc-false-1", Website: "https://notacme.com" },
              { Id: "acc-false-2", Website: "https://acme.company.org" },
            ],
          });
          querySpy.mockResolvedValueOnce({
            // Contact Email LIKE domain — finds contacts under an account
            records: [
              { Id: "contact-1", Email: "jane@acme.com", AccountId: "acc-from-contacts" },
              { Id: "contact-2", Email: "bob@acme.com", AccountId: "acc-from-contacts" },
            ],
          });
          querySpy.mockResolvedValueOnce({ records: [] }); // createNewContactUnderAnAccount: existing contact check

          mockConnection.sobject.mockReturnValue({
            create: vi.fn().mockResolvedValue({
              success: true,
              id: "newContactId",
              name: "New Contact",
              email: "test@acme.com",
            }),
          });

          const result = await service.createContacts([{ name: "New Contact", email: "test@acme.com" }]);
          expect(result).toEqual([{ id: "newContactId", email: "test@acme.com" }]);
          // 4 queries: exact IN, LIKE fallback, contact domain lookup, existing contact check
          expect(querySpy).toHaveBeenCalledTimes(4);
        });

        it("handles null Website values in LIKE results gracefully", async () => {
          mockAppOptions({
            createNewContactUnderAccount: true,
            createEventOn: SalesforceRecordEnum.LEAD,
          });

          const querySpy = vi.spyOn(mockConnection, "query");
          querySpy.mockResolvedValueOnce({ records: [] }); // Website IN (...) exact match — misses
          querySpy.mockResolvedValueOnce({
            // LIKE returns a record with null Website (edge case from Salesforce)
            records: [
              { Id: "acc-null", Website: null },
              { Id: "acc-valid", Website: "https://www.acme.com/about" },
            ],
          });
          querySpy.mockResolvedValueOnce({ records: [] }); // Contact lookup under account

          mockConnection.sobject.mockReturnValue({
            create: vi.fn().mockResolvedValue({
              success: true,
              id: "newContactId",
              name: "New Contact",
              email: "test@acme.com",
            }),
          });

          const result = await service.createContacts([{ name: "New Contact", email: "test@acme.com" }]);
          expect(result).toEqual([{ id: "newContactId", email: "test@acme.com" }]);
          expect(querySpy).toHaveBeenCalledTimes(3);
        });

        it("tries exact match first, then normalized fallback, then contact lookup (3-step order)", async () => {
          mockAppOptions({
            createNewContactUnderAccount: true,
            createEventOn: SalesforceRecordEnum.LEAD,
          });

          const querySpy = vi.spyOn(mockConnection, "query");
          querySpy.mockResolvedValueOnce({ records: [] }); // Step 1: Website IN (...) — misses
          querySpy.mockResolvedValueOnce({ records: [] }); // Step 2: Website LIKE — misses
          querySpy.mockResolvedValueOnce({ records: [] }); // Step 3: Contact Email LIKE — misses

          mockConnection.sobject.mockReturnValue({
            create: vi.fn().mockResolvedValue({
              success: true,
              id: "newLeadId",
              name: "New Lead",
              email: "test@newlead.com",
            }),
          });

          const result = await service.createContacts([{ name: "New Lead", email: "test@newlead.com" }]);
          expect(result).toEqual([{ id: "newLeadId", email: "test@newlead.com" }]);

          // Verify all 3 queries were issued in the correct order
          expect(querySpy).toHaveBeenCalledTimes(3);

          const calls = querySpy.mock.calls;
          // Step 1: exact IN (...)
          expect(calls[0][0]).toContain("Website IN (");
          // Step 2: normalized LIKE fallback
          expect(calls[1][0]).toContain("Website LIKE");
          // Step 3: contact domain lookup
          expect(calls[2][0]).toContain("Email LIKE");
        });

        it("attendee has no account", async () => {
          mockAppOptions({
            createNewContactUnderAccount: true,
            createEventOn: SalesforceRecordEnum.LEAD,
          });

          const querySpy = vi.spyOn(mockConnection, "query");
          querySpy.mockResolvedValueOnce({ records: [] }); // Website IN (...) exact match
          querySpy.mockResolvedValueOnce({ records: [] }); // Website LIKE normalized fallback
          querySpy.mockResolvedValueOnce({ records: [] }); // Contact Email LIKE domain

          mockConnection.sobject.mockReturnValue({
            create: vi.fn().mockResolvedValue({
              success: true,
              id: "newLeadId",
              name: "New Lead",
              email: "test@newlead.com",
            }),
          });

          const result = await service.createContacts([{ name: "New Lead", email: "test@newlead.com" }]);
          expect(result).toEqual([{ id: "newLeadId", email: "test@newlead.com" }]);
        });
      });
    });
  });

  describe("getAllPossibleAccountWebsiteFromEmailDomain", () => {
    it("should return all possible account websites from email domain", () => {
      const result = service.getAllPossibleAccountWebsiteFromEmailDomain("example.com");
      expect(result).toEqual(
        "'example.com', 'www.example.com', 'http://www.example.com', 'http://example.com', 'https://www.example.com', 'https://example.com'"
      );
    });
  });

  describe("getContacts with rrSkipFieldRules", () => {
    const mockDescribeResponse = {
      fields: [
        { name: "Industry", type: "string" },
        { name: "Type", type: "string" },
        { name: "Status", type: "string" },
      ],
    };

    it("should filter out records matching ignore rule", async () => {
      mockAppOptions({
        roundRobinSkipCheckRecordOn: SalesforceRecordEnum.CONTACT,
        createEventOn: SalesforceRecordEnum.CONTACT,
        rrSkipFieldRules: [{ field: "Industry", value: "Technology", action: "ignore" }],
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      // Field rule fields are now included in the main SOQL query
      querySpy.mockResolvedValueOnce({
        records: [
          {
            Id: "001",
            Email: "test@example.com",
            OwnerId: "owner001",
            attributes: { type: "Contact" },
            Owner: { Email: "owner@example.com" },
            Industry: "Technology",
          },
        ],
      });

      // Mock describe for field validation
      mockConnection.describe = vi.fn().mockResolvedValue(mockDescribeResponse);

      const result = await service.getContacts({
        emails: "test@example.com",
        forRoundRobinSkip: true,
      });

      expect(result).toEqual([]);
      expect(querySpy).toHaveBeenCalledTimes(1);
    });

    it("should keep records not matching ignore rule", async () => {
      mockAppOptions({
        roundRobinSkipCheckRecordOn: SalesforceRecordEnum.CONTACT,
        createEventOn: SalesforceRecordEnum.CONTACT,
        rrSkipFieldRules: [{ field: "Industry", value: "Technology", action: "ignore" }],
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({
        records: [
          {
            Id: "001",
            Email: "test@example.com",
            OwnerId: "owner001",
            attributes: { type: "Contact" },
            Owner: { Email: "owner@example.com" },
            Industry: "Healthcare",
          },
        ],
      });

      mockConnection.describe = vi.fn().mockResolvedValue(mockDescribeResponse);

      const result = await service.getContacts({
        emails: "test@example.com",
        forRoundRobinSkip: true,
      });

      expect(result).toEqual([
        {
          id: "001",
          email: "test@example.com",
          ownerId: "owner001",
          ownerEmail: "owner@example.com",
          recordType: "Contact",
        },
      ]);
      expect(querySpy).toHaveBeenCalledTimes(1);
    });

    it("should filter out records not matching must_include rule", async () => {
      mockAppOptions({
        roundRobinSkipCheckRecordOn: SalesforceRecordEnum.CONTACT,
        createEventOn: SalesforceRecordEnum.CONTACT,
        rrSkipFieldRules: [{ field: "Industry", value: "Technology", action: "must_include" }],
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({
        records: [
          {
            Id: "001",
            Email: "test@example.com",
            OwnerId: "owner001",
            attributes: { type: "Contact" },
            Owner: { Email: "owner@example.com" },
            Industry: "Healthcare",
          },
        ],
      });

      mockConnection.describe = vi.fn().mockResolvedValue(mockDescribeResponse);

      const result = await service.getContacts({
        emails: "test@example.com",
        forRoundRobinSkip: true,
      });

      expect(result).toEqual([]);
      expect(querySpy).toHaveBeenCalledTimes(1);
    });

    it("should keep records matching must_include rule", async () => {
      mockAppOptions({
        roundRobinSkipCheckRecordOn: SalesforceRecordEnum.CONTACT,
        createEventOn: SalesforceRecordEnum.CONTACT,
        rrSkipFieldRules: [{ field: "Industry", value: "Technology", action: "must_include" }],
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({
        records: [
          {
            Id: "001",
            Email: "test@example.com",
            OwnerId: "owner001",
            attributes: { type: "Contact" },
            Owner: { Email: "owner@example.com" },
            Industry: "Technology",
          },
        ],
      });

      mockConnection.describe = vi.fn().mockResolvedValue(mockDescribeResponse);

      const result = await service.getContacts({
        emails: "test@example.com",
        forRoundRobinSkip: true,
      });

      expect(result).toEqual([
        {
          id: "001",
          email: "test@example.com",
          ownerId: "owner001",
          ownerEmail: "owner@example.com",
          recordType: "Contact",
        },
      ]);
      expect(querySpy).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple rules with AND logic", async () => {
      mockAppOptions({
        roundRobinSkipCheckRecordOn: SalesforceRecordEnum.CONTACT,
        createEventOn: SalesforceRecordEnum.CONTACT,
        rrSkipFieldRules: [
          { field: "Industry", value: "Technology", action: "must_include" },
          { field: "Type", value: "Inactive", action: "ignore" },
        ],
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({
        records: [
          {
            Id: "001",
            Email: "test@example.com",
            OwnerId: "owner001",
            attributes: { type: "Contact" },
            Owner: { Email: "owner@example.com" },
            Industry: "Technology",
            Type: "Active",
          },
        ],
      });

      mockConnection.describe = vi.fn().mockResolvedValue(mockDescribeResponse);

      const result = await service.getContacts({
        emails: "test@example.com",
        forRoundRobinSkip: true,
      });

      expect(result).toEqual([
        {
          id: "001",
          email: "test@example.com",
          ownerId: "owner001",
          ownerEmail: "owner@example.com",
          recordType: "Contact",
        },
      ]);
      expect(querySpy).toHaveBeenCalledTimes(1);
    });

    it("should skip rules for fields that do not exist on the record type", async () => {
      mockAppOptions({
        roundRobinSkipCheckRecordOn: SalesforceRecordEnum.CONTACT,
        createEventOn: SalesforceRecordEnum.CONTACT,
        rrSkipFieldRules: [{ field: "NonExistentField", value: "SomeValue", action: "must_include" }],
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce(contactQueryResponse);

      mockConnection.describe = vi.fn().mockResolvedValue(mockDescribeResponse);

      const result = await service.getContacts({
        emails: "test@example.com",
        forRoundRobinSkip: true,
      });

      expect(result).toEqual([
        {
          id: "001",
          email: "test@example.com",
          ownerId: "owner001",
          ownerEmail: "owner@example.com",
          recordType: "Contact",
        },
      ]);
    });

    it("should be case-insensitive when matching field values", async () => {
      mockAppOptions({
        roundRobinSkipCheckRecordOn: SalesforceRecordEnum.CONTACT,
        createEventOn: SalesforceRecordEnum.CONTACT,
        rrSkipFieldRules: [{ field: "Industry", value: "TECHNOLOGY", action: "must_include" }],
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({
        records: [
          {
            Id: "001",
            Email: "test@example.com",
            OwnerId: "owner001",
            attributes: { type: "Contact" },
            Owner: { Email: "owner@example.com" },
            Industry: "technology",
          },
        ],
      });

      mockConnection.describe = vi.fn().mockResolvedValue(mockDescribeResponse);

      const result = await service.getContacts({
        emails: "test@example.com",
        forRoundRobinSkip: true,
      });

      expect(result).toEqual([
        {
          id: "001",
          email: "test@example.com",
          ownerId: "owner001",
          ownerEmail: "owner@example.com",
          recordType: "Contact",
        },
      ]);
      expect(querySpy).toHaveBeenCalledTimes(1);
    });

    it("should not apply field rules when forRoundRobinSkip is false", async () => {
      mockAppOptions({
        createEventOn: SalesforceRecordEnum.CONTACT,
        rrSkipFieldRules: [{ field: "Industry", value: "Technology", action: "ignore" }],
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce(contactQueryResponse);

      const result = await service.getContacts({
        emails: "test@example.com",
        forRoundRobinSkip: false,
      });

      expect(result).toEqual([
        {
          id: "001",
          email: "test@example.com",
          recordType: "Contact",
        },
      ]);

      expect(querySpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteEvent", () => {
    const mockCalendarEvent = {
      title: "Test Booking",
      startTime: "2024-01-01T10:00:00Z",
      endTime: "2024-01-01T11:00:00Z",
      uid: "booking-uid-123",
      organizer: {
        email: "organizer@example.com",
        name: "Organizer",
        timeZone: "UTC",
        language: { translate: (key: string) => key, locale: "en" },
        id: 1,
      },
      attendees: [
        {
          email: "attendee@example.com",
          name: "Attendee",
          timeZone: "UTC",
          language: { translate: (key: string) => key, locale: "en" },
        },
      ],
      responses: null,
    };

    it("should delete the event record when no cancel write options are enabled", async () => {
      mockAppOptions({});

      const deleteFn = vi.fn().mockResolvedValue({ success: true });
      mockConnection.sobject.mockReturnValue({ delete: deleteFn });

      await service.deleteEvent("event-sf-id", mockCalendarEvent);

      expect(mockConnection.sobject).toHaveBeenCalledWith("Event");
      expect(deleteFn).toHaveBeenCalledWith("event-sf-id");
    });

    it("should write to contact/lead on cancel when onCancelWriteToRecord is enabled", async () => {
      mockAppOptions({
        onCancelWriteToRecord: true,
        onCancelWriteToRecordFields: {
          Last_Booking_Status__c: {
            value: "Cancelled",
            fieldType: "string",
            whenToWrite: "every_booking",
          },
        },
      });

      const deleteFn = vi.fn().mockResolvedValue({ success: true });
      const updateFn = vi.fn().mockResolvedValue({ success: true });
      mockConnection.sobject.mockImplementation((objectType: string) => {
        if (objectType === "Event") return { delete: deleteFn };
        return { update: updateFn };
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      // getEventWhoId query - returns the contact assigned to the event
      querySpy.mockResolvedValueOnce({
        records: [{ WhoId: "003CONTACT001" }],
      });
      // ensureFieldsExistOnObject (describe) mock
      mockConnection.describe = vi.fn().mockResolvedValue({
        fields: [{ name: "Last_Booking_Status__c", type: "string", length: 255 }],
      });
      // fetchPersonRecord query for writeToRecord
      querySpy.mockResolvedValueOnce({
        records: [{ Id: "003CONTACT001", Last_Booking_Status__c: null }],
      });

      await service.deleteEvent("event-sf-id", mockCalendarEvent);

      // Event should be deleted (no onCancelWriteToEventRecord)
      expect(deleteFn).toHaveBeenCalledWith("event-sf-id");
      // Contact should be updated via WhoId lookup
      expect(updateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          Id: "003CONTACT001",
          Last_Booking_Status__c: "Cancelled",
        })
      );
    });

    it("should write to both event record and contact/lead when both cancel write options are enabled", async () => {
      mockAppOptions({
        onCancelWriteToEventRecord: true,
        onCancelWriteToEventRecordFields: {
          Status__c: {
            value: "Cancelled",
            fieldType: "string",
            whenToWrite: "every_booking",
          },
        },
        onCancelWriteToRecord: true,
        onCancelWriteToRecordFields: {
          Last_Booking_Status__c: {
            value: "Cancelled",
            fieldType: "string",
            whenToWrite: "every_booking",
          },
        },
      });

      const updateFn = vi.fn().mockResolvedValue({ success: true });
      mockConnection.sobject.mockReturnValue({ update: updateFn });

      mockConnection.describe = vi.fn().mockResolvedValue({
        fields: [
          { name: "Status__c", type: "string", length: 255 },
          { name: "Last_Booking_Status__c", type: "string", length: 255 },
        ],
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      // getEventWhoId query - returns the contact assigned to the event
      querySpy.mockResolvedValueOnce({
        records: [{ WhoId: "003CONTACT001" }],
      });
      // fetchPersonRecord for event record write
      querySpy.mockResolvedValueOnce({
        records: [{ Id: "event-sf-id", Status__c: null }],
      });
      // fetchPersonRecord for person record write
      querySpy.mockResolvedValueOnce({
        records: [{ Id: "003CONTACT001", Last_Booking_Status__c: null }],
      });

      await service.deleteEvent("event-sf-id", mockCalendarEvent);

      // Event record should NOT be deleted (written to instead)
      // Both event record and contact should be updated
      expect(updateFn).toHaveBeenCalledTimes(2);
    });

    it("should not write to contact/lead when onCancelWriteToRecord is disabled", async () => {
      mockAppOptions({
        onCancelWriteToRecord: false,
        onCancelWriteToRecordFields: {
          Last_Booking_Status__c: {
            value: "Cancelled",
            fieldType: "string",
            whenToWrite: "every_booking",
          },
        },
      });

      const deleteFn = vi.fn().mockResolvedValue({ success: true });
      mockConnection.sobject.mockReturnValue({ delete: deleteFn });

      await service.deleteEvent("event-sf-id", mockCalendarEvent);

      // Event should be deleted normally
      expect(deleteFn).toHaveBeenCalledWith("event-sf-id");
      // No contact query should have been made
      expect(mockConnection.query).not.toHaveBeenCalled();
    });

    it("should gracefully handle when event has no WhoId", async () => {
      mockAppOptions({
        onCancelWriteToRecord: true,
        onCancelWriteToRecordFields: {
          Last_Booking_Status__c: {
            value: "Cancelled",
            fieldType: "string",
            whenToWrite: "every_booking",
          },
        },
      });

      const deleteFn = vi.fn().mockResolvedValue({ success: true });
      mockConnection.sobject.mockReturnValue({ delete: deleteFn });

      const querySpy = vi.spyOn(mockConnection, "query");
      // getEventWhoId returns no WhoId
      querySpy.mockResolvedValueOnce({ records: [{ WhoId: null }] });

      // Should not throw
      await service.deleteEvent("event-sf-id", mockCalendarEvent);

      expect(deleteFn).toHaveBeenCalledWith("event-sf-id");
    });
  });
});
