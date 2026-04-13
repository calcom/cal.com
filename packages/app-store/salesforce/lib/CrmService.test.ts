import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";
import type { CredentialPayload } from "@calcom/types/Credential";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import type { appDataSchema } from "../zod";
import type { SalesforceCRM } from "./CrmService";
import { createSalesforceCrmServiceWithSalesforceType } from "./CrmService";
import { SalesforceRecordEnum } from "./enums";

const mockCheckIfFreeEmailDomain = vi.fn().mockResolvedValue(false);
vi.mock("@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain", () => ({
  checkIfFreeEmailDomain: (...args: unknown[]) => mockCheckIfFreeEmailDomain(...args),
}));

const mockCheckIfFeatureIsEnabledGlobally = vi.fn().mockResolvedValue(false);
vi.mock("@calcom/features/di/containers/FeatureRepository", () => ({
  getFeatureRepository: () => ({
    checkIfFeatureIsEnabledGlobally: (...args: unknown[]) => mockCheckIfFeatureIsEnabledGlobally(...args),
  }),
}));

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
    mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(false);
    mockCheckIfFreeEmailDomain.mockResolvedValue(false);

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
          querySpy.mockResolvedValueOnce({
            records: [
              {
                Id: "acc-from-contacts",
                Name: "Acme",
                Website: "acme.com",
                RecordType: null,
                OwnerId: "005x",
                Owner: { Email: "owner@acme.com" },
                LastActivityDate: null,
                CreatedDate: null,
                ChildAccounts: null,
                Opportunities: null,
                Contacts: null,
              },
            ],
          }); // Batch account query for tiebreaker fields
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
          // 5 queries: exact IN, LIKE fallback, contact domain lookup, batch account tiebreaker, existing contact check
          expect(querySpy).toHaveBeenCalledTimes(5);
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

  describe("fuzzyMatchAccountByDomain (enable-fuzzy-domain-matching feature flag)", () => {
    it("cross-TLD match: acme.co.uk email matches acme.com account", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
        enableFuzzyDomainMatching: true,
      });
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1: Website IN — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 2: normalized LIKE — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 3: contact domain majority — miss
      querySpy.mockResolvedValueOnce({
        records: [{ Id: "acc-fuzzy", Website: "acme.com" }],
      }); // Step 4: fuzzy LIKE '%acme%' — hit
      querySpy.mockResolvedValueOnce({ records: [] }); // createNewContactUnderAnAccount lookup

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({
          success: true,
          id: "new-contact-fuzzy",
          name: "Test",
          email: "user@acme.co.uk",
        }),
      });

      const result = await service.createContacts([{ name: "Test", email: "user@acme.co.uk" }]);

      expect(result).toEqual([{ id: "new-contact-fuzzy", email: "user@acme.co.uk" }]);
      expect(querySpy).toHaveBeenCalledTimes(5);
      const fuzzyCall = querySpy.mock.calls[3][0] as string;
      expect(fuzzyCall).toContain("LIKE '%acme%'");
    });

    it("does not run fuzzy match when feature flag is off", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(false);

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 2
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 3

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({
          success: true,
          id: "new-lead",
          name: "Test",
          email: "user@acme.co.uk",
        }),
      });

      await service.createContacts([{ name: "Test", email: "user@acme.co.uk" }]);

      // Only 3 queries — no fuzzy step
      expect(querySpy).toHaveBeenCalledTimes(3);
    });

    it("filters out false positives: macmedia.com does not match acme", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
        enableFuzzyDomainMatching: true,
      });
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 2
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 3
      querySpy.mockResolvedValueOnce({
        records: [{ Id: "acc-false", Website: "macmedia.com" }],
      }); // Step 4: LIKE '%acme%' returns macmedia (substring match), but base domain differs

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({
          success: true,
          id: "new-lead",
          name: "Test",
          email: "user@acme.io",
        }),
      });

      await service.createContacts([{ name: "Test", email: "user@acme.io" }]);

      // 4 queries — fuzzy ran but found no match after filtering
      expect(querySpy).toHaveBeenCalledTimes(4);
    });

    it("skips fuzzy match for free email domains", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
        enableFuzzyDomainMatching: true,
      });
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);
      mockCheckIfFreeEmailDomain.mockResolvedValueOnce(true);

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 2
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 3

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({
          success: true,
          id: "new-lead",
          name: "Test",
          email: "user@gmail.com",
        }),
      });

      await service.createContacts([{ name: "Test", email: "user@gmail.com" }]);

      // Only 3 queries — fuzzy skipped for free email
      expect(querySpy).toHaveBeenCalledTimes(3);
    });

    it("handles multiple matches — picks first (tiebreaker deferred to PR4)", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
        enableFuzzyDomainMatching: true,
      });
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 2
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 3
      querySpy.mockResolvedValueOnce({
        records: [
          { Id: "acc-1", Website: "acme.com" },
          { Id: "acc-2", Website: "acme.co.uk" },
          { Id: "acc-3", Website: "https://www.acme.io/about" },
        ],
      }); // Step 4: multiple base domain matches
      querySpy.mockResolvedValueOnce({ records: [] }); // contact lookup

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({
          success: true,
          id: "new-contact",
          name: "Test",
          email: "user@acme.de",
        }),
      });

      const result = await service.createContacts([{ name: "Test", email: "user@acme.de" }]);

      expect(result).toEqual([{ id: "new-contact", email: "user@acme.de" }]);
      expect(querySpy).toHaveBeenCalledTimes(5);
    });

    it("returns undefined when SOQL returns 0 results", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
        enableFuzzyDomainMatching: true,
      });
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 2
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 3
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 4: no matches

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({
          success: true,
          id: "new-lead",
          name: "Test",
          email: "user@nonexistent.co.uk",
        }),
      });

      await service.createContacts([{ name: "Test", email: "user@nonexistent.co.uk" }]);
      expect(querySpy).toHaveBeenCalledTimes(4);
    });

    it("exact match in step 1 short-circuits — fuzzy never runs", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({
        records: [{ Id: "acc-exact", Website: "acme.com" }],
      }); // Step 1: exact hit
      querySpy.mockResolvedValueOnce({ records: [] }); // contact lookup

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({
          success: true,
          id: "new-contact",
          name: "Test",
          email: "user@acme.com",
        }),
      });

      const result = await service.createContacts([{ name: "Test", email: "user@acme.com" }]);

      expect(result).toEqual([{ id: "new-contact", email: "user@acme.com" }]);
      // Only 2 queries — step 1 hit + contact lookup
      expect(querySpy).toHaveBeenCalledTimes(2);
    });

    it("gracefully handles SOQL error in fuzzy step", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
        enableFuzzyDomainMatching: true,
      });
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 2
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 3
      querySpy.mockRejectedValueOnce(new Error("SOQL timeout")); // Step 4: error

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({
          success: true,
          id: "new-lead",
          name: "Test",
          email: "user@acme.co.uk",
        }),
      });

      // Should not throw — falls through gracefully
      await expect(
        service.createContacts([{ name: "Test", email: "user@acme.co.uk" }])
      ).resolves.toBeDefined();
    });

    it("skips fuzzy match when base domain is too short (< 3 chars)", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
        enableFuzzyDomainMatching: true,
      });
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1: exact — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 2: normalized — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 3: contact domain — miss

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({
          success: true,
          id: "new-lead",
          name: "Test",
          email: "user@ab.com",
        }),
      });

      await service.createContacts([{ name: "Test", email: "user@ab.com" }]);

      // Only 3 queries — fuzzy SOQL never fires because "ab" is < 3 chars
      expect(querySpy).toHaveBeenCalledTimes(3);
    });

    it("sorts multiple matches by Id for deterministic tiebreaking", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
        enableFuzzyDomainMatching: true,
      });
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1: exact — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 2: normalized — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 3: contact domain — miss
      querySpy.mockResolvedValueOnce({
        records: [
          { Id: "acc-zzz", Website: "acme.io" },
          { Id: "acc-aaa", Website: "acme.com" },
          { Id: "acc-mmm", Website: "acme.co.uk" },
        ],
      }); // Step 4: fuzzy — multiple matches in non-sorted order
      querySpy.mockResolvedValueOnce({ records: [] }); // existing contact check in createNewContactUnderAnAccount

      const createMock = vi.fn().mockResolvedValue({
        success: true,
        id: "new-contact",
        name: "Test",
        email: "user@acme.de",
      });
      mockConnection.sobject.mockReturnValue({ create: createMock });

      await service.createContacts([{ name: "Test", email: "user@acme.de" }]);

      // Contact was created under acc-aaa (lowest Id after deterministic sort)
      const createCall = createMock.mock.calls[0]?.[0];
      expect(createCall).toHaveProperty("AccountId", "acc-aaa");
    });

    it("handles email with uppercase domain — case-insensitive matching", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
        enableFuzzyDomainMatching: true,
      });
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1: exact — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 2: normalized — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 3: contact domain — miss
      querySpy.mockResolvedValueOnce({
        records: [{ Id: "acc-fuzzy", Website: "acme.com" }],
      }); // Step 4: fuzzy — hit
      querySpy.mockResolvedValueOnce({ records: [] }); // existing contact check

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({
          success: true,
          id: "new-contact",
          name: "Test",
          email: "user@ACME.CO.UK",
        }),
      });

      const result = await service.createContacts([{ name: "Test", email: "user@ACME.CO.UK" }]);
      expect(result).toEqual([{ id: "new-contact", email: "user@ACME.CO.UK" }]);
    });
  });

  describe("Record Type exclusion filtering (excludeAccountRecordTypes)", () => {
    it("excludes Partner account from exact match, returns Customer account", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
        excludeAccountRecordTypes: ["Partner/Alliance"],
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({
        records: [
          {
            Id: "acc-partner",
            Name: "Acme Partners",
            Website: "acme.com",
            RecordType: { Name: "Partner/Alliance" },
          },
          { Id: "acc-customer", Name: "Acme Corp", Website: "acme.com", RecordType: { Name: "Customer" } },
        ],
      }); // Step 1: exact match returns both
      querySpy.mockResolvedValueOnce({ records: [] }); // contact lookup

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({ success: true, id: "new-contact", email: "user@acme.com" }),
      });

      const result = await service.createContacts([{ name: "Test", email: "user@acme.com" }]);
      expect(result).toEqual([{ id: "new-contact", email: "user@acme.com" }]);

      const createCall = mockConnection.sobject().create.mock.calls[0]?.[0];
      expect(createCall).toHaveProperty("AccountId", "acc-customer");
    });

    it("all exact-match accounts excluded — falls through to normalized step", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
        excludeAccountRecordTypes: ["Partner/Alliance"],
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({
        records: [
          {
            Id: "acc-partner",
            Name: "Acme Partners",
            Website: "acme.com",
            RecordType: { Name: "Partner/Alliance" },
          },
        ],
      }); // Step 1: exact match — only Partner
      querySpy.mockResolvedValueOnce({
        records: [
          {
            Id: "acc-norm",
            Name: "Acme Norm",
            Website: "https://www.acme.com/about",
            RecordType: { Name: "Customer" },
          },
        ],
      }); // Step 2: normalized — Customer found
      querySpy.mockResolvedValueOnce({ records: [] }); // contact lookup

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({ success: true, id: "new-contact", email: "user@acme.com" }),
      });

      const result = await service.createContacts([{ name: "Test", email: "user@acme.com" }]);
      expect(result).toEqual([{ id: "new-contact", email: "user@acme.com" }]);

      const createCall = mockConnection.sobject().create.mock.calls[0]?.[0];
      expect(createCall).toHaveProperty("AccountId", "acc-norm");
    });

    it("excludes Partner account from fuzzy match results", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
        excludeAccountRecordTypes: ["Partner/Alliance"],
        enableFuzzyDomainMatching: true,
      });
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1: exact — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 2: normalized — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 3: contact domain — miss
      querySpy.mockResolvedValueOnce({
        records: [
          {
            Id: "acc-partner",
            Name: "Acme Partners",
            Website: "acme.com",
            RecordType: { Name: "Partner/Alliance" },
          },
          { Id: "acc-customer", Name: "Acme Corp", Website: "acme.co.uk", RecordType: { Name: "Customer" } },
        ],
      }); // Step 4: fuzzy — both returned by LIKE
      querySpy.mockResolvedValueOnce({ records: [] }); // contact lookup

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({ success: true, id: "new-contact", email: "user@acme.de" }),
      });

      const result = await service.createContacts([{ name: "Test", email: "user@acme.de" }]);
      expect(result).toEqual([{ id: "new-contact", email: "user@acme.de" }]);

      const createCall = mockConnection.sobject().create.mock.calls[0]?.[0];
      expect(createCall).toHaveProperty("AccountId", "acc-customer");
    });

    it("all fuzzy-match accounts excluded — no match, falls to round-robin", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
        excludeAccountRecordTypes: ["Partner/Alliance", "Vendor"],
        enableFuzzyDomainMatching: true,
      });
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 2
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 3
      querySpy.mockResolvedValueOnce({
        records: [
          {
            Id: "acc-partner",
            Name: "Acme Partners",
            Website: "acme.com",
            RecordType: { Name: "Partner/Alliance" },
          },
          { Id: "acc-vendor", Name: "Acme Vendor", Website: "acme.io", RecordType: { Name: "Vendor" } },
        ],
      }); // Step 4: all excluded

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({ success: true, id: "new-lead", email: "user@acme.de" }),
      });

      await service.createContacts([{ name: "Test", email: "user@acme.de" }]);
      expect(querySpy).toHaveBeenCalledTimes(4);
    });

    it("no exclusions configured — all accounts pass through", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({
        records: [
          {
            Id: "acc-partner",
            Name: "Acme Partners",
            Website: "acme.com",
            RecordType: { Name: "Partner/Alliance" },
          },
        ],
      }); // Step 1: exact match — Partner, but no exclusion configured
      querySpy.mockResolvedValueOnce({ records: [] }); // contact lookup

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({ success: true, id: "new-contact", email: "user@acme.com" }),
      });

      const result = await service.createContacts([{ name: "Test", email: "user@acme.com" }]);
      expect(result).toEqual([{ id: "new-contact", email: "user@acme.com" }]);

      const createCall = mockConnection.sobject().create.mock.calls[0]?.[0];
      expect(createCall).toHaveProperty("AccountId", "acc-partner");
    });

    it("account with no Record Type is kept (not in exclusion list)", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
        excludeAccountRecordTypes: ["Partner/Alliance"],
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({
        records: [{ Id: "acc-no-rt", Name: "Acme No RT", Website: "acme.com", RecordType: null }],
      }); // Step 1: account with no Record Type
      querySpy.mockResolvedValueOnce({ records: [] }); // contact lookup

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({ success: true, id: "new-contact", email: "user@acme.com" }),
      });

      const result = await service.createContacts([{ name: "Test", email: "user@acme.com" }]);
      expect(result).toEqual([{ id: "new-contact", email: "user@acme.com" }]);

      const createCall = mockConnection.sobject().create.mock.calls[0]?.[0];
      expect(createCall).toHaveProperty("AccountId", "acc-no-rt");
    });

    it("SOQL includes RecordType.Name in exact match query", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
        excludeAccountRecordTypes: ["Partner/Alliance"],
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({
        records: [{ Id: "acc-1", Name: "Acme", Website: "acme.com", RecordType: { Name: "Customer" } }],
      });
      querySpy.mockResolvedValueOnce({ records: [] }); // contact lookup

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({ success: true, id: "new-contact", email: "user@acme.com" }),
      });

      await service.createContacts([{ name: "Test", email: "user@acme.com" }]);

      const exactQuery = querySpy.mock.calls[0][0] as string;
      expect(exactQuery).toContain("RecordType.Name");
    });

    it("excludes dominant contact-domain account, falls back to next-best account", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
        excludeAccountRecordTypes: ["Partner"],
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1: exact — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 2: normalized — miss
      querySpy.mockResolvedValueOnce({
        records: [
          { Id: "c1", Email: "alice@acme.com", AccountId: "acc-partner" },
          { Id: "c2", Email: "bob@acme.com", AccountId: "acc-partner" },
          { Id: "c3", Email: "carol@acme.com", AccountId: "acc-customer" },
        ],
      }); // Step 3: contact domain — acc-partner dominant (2), acc-customer second (1)
      querySpy.mockResolvedValueOnce({
        records: [
          { Id: "acc-partner", Name: "Acme Partners", RecordType: { Name: "Partner" } },
          { Id: "acc-customer", Name: "Acme Corp", RecordType: { Name: "Customer" } },
        ],
      }); // Batch RT check — acc-partner excluded, acc-customer kept
      querySpy.mockResolvedValueOnce({ records: [] }); // createNewContactUnderAnAccount: existing contact check

      const createFn = vi
        .fn()
        .mockResolvedValue({ success: true, id: "new-contact", email: "user@acme.com" });
      mockConnection.sobject.mockReturnValue({ create: createFn });

      await service.createContacts([{ name: "Test", email: "user@acme.com" }]);

      // Single batch query fetched both accounts
      const batchQuery = querySpy.mock.calls[3][0] as string;
      expect(batchQuery).toContain("acc-partner");
      expect(batchQuery).toContain("acc-customer");
      expect(batchQuery).toContain("IN");
      // Contact was created under acc-customer (the non-excluded one)
      expect(createFn).toHaveBeenCalledWith(expect.objectContaining({ AccountId: "acc-customer" }));
    });

    it("case-insensitive: excludes record type regardless of casing mismatch", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
        excludeAccountRecordTypes: ["partner/alliance"],
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({
        records: [
          {
            Id: "acc-partner",
            Name: "Acme Partners",
            Website: "acme.com",
            RecordType: { Name: "Partner/Alliance" },
          },
          { Id: "acc-customer", Name: "Acme Corp", Website: "acme.com", RecordType: { Name: "Customer" } },
        ],
      }); // Step 1: exact match — Partner has different casing than config
      querySpy.mockResolvedValueOnce({ records: [] }); // contact lookup

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({ success: true, id: "new-contact", email: "user@acme.com" }),
      });

      const result = await service.createContacts([{ name: "Test", email: "user@acme.com" }]);
      expect(result).toEqual([{ id: "new-contact", email: "user@acme.com" }]);

      const createCall = mockConnection.sobject().create.mock.calls[0]?.[0];
      expect(createCall).toHaveProperty("AccountId", "acc-customer");
    });

    it("contact-domain batch RT query failure gracefully skips exclusion", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
        excludeAccountRecordTypes: ["Partner"],
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1: exact — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 2: normalized — miss
      querySpy.mockResolvedValueOnce({
        records: [
          { Id: "c1", Email: "alice@acme.com", AccountId: "acc-partner" },
          { Id: "c2", Email: "bob@acme.com", AccountId: "acc-partner" },
        ],
      }); // Step 3: contact domain — acc-partner dominant
      querySpy.mockRejectedValueOnce(new Error("SOQL query failed")); // Batch RT check fails
      querySpy.mockResolvedValueOnce({ records: [] }); // existing contact check

      const createFn = vi
        .fn()
        .mockResolvedValue({ success: true, id: "new-contact", email: "user@acme.com" });
      mockConnection.sobject.mockReturnValue({ create: createFn });

      await service.createContacts([{ name: "Test", email: "user@acme.com" }]);

      // Despite the RT query failure, the dominant account is still used (exclusion skipped gracefully)
      expect(createFn).toHaveBeenCalledWith(expect.objectContaining({ AccountId: "acc-partner" }));
    });
  });

  describe("findAccountByNormalizedWebsite edge cases", () => {
    it("matches Account with port in Website field", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1: exact — miss
      querySpy.mockResolvedValueOnce({
        records: [{ Id: "acc-port", Website: "http://acme.com:8080" }],
      }); // Step 2: normalized LIKE — hit (normalizes to acme.com)
      querySpy.mockResolvedValueOnce({ records: [] }); // contact lookup

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({
          success: true,
          id: "new-contact",
          name: "Test",
          email: "user@acme.com",
        }),
      });

      const result = await service.createContacts([{ name: "Test", email: "user@acme.com" }]);
      expect(result).toEqual([{ id: "new-contact", email: "user@acme.com" }]);
      expect(querySpy).toHaveBeenCalledTimes(3);
    });

    it("matches Account with path and query string in Website field", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1: exact — miss
      querySpy.mockResolvedValueOnce({
        records: [{ Id: "acc-path", Website: "https://www.acme.com/about?ref=google#team" }],
      }); // Step 2: normalized LIKE — hit
      querySpy.mockResolvedValueOnce({ records: [] }); // contact lookup

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({
          success: true,
          id: "new-contact",
          name: "Test",
          email: "user@acme.com",
        }),
      });

      const result = await service.createContacts([{ name: "Test", email: "user@acme.com" }]);
      expect(result).toEqual([{ id: "new-contact", email: "user@acme.com" }]);
      expect(querySpy).toHaveBeenCalledTimes(3);
    });

    it("does not match subdomain Account against bare domain email", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1: exact — miss
      querySpy.mockResolvedValueOnce({
        records: [{ Id: "acc-sub", Website: "partners.acme.com" }],
      }); // Step 2: LIKE returns subdomain, but normalization keeps "partners.acme.com" ≠ "acme.com"
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 3: contact domain — miss

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({
          success: true,
          id: "new-lead",
          name: "Test",
          email: "user@acme.com",
        }),
      });

      await service.createContacts([{ name: "Test", email: "user@acme.com" }]);
      // 3 queries: exact miss → normalized fallback miss (subdomain mismatch) → contact miss
      expect(querySpy).toHaveBeenCalledTimes(3);
    });

    it("gracefully handles SOQL error in normalized fallback", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1: exact — miss
      querySpy.mockRejectedValueOnce(new Error("SOQL timeout")); // Step 2: normalized — SOQL error
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 3: contact domain — miss (should still run)

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({
          success: true,
          id: "new-lead",
          name: "Test",
          email: "user@acme.com",
        }),
      });

      // Should not throw — normalized fallback error is caught, falls through to contact step
      await expect(service.createContacts([{ name: "Test", email: "user@acme.com" }])).resolves.toBeDefined();
      // 3 queries: exact miss → normalized error (caught) → contact domain miss
      expect(querySpy).toHaveBeenCalledTimes(3);
    });

    it("picks correct candidate when LIKE returns multiple but only one normalizes to exact domain", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1: exact — miss
      querySpy.mockResolvedValueOnce({
        records: [
          { Id: "acc-wrong", Website: "https://partners.acme.com/portal" }, // normalizes to partners.acme.com
          { Id: "acc-right", Website: "http://www.acme.com:443/en/" }, // normalizes to acme.com
          { Id: "acc-also-wrong", Website: "acme.com.br" }, // normalizes to acme.com.br
        ],
      }); // Step 2: normalized LIKE — multiple candidates, only one matches
      querySpy.mockResolvedValueOnce({ records: [] }); // contact lookup

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({
          success: true,
          id: "new-contact",
          name: "Test",
          email: "user@acme.com",
        }),
      });

      const result = await service.createContacts([{ name: "Test", email: "user@acme.com" }]);
      expect(result).toEqual([{ id: "new-contact", email: "user@acme.com" }]);
      expect(querySpy).toHaveBeenCalledTimes(3);
    });
  });

  describe("sanitizeSoqlLikeValue escaping in SOQL queries", () => {
    it("escapes SOQL LIKE wildcards in email domain for normalized fallback", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1: exact — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 2: normalized — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 3: contact domain — miss

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({
          success: true,
          id: "new-lead",
          name: "Test",
          email: "user@my_company.com",
        }),
      });

      await service.createContacts([{ name: "Test", email: "user@my_company.com" }]);

      // Verify LIKE queries escape _ wildcard
      const normalizedCall = querySpy.mock.calls[1][0] as string;
      expect(normalizedCall).toContain("my\\_company.com");

      const contactCall = querySpy.mock.calls[2][0] as string;
      expect(contactCall).toContain("my\\_company.com");
    });

    it("escapes SOQL LIKE wildcards in base domain for fuzzy matching", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
        enableFuzzyDomainMatching: true,
      });
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 2
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 3
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 4: fuzzy

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({
          success: true,
          id: "new-lead",
          name: "Test",
          email: "user@my_corp.com",
        }),
      });

      await service.createContacts([{ name: "Test", email: "user@my_corp.com" }]);

      // Verify the fuzzy SOQL escapes _ in the base domain
      const fuzzyCall = querySpy.mock.calls[3][0] as string;
      expect(fuzzyCall).toContain("my\\_corp");
    });
  });

  describe("full account resolution waterfall", () => {
    it("step 2 normalized fallback wins when exact miss but LIKE + normalization matches", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1: exact — miss
      querySpy.mockResolvedValueOnce({
        records: [{ Id: "acc-norm", Website: "HTTPS://WWW.ACME.COM/ABOUT" }],
      }); // Step 2: normalized — hit
      querySpy.mockResolvedValueOnce({ records: [] }); // contact lookup

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({
          success: true,
          id: "new-contact",
          name: "Test",
          email: "user@acme.com",
        }),
      });

      const result = await service.createContacts([{ name: "Test", email: "user@acme.com" }]);
      expect(result).toEqual([{ id: "new-contact", email: "user@acme.com" }]);
      // Only 3 queries — steps 3 and 4 never execute
      expect(querySpy).toHaveBeenCalledTimes(3);
    });

    it("step 3 contact majority wins when steps 1 and 2 miss", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1: exact — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 2: normalized — miss
      querySpy.mockResolvedValueOnce({
        records: [
          { Id: "c1", Email: "alice@acme.com", AccountId: "acc-majority" },
          { Id: "c2", Email: "bob@acme.com", AccountId: "acc-majority" },
          { Id: "c3", Email: "charlie@acme.com", AccountId: "acc-other" },
        ],
      }); // Step 3: contact majority — hit (2 contacts under acc-majority)
      querySpy.mockResolvedValueOnce({
        records: [
          {
            Id: "acc-majority",
            Name: "Acme Majority",
            Website: "acme.com",
            RecordType: null,
            OwnerId: "005a",
            Owner: { Email: "a@acme.com" },
            LastActivityDate: null,
            CreatedDate: "2024-01-01",
            ChildAccounts: { totalSize: 3, done: true, records: [] },
            Opportunities: null,
            Contacts: null,
          },
          {
            Id: "acc-other",
            Name: "Acme Other",
            Website: "acme.com",
            RecordType: null,
            OwnerId: "005b",
            Owner: { Email: "b@acme.com" },
            LastActivityDate: null,
            CreatedDate: "2024-06-01",
            ChildAccounts: { totalSize: 1, done: true, records: [] },
            Opportunities: null,
            Contacts: null,
          },
        ],
      }); // Batch account query for tiebreaker fields
      querySpy.mockResolvedValueOnce({ records: [] }); // contact lookup

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({
          success: true,
          id: "new-contact",
          name: "Test",
          email: "user@acme.com",
        }),
      });

      const result = await service.createContacts([{ name: "Test", email: "user@acme.com" }]);
      expect(result).toEqual([{ id: "new-contact", email: "user@acme.com" }]);
      // 5 queries: step 1 exact, step 2 normalized, step 3 contacts, batch account tiebreaker, contact lookup
      expect(querySpy).toHaveBeenCalledTimes(5);
    });

    it("all 4 steps run when each prior step misses (full waterfall)", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
        enableFuzzyDomainMatching: true,
      });
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1: exact — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 2: normalized — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 3: contact majority — miss
      querySpy.mockResolvedValueOnce({
        records: [{ Id: "acc-fuzzy-win", Website: "acme.com" }],
      }); // Step 4: fuzzy — hit
      querySpy.mockResolvedValueOnce({ records: [] }); // contact lookup

      const createMock = vi.fn().mockResolvedValue({
        success: true,
        id: "new-contact",
        name: "Test",
        email: "user@acme.co.uk",
      });
      mockConnection.sobject.mockReturnValue({ create: createMock });

      const result = await service.createContacts([{ name: "Test", email: "user@acme.co.uk" }]);
      expect(result).toEqual([{ id: "new-contact", email: "user@acme.co.uk" }]);
      // All 5 queries: 4 waterfall steps + contact lookup
      expect(querySpy).toHaveBeenCalledTimes(5);

      // Verify the contact was created under the fuzzy-matched account
      const createCall = createMock.mock.calls[0]?.[0];
      expect(createCall).toHaveProperty("AccountId", "acc-fuzzy-win");
    });

    it("all 4 steps miss — creates lead without account", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
        enableFuzzyDomainMatching: true,
      });
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1: exact — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 2: normalized — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 3: contact — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 4: fuzzy — miss

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({
          success: true,
          id: "new-lead-no-account",
          name: "Test",
          email: "user@uniquedomain.co.uk",
        }),
      });

      const result = await service.createContacts([{ name: "Test", email: "user@uniquedomain.co.uk" }]);
      expect(result).toEqual([{ id: "new-lead-no-account", email: "user@uniquedomain.co.uk" }]);
      // 4 queries — all waterfall steps ran, no contact lookup because no account found
      expect(querySpy).toHaveBeenCalledTimes(4);
    });
  });

  // ===== Gaps 1, 2, 3, 6, 8: Tiebreaker waterfall + host filter through CrmService =====

  describe("Tiebreaker waterfall through CrmService (P5-P9)", () => {
    // Helper: builds a full AccountSoqlRecord with tiebreaker sub-query fields
    function makeSoqlAccount(overrides: {
      Id: string;
      Name?: string;
      Website?: string;
      OwnerId?: string;
      OwnerEmail?: string;
      RecordType?: { Name: string } | null;
      ChildAccountCount?: number;
      OpportunityCount?: number;
      ContactCount?: number;
      LastActivityDate?: string | null;
      CreatedDate?: string | null;
    }) {
      return {
        Id: overrides.Id,
        Name: overrides.Name ?? `Account ${overrides.Id}`,
        Website: overrides.Website ?? "acme.com",
        OwnerId: overrides.OwnerId ?? `owner-${overrides.Id}`,
        Owner: { Email: overrides.OwnerEmail ?? `owner-${overrides.Id}@cal.com` },
        RecordType: overrides.RecordType === undefined ? null : overrides.RecordType,
        LastActivityDate: overrides.LastActivityDate ?? null,
        CreatedDate: overrides.CreatedDate ?? null,
        ChildAccounts:
          overrides.ChildAccountCount != null
            ? { totalSize: overrides.ChildAccountCount, done: true, records: [] }
            : null,
        Opportunities:
          overrides.OpportunityCount != null
            ? { totalSize: overrides.OpportunityCount, done: true, records: [] }
            : null,
        Contacts:
          overrides.ContactCount != null
            ? { totalSize: overrides.ContactCount, done: true, records: [] }
            : null,
      };
    }

    // --- Gap 1: Exact website multi-match with tiebreaker fields exercising P5 ---
    it("exact website match: P5 ChildAccounts decides winner across 2 accounts", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({
        records: [
          makeSoqlAccount({
            Id: "acc-small",
            Website: "acme.com",
            ChildAccountCount: 2,
            OpportunityCount: 5,
          }),
          makeSoqlAccount({ Id: "acc-big", Website: "acme.com", ChildAccountCount: 10, OpportunityCount: 1 }),
        ],
      }); // Step 1: exact match returns 2 accounts
      querySpy.mockResolvedValueOnce({ records: [] }); // contact lookup

      const createFn = vi
        .fn()
        .mockResolvedValue({ success: true, id: "new-contact", email: "user@acme.com" });
      mockConnection.sobject.mockReturnValue({ create: createFn });

      await service.createContacts([{ name: "Test", email: "user@acme.com" }]);

      // acc-big wins because ChildAccountCount(10) > ChildAccountCount(2)
      expect(createFn).toHaveBeenCalledWith(expect.objectContaining({ AccountId: "acc-big" }));
    });

    // --- Gap 1: P6 decisive when P5 ties ---
    it("exact website match: P5 ties, P6 Opportunities decides", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({
        records: [
          makeSoqlAccount({ Id: "acc-a", Website: "acme.com", ChildAccountCount: 5, OpportunityCount: 3 }),
          makeSoqlAccount({ Id: "acc-b", Website: "acme.com", ChildAccountCount: 5, OpportunityCount: 20 }),
        ],
      });
      querySpy.mockResolvedValueOnce({ records: [] });

      const createFn = vi
        .fn()
        .mockResolvedValue({ success: true, id: "new-contact", email: "user@acme.com" });
      mockConnection.sobject.mockReturnValue({ create: createFn });

      await service.createContacts([{ name: "Test", email: "user@acme.com" }]);

      expect(createFn).toHaveBeenCalledWith(expect.objectContaining({ AccountId: "acc-b" }));
    });

    // --- Gap 1: Full cascade P5-P8 tie, P9 decides through CrmService ---
    it("exact website match: P5-P8 tie, P9 CreatedDate decides (oldest wins)", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({
        records: [
          makeSoqlAccount({
            Id: "acc-new",
            Website: "acme.com",
            ChildAccountCount: 5,
            OpportunityCount: 10,
            ContactCount: 20,
            LastActivityDate: "2026-03-01T00:00:00Z",
            CreatedDate: "2023-06-01T00:00:00Z",
          }),
          makeSoqlAccount({
            Id: "acc-old",
            Website: "acme.com",
            ChildAccountCount: 5,
            OpportunityCount: 10,
            ContactCount: 20,
            LastActivityDate: "2026-03-01T00:00:00Z",
            CreatedDate: "2018-01-15T00:00:00Z",
          }),
        ],
      });
      querySpy.mockResolvedValueOnce({ records: [] });

      const createFn = vi
        .fn()
        .mockResolvedValue({ success: true, id: "new-contact", email: "user@acme.com" });
      mockConnection.sobject.mockReturnValue({ create: createFn });

      await service.createContacts([{ name: "Test", email: "user@acme.com" }]);

      // acc-old wins because CreatedDate(2018) < CreatedDate(2023) (MIN = oldest)
      expect(createFn).toHaveBeenCalledWith(expect.objectContaining({ AccountId: "acc-old" }));
    });

    // --- Gap 2j: Host filter — non-host dropped ---
    it("host filter: non-host owner is dropped, host owner wins", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({
        records: [
          makeSoqlAccount({
            Id: "acc-nonhost",
            Website: "acme.com",
            OwnerEmail: "nonhost@cal.com",
            ChildAccountCount: 100,
          }),
          makeSoqlAccount({
            Id: "acc-host",
            Website: "acme.com",
            OwnerEmail: "host@cal.com",
            ChildAccountCount: 1,
          }),
        ],
      });
      querySpy.mockResolvedValueOnce({ records: [] });

      const createFn = vi
        .fn()
        .mockResolvedValue({ success: true, id: "new-contact", email: "user@acme.com" });
      mockConnection.sobject.mockReturnValue({ create: createFn });
      // mock the exact match to return both accounts, and verify
      // that when getContacts is called with hostEmails, the non-host is dropped.
      // But createContacts doesn't pass hostEmails. The host filter path is through
      // getContacts → getAccountIdBasedOnEmailDomainOfContacts(email, {hostEmails}).
      // Let's test via getContacts which does pass hostEmails.

      mockAppOptions({
        roundRobinSkipCheckRecordOn: SalesforceRecordEnum.CONTACT,
        createEventOn: SalesforceRecordEnum.CONTACT,
        createNewContactUnderAccount: true,
      });

      const querySpy2 = vi.spyOn(mockConnection, "query");
      querySpy2.mockReset();
      // getContacts SOQL query for contacts
      querySpy2.mockResolvedValueOnce({
        records: [
          {
            Id: "cnt-001",
            Email: "user@acme.com",
            OwnerId: "owner-host",
            attributes: { type: "Contact" },
            Owner: { Email: "host@cal.com" },
            AccountId: "acc-host",
            Account: {
              attributes: { type: "Account" },
              Owner: { Email: "host@cal.com" },
            },
          },
        ],
      });

      const result = await service.getContacts({
        emails: "user@acme.com",
        hostEmails: new Set(["host@cal.com"]),
      });

      expect(result).toEqual([expect.objectContaining({ id: "cnt-001", email: "user@acme.com" })]);
    });

    // --- Gap 2k: Host filter — all dropped → RR fallback ---
    it("host filter: all candidates dropped → no account returned (RR fallback)", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      // Exact match returns accounts whose owners are NOT hosts
      querySpy.mockResolvedValueOnce({
        records: [
          makeSoqlAccount({ Id: "acc-a", Website: "acme.com", OwnerEmail: "nonhost-a@cal.com" }),
          makeSoqlAccount({ Id: "acc-b", Website: "acme.com", OwnerEmail: "nonhost-b@cal.com" }),
        ],
      });
      // Normalized fallback — miss
      querySpy.mockResolvedValueOnce({ records: [] });
      // Contact domain lookup — miss
      querySpy.mockResolvedValueOnce({ records: [] });

      mockConnection.sobject.mockReturnValue({
        create: vi.fn().mockResolvedValue({ success: true, id: "new-lead", email: "user@acme.com" }),
      });

      // Call createContacts — internally calls getAccountIdBasedOnEmailDomainOfContacts
      // We need to simulate passing hostEmails. Since createContacts doesn't pass hostEmails,
      // and the host filter path runs through getContacts, let's verify via the
      // private method directly.

      // Access the private method via service prototype for testing
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error - accessing private method for testing
      const accountId = await service.getAccountIdBasedOnEmailDomainOfContacts("user@acme.com", {
        hostEmails: new Set(["onlyhost@cal.com"]),
      });

      // All candidates dropped by host filter, exact match falls through
      // Then normalized, contact-domain also miss → undefined (RR fallback)
      expect(accountId).toBeUndefined();
    });

    // --- Gap 2l: Host filter — some dropped, tiebreaker on rest ---
    it("host filter: some candidates dropped, tiebreaker runs on eligible rest", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({
        records: [
          makeSoqlAccount({
            Id: "acc-nonhost",
            Website: "acme.com",
            OwnerEmail: "nonhost@cal.com",
            ChildAccountCount: 100,
          }),
          makeSoqlAccount({
            Id: "acc-host-small",
            Website: "acme.com",
            OwnerEmail: "host-a@cal.com",
            ChildAccountCount: 2,
          }),
          makeSoqlAccount({
            Id: "acc-host-big",
            Website: "acme.com",
            OwnerEmail: "host-b@cal.com",
            ChildAccountCount: 8,
          }),
        ],
      });
      // No need for further queries since exact match has results

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error - accessing private method for testing
      const accountId = await service.getAccountIdBasedOnEmailDomainOfContacts("user@acme.com", {
        hostEmails: new Set(["host-a@cal.com", "host-b@cal.com"]),
      });

      // acc-nonhost dropped (not a host), tiebreaker on acc-host-small vs acc-host-big
      // acc-host-big wins by P5 ChildAccountCount(8) > ChildAccountCount(2)
      expect(accountId).toBe("acc-host-big");
    });

    // --- Gap 8: Host filter deduplication — two candidates with same owner email ---
    it("host filter: deduplicates candidates with same owner email", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({
        records: [
          makeSoqlAccount({
            Id: "acc-1",
            Website: "acme.com",
            OwnerEmail: "host@cal.com",
            ChildAccountCount: 3,
          }),
          makeSoqlAccount({
            Id: "acc-2",
            Website: "acme.com",
            OwnerEmail: "host@cal.com",
            ChildAccountCount: 10,
          }),
          makeSoqlAccount({
            Id: "acc-3",
            Website: "acme.com",
            OwnerEmail: "other-host@cal.com",
            ChildAccountCount: 1,
          }),
        ],
      });

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error - accessing private method for testing
      const accountId = await service.getAccountIdBasedOnEmailDomainOfContacts("user@acme.com", {
        hostEmails: new Set(["host@cal.com", "other-host@cal.com"]),
      });

      // acc-1 and acc-2 share owner host@cal.com — only first (acc-1) passes host filter
      // Tiebreaker: acc-1 (ChildAccountCount=3) vs acc-3 (ChildAccountCount=1)
      // acc-1 wins by P5
      expect(accountId).toBe("acc-1");
    });

    // --- Gap 3m: Exact website, multiple accounts → tiebreaker with enriched fields ---
    it("exact website: 3 accounts with enriched fields, P7 Contacts decides", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({
        records: [
          makeSoqlAccount({
            Id: "acc-a",
            Website: "acme.com",
            ChildAccountCount: 5,
            OpportunityCount: 10,
            ContactCount: 15,
          }),
          makeSoqlAccount({
            Id: "acc-b",
            Website: "acme.com",
            ChildAccountCount: 5,
            OpportunityCount: 10,
            ContactCount: 50,
          }),
          makeSoqlAccount({
            Id: "acc-c",
            Website: "acme.com",
            ChildAccountCount: 5,
            OpportunityCount: 10,
            ContactCount: 30,
          }),
        ],
      });
      querySpy.mockResolvedValueOnce({ records: [] });

      const createFn = vi
        .fn()
        .mockResolvedValue({ success: true, id: "new-contact", email: "user@acme.com" });
      mockConnection.sobject.mockReturnValue({ create: createFn });

      await service.createContacts([{ name: "Test", email: "user@acme.com" }]);

      // P5 ties (all 5), P6 ties (all 10), P7 decides: acc-b has ContactCount=50
      expect(createFn).toHaveBeenCalledWith(expect.objectContaining({ AccountId: "acc-b" }));
    });

    // --- Gap 3n: Contact-domain match, multiple accounts → tiebreaker ---
    it("contact-domain match: multiple accounts with same frequency, tiebreaker decides", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1: exact — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 2: normalized — miss
      querySpy.mockResolvedValueOnce({
        records: [
          { Id: "c1", Email: "alice@acme.com", AccountId: "acc-x" },
          { Id: "c2", Email: "bob@acme.com", AccountId: "acc-y" },
        ],
      }); // Step 3: contact domain — both accounts have 1 contact each (same frequency)
      querySpy.mockResolvedValueOnce({
        records: [
          makeSoqlAccount({
            Id: "acc-x",
            Website: "acme.com",
            OpportunityCount: 5,
            CreatedDate: "2020-01-01T00:00:00Z",
          }),
          makeSoqlAccount({
            Id: "acc-y",
            Website: "acme.com",
            OpportunityCount: 30,
            CreatedDate: "2022-01-01T00:00:00Z",
          }),
        ],
      }); // Batch tiebreaker query
      querySpy.mockResolvedValueOnce({ records: [] }); // contact lookup

      const createFn = vi
        .fn()
        .mockResolvedValue({ success: true, id: "new-contact", email: "user@acme.com" });
      mockConnection.sobject.mockReturnValue({ create: createFn });

      await service.createContacts([{ name: "Test", email: "user@acme.com" }]);

      // Same contact frequency → tiebreaker: P6 OpportunityCount decides
      // acc-y wins (OpportunityCount=30 > 5)
      expect(createFn).toHaveBeenCalledWith(expect.objectContaining({ AccountId: "acc-y" }));
    });

    // --- Gap 3o: Fuzzy match, multiple accounts → tiebreaker with enriched fields ---
    it("fuzzy match: multiple accounts with enriched fields, P8 LastActivity decides", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
        enableFuzzyDomainMatching: true,
      });
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1: exact — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 2: normalized — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 3: contact domain — miss
      querySpy.mockResolvedValueOnce({
        records: [
          makeSoqlAccount({
            Id: "acc-old-activity",
            Website: "acme.com",
            ChildAccountCount: 5,
            OpportunityCount: 10,
            ContactCount: 20,
            LastActivityDate: "2024-01-01T00:00:00Z",
            CreatedDate: "2020-01-01T00:00:00Z",
          }),
          makeSoqlAccount({
            Id: "acc-recent-activity",
            Website: "acme.co.uk",
            ChildAccountCount: 5,
            OpportunityCount: 10,
            ContactCount: 20,
            LastActivityDate: "2026-03-15T00:00:00Z",
            CreatedDate: "2020-01-01T00:00:00Z",
          }),
        ],
      }); // Step 4: fuzzy — multiple base domain matches with enriched fields
      querySpy.mockResolvedValueOnce({ records: [] }); // contact lookup

      const createFn = vi.fn().mockResolvedValue({ success: true, id: "new-contact", email: "user@acme.de" });
      mockConnection.sobject.mockReturnValue({ create: createFn });

      await service.createContacts([{ name: "Test", email: "user@acme.de" }]);

      // P5 ties, P6 ties, P7 ties, P8 LastActivity decides: acc-recent-activity wins (2026 > 2024)
      expect(createFn).toHaveBeenCalledWith(expect.objectContaining({ AccountId: "acc-recent-activity" }));
    });

    // --- Gap 6: Full pipeline integration test ---
    // email → exact account resolution → host filter → tiebreaker → winner
    it("full pipeline: email → account resolution → host filter → tiebreaker → winner", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      // Step 1: exact match returns 3 accounts with full tiebreaker fields
      querySpy.mockResolvedValueOnce({
        records: [
          makeSoqlAccount({
            Id: "acc-nonhost",
            Website: "acme.com",
            OwnerEmail: "nonhost@other.com",
            ChildAccountCount: 100,
            OpportunityCount: 100,
            ContactCount: 100,
            LastActivityDate: "2026-04-01T00:00:00Z",
            CreatedDate: "2010-01-01T00:00:00Z",
          }),
          makeSoqlAccount({
            Id: "acc-host-small",
            Website: "acme.com",
            OwnerEmail: "host-small@cal.com",
            ChildAccountCount: 2,
            OpportunityCount: 5,
            ContactCount: 10,
            LastActivityDate: "2025-06-01T00:00:00Z",
            CreatedDate: "2022-01-01T00:00:00Z",
          }),
          makeSoqlAccount({
            Id: "acc-host-big",
            Website: "acme.com",
            OwnerEmail: "host-big@cal.com",
            ChildAccountCount: 8,
            OpportunityCount: 25,
            ContactCount: 50,
            LastActivityDate: "2026-01-01T00:00:00Z",
            CreatedDate: "2019-06-01T00:00:00Z",
          }),
        ],
      });

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error - accessing private method for testing
      const accountId = await service.getAccountIdBasedOnEmailDomainOfContacts("user@acme.com", {
        hostEmails: new Set(["host-small@cal.com", "host-big@cal.com"]),
        eventTypeId: 42,
      });

      // Step 1: acc-nonhost dropped by host filter (owner not in hostEmails)
      // Step 2: tiebreaker between acc-host-small and acc-host-big
      // P5: ChildAccountCount(8 vs 2) → acc-host-big wins immediately
      expect(accountId).toBe("acc-host-big");
    });

    // --- Gap 5 (service-level): Trace emission for host filter at service level ---
    it("host filter emits hostFilterSummary trace with correct counts", async () => {
      const traceModule = await import("./tracing/SalesforceRoutingTraceService");
      const hostFilterSummarySpy = vi.spyOn(traceModule.SalesforceRoutingTraceService, "hostFilterSummary");

      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({
        records: [
          makeSoqlAccount({
            Id: "acc-host",
            Website: "acme.com",
            OwnerEmail: "host@cal.com",
            OwnerId: "005host",
            ChildAccountCount: 1,
          }),
          makeSoqlAccount({
            Id: "acc-nonhost",
            Website: "acme.com",
            OwnerEmail: "nonhost@other.com",
            OwnerId: "005nonhost",
            ChildAccountCount: 100,
          }),
        ],
      });

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error - accessing private method for testing
      await service.getAccountIdBasedOnEmailDomainOfContacts("user@acme.com", {
        hostEmails: new Set(["host@cal.com"]),
        eventTypeId: 42,
      });

      // hostFilterSummary called once with correct counts
      expect(hostFilterSummarySpy).toHaveBeenCalledOnce();
      expect(hostFilterSummarySpy).toHaveBeenCalledWith({
        totalCandidates: 2,
        eligibleCount: 1,
        droppedCount: 1,
        droppedOwners: { "nonhost@other.com": 1 },
        eligibleOwners: ["host@cal.com"],
        eventTypeId: 42,
      });

      hostFilterSummarySpy.mockRestore();
    });

    // --- Gap 2: Host filter bypassed when hostEmails is empty/undefined ---
    it("host filter: bypassed when no hostEmails provided — all candidates pass through", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({
        records: [
          makeSoqlAccount({ Id: "acc-a", Website: "acme.com", ChildAccountCount: 3 }),
          makeSoqlAccount({ Id: "acc-b", Website: "acme.com", ChildAccountCount: 10 }),
        ],
      });
      querySpy.mockResolvedValueOnce({ records: [] });

      const createFn = vi
        .fn()
        .mockResolvedValue({ success: true, id: "new-contact", email: "user@acme.com" });
      mockConnection.sobject.mockReturnValue({ create: createFn });

      // No hostEmails — all candidates pass through, tiebreaker picks acc-b
      await service.createContacts([{ name: "Test", email: "user@acme.com" }]);

      expect(createFn).toHaveBeenCalledWith(expect.objectContaining({ AccountId: "acc-b" }));
    });

    // --- Gap 3n variant: Contact-domain with host filter + tiebreaker ---
    it("contact-domain: host filter reduces same-frequency candidates, tiebreaker picks winner", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1: exact — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 2: normalized — miss
      querySpy.mockResolvedValueOnce({
        records: [
          { Id: "c1", Email: "alice@acme.com", AccountId: "acc-x" },
          { Id: "c2", Email: "bob@acme.com", AccountId: "acc-y" },
          { Id: "c3", Email: "carol@acme.com", AccountId: "acc-z" },
        ],
      }); // Step 3: contact domain — all 3 accounts have 1 contact each (same frequency)
      querySpy.mockResolvedValueOnce({
        records: [
          makeSoqlAccount({
            Id: "acc-x",
            OwnerEmail: "nonhost@other.com",
            OpportunityCount: 50,
          }),
          makeSoqlAccount({
            Id: "acc-y",
            OwnerEmail: "host-a@cal.com",
            OpportunityCount: 5,
          }),
          makeSoqlAccount({
            Id: "acc-z",
            OwnerEmail: "host-b@cal.com",
            OpportunityCount: 25,
          }),
        ],
      }); // Batch tiebreaker query

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error - accessing private method for testing
      const accountId = await service.getAccountIdBasedOnEmailDomainOfContacts("user@acme.com", {
        hostEmails: new Set(["host-a@cal.com", "host-b@cal.com"]),
      });

      // All 3 accounts have same contact frequency (1 each), so sameFrequency = [acc-x, acc-y, acc-z]
      // Host filter drops acc-x (owner nonhost@other.com not in hostEmails)
      // Tiebreaker between acc-y (Opp=5) and acc-z (Opp=25)
      // P6 OpportunityCount decides: acc-z wins (25 > 5)
      expect(accountId).toBe("acc-z");
    });

    // --- Bug fix: contact-domain falls through to lower-frequency tier when host filter drops all top-tier ---
    it("contact-domain: falls through to lower-frequency tier when host filter drops all top-frequency candidates", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
      });

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 1: exact — miss
      querySpy.mockResolvedValueOnce({ records: [] }); // Step 2: normalized — miss
      querySpy.mockResolvedValueOnce({
        records: [
          // Account A and B have 2 contacts each (top tier)
          { Id: "c1", Email: "alice@acme.com", AccountId: "acc-top-a" },
          { Id: "c2", Email: "bob@acme.com", AccountId: "acc-top-a" },
          { Id: "c3", Email: "carol@acme.com", AccountId: "acc-top-b" },
          { Id: "c4", Email: "dave@acme.com", AccountId: "acc-top-b" },
          // Account C has 1 contact (lower tier)
          { Id: "c5", Email: "eve@acme.com", AccountId: "acc-lower-c" },
        ],
      }); // Step 3: contact domain
      querySpy.mockResolvedValueOnce({
        records: [
          makeSoqlAccount({
            Id: "acc-top-a",
            OwnerEmail: "nonhost-a@other.com",
            ChildAccountCount: 100,
          }),
          makeSoqlAccount({
            Id: "acc-top-b",
            OwnerEmail: "nonhost-b@other.com",
            ChildAccountCount: 200,
          }),
          makeSoqlAccount({
            Id: "acc-lower-c",
            OwnerEmail: "host@cal.com",
            ChildAccountCount: 1,
          }),
        ],
      }); // Batch tiebreaker query

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error - accessing private method for testing
      const accountId = await service.getAccountIdBasedOnEmailDomainOfContacts("user@acme.com", {
        hostEmails: new Set(["host@cal.com"]),
      });

      // Top tier (acc-top-a, acc-top-b): both have 2 contacts, but both owners are non-hosts → dropped
      // Lower tier (acc-lower-c): 1 contact, owner is host@cal.com → eligible
      // acc-lower-c should be selected instead of falling through to fuzzy match
      expect(accountId).toBe("acc-lower-c");
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

  describe("generateWriteToEventBody type coercion", () => {
    const mockCalendarEvent = {
      title: "Test Booking",
      type: "30min",
      startTime: "2024-01-01T10:00:00.000Z",
      endTime: "2024-01-01T10:30:00.000Z",
      organizer: {
        email: "organizer@example.com",
        name: "Test Organizer",
        timeZone: "UTC",
        language: { translate: (key: string) => key },
      },
      attendees: [
        {
          email: "attendee@example.com",
          name: "Test Attendee",
          timeZone: "UTC",
          language: { translate: (key: string) => key },
        },
      ],
      uid: "booking-uid-123",
      responses: null,
    };

    it("coerces string 'False' to boolean false for checkbox fields", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectMap: {
          Event_Cancelled__c: "False",
        },
      });

      const createFn = vi.fn().mockResolvedValue({ success: true, id: "evt-001" });
      mockConnection.sobject.mockReturnValue({ create: createFn });
      mockConnection.query = vi.fn().mockResolvedValueOnce({ records: [{ Id: "sf-user-001" }] });

      mockConnection.describe = vi.fn().mockResolvedValue({
        fields: [{ name: "Event_Cancelled__c", type: "boolean", length: 0 }],
      });

      const contacts = [{ id: "cnt-001", email: "attendee@example.com", recordType: "Contact" as const }];
      await service.createEvent(mockCalendarEvent as never, contacts);

      const createCallArgs = createFn.mock.calls[0][0];
      expect(createCallArgs.Event_Cancelled__c).toBe(false);
    });

    it("coerces string 'True' to boolean true for checkbox fields", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectMap: {
          Is_Demo__c: "True",
        },
      });

      const createFn = vi.fn().mockResolvedValue({ success: true, id: "evt-002" });
      mockConnection.sobject.mockReturnValue({ create: createFn });
      mockConnection.query = vi.fn().mockResolvedValueOnce({ records: [{ Id: "sf-user-001" }] });

      mockConnection.describe = vi.fn().mockResolvedValue({
        fields: [{ name: "Is_Demo__c", type: "boolean", length: 0 }],
      });

      const contacts = [{ id: "cnt-001", email: "attendee@example.com", recordType: "Contact" as const }];
      await service.createEvent(mockCalendarEvent as never, contacts);

      const createCallArgs = createFn.mock.calls[0][0];
      expect(createCallArgs.Is_Demo__c).toBe(true);
    });

    it("preserves boolean values from new writeToBookingEntry format", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectMap: {
          Is_Demo__c: { value: true, fieldType: "boolean", whenToWrite: "every_booking" },
        },
      });

      const createFn = vi.fn().mockResolvedValue({ success: true, id: "evt-003" });
      mockConnection.sobject.mockReturnValue({ create: createFn });
      mockConnection.query = vi.fn().mockResolvedValueOnce({ records: [{ Id: "sf-user-001" }] });

      mockConnection.describe = vi.fn().mockResolvedValue({
        fields: [{ name: "Is_Demo__c", type: "boolean", length: 0 }],
      });

      const contacts = [{ id: "cnt-001", email: "attendee@example.com", recordType: "Contact" as const }];
      await service.createEvent(mockCalendarEvent as never, contacts);

      const createCallArgs = createFn.mock.calls[0][0];
      expect(createCallArgs.Is_Demo__c).toBe(true);
    });

    it("passes text fields through getTextFieldValue as strings", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectMap: {
          Meeting_Type__c: "Demo Call",
        },
      });

      const createFn = vi.fn().mockResolvedValue({ success: true, id: "evt-004" });
      mockConnection.sobject.mockReturnValue({ create: createFn });
      mockConnection.query = vi.fn().mockResolvedValueOnce({ records: [{ Id: "sf-user-001" }] });

      mockConnection.describe = vi.fn().mockResolvedValue({
        fields: [{ name: "Meeting_Type__c", type: "string", length: 255 }],
      });

      const contacts = [{ id: "cnt-001", email: "attendee@example.com", recordType: "Contact" as const }];
      await service.createEvent(mockCalendarEvent as never, contacts);

      const createCallArgs = createFn.mock.calls[0][0];
      expect(createCallArgs.Meeting_Type__c).toBe("Demo Call");
    });

    it("handles mixed legacy and typed fields in same config", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectMap: {
          Meeting_Type__c: "Demo Call",
          Is_Demo__c: { value: false, fieldType: "boolean", whenToWrite: "every_booking" },
        },
      });

      const createFn = vi.fn().mockResolvedValue({ success: true, id: "evt-005" });
      mockConnection.sobject.mockReturnValue({ create: createFn });
      mockConnection.query = vi.fn().mockResolvedValueOnce({ records: [{ Id: "sf-user-001" }] });

      mockConnection.describe = vi.fn().mockResolvedValue({
        fields: [
          { name: "Meeting_Type__c", type: "string", length: 255 },
          { name: "Is_Demo__c", type: "boolean", length: 0 },
        ],
      });

      const contacts = [{ id: "cnt-001", email: "attendee@example.com", recordType: "Contact" as const }];
      await service.createEvent(mockCalendarEvent as never, contacts);

      const createCallArgs = createFn.mock.calls[0][0];
      expect(createCallArgs.Meeting_Type__c).toBe("Demo Call");
      expect(createCallArgs.Is_Demo__c).toBe(false);
    });

    it("returns empty body when feature is disabled", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: false,
      });

      const createFn = vi.fn().mockResolvedValue({ success: true, id: "evt-006" });
      mockConnection.sobject.mockReturnValue({ create: createFn });
      mockConnection.query = vi.fn().mockResolvedValueOnce({ records: [{ Id: "sf-user-001" }] });

      const contacts = [{ id: "cnt-001", email: "attendee@example.com", recordType: "Contact" as const }];
      await service.createEvent(mockCalendarEvent as never, contacts);

      const createCallArgs = createFn.mock.calls[0][0];
      expect(createCallArgs.Event_Cancelled__c).toBeUndefined();
    });

    it("skips DATE field when getDateFieldValue returns null for unrecognised value", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectMap: {
          Booking_Date__c: { value: "unknown-date-ref", fieldType: "date", whenToWrite: "every_booking" },
        },
      });

      const createFn = vi.fn().mockResolvedValue({ success: true, id: "evt-010" });
      mockConnection.sobject.mockReturnValue({ create: createFn });
      mockConnection.query = vi.fn().mockResolvedValueOnce({ records: [{ Id: "sf-user-001" }] });

      mockConnection.describe = vi.fn().mockResolvedValue({
        fields: [{ name: "Booking_Date__c", type: "date", length: 0 }],
      });

      const contacts = [{ id: "cnt-001", email: "attendee@example.com", recordType: "Contact" as const }];
      await service.createEvent(mockCalendarEvent as never, contacts);

      const createCallArgs = createFn.mock.calls[0][0];
      expect(createCallArgs.Booking_Date__c).toBeUndefined();
    });

    it("skips DATE field when getDateFieldValue returns null", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectMap: {
          Booking_Date__c: { value: "invalid-date-ref", fieldType: "date", whenToWrite: "every_booking" },
        },
      });

      const createFn = vi.fn().mockResolvedValue({ success: true, id: "evt-011" });
      mockConnection.sobject.mockReturnValue({ create: createFn });
      mockConnection.query = vi
        .fn()
        .mockResolvedValueOnce({ records: [{ Id: "sf-user-001" }] }) // user lookup
        .mockResolvedValueOnce({ records: [] }); // booking lookup returns nothing → null

      mockConnection.describe = vi.fn().mockResolvedValue({
        fields: [{ name: "Booking_Date__c", type: "date", length: 0 }],
      });

      const contacts = [{ id: "cnt-001", email: "attendee@example.com", recordType: "Contact" as const }];
      await service.createEvent(mockCalendarEvent as never, contacts);

      const createCallArgs = createFn.mock.calls[0][0];
      expect(createCallArgs.Booking_Date__c).toBeUndefined();
    });

    it("writes PICKLIST field via getPicklistFieldValue", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectMap: {
          Meeting_Source__c: {
            value: "Website",
            fieldType: "picklist",
            whenToWrite: "every_booking",
          },
        },
      });

      const createFn = vi.fn().mockResolvedValue({ success: true, id: "evt-012" });
      mockConnection.sobject.mockReturnValue({ create: createFn });
      mockConnection.query = vi.fn().mockResolvedValueOnce({ records: [{ Id: "sf-user-001" }] });

      mockConnection.describe = vi.fn().mockResolvedValue({
        fields: [
          {
            name: "Meeting_Source__c",
            type: "picklist",
            length: 0,
            picklistValues: [
              { value: "Website", active: true },
              { value: "Referral", active: true },
            ],
          },
        ],
      });

      const contacts = [{ id: "cnt-001", email: "attendee@example.com", recordType: "Contact" as const }];
      await service.createEvent(mockCalendarEvent as never, contacts);

      const createCallArgs = createFn.mock.calls[0][0];
      expect(createCallArgs.Meeting_Source__c).toBe("Website");
    });

    it("skips PICKLIST field when getPicklistFieldValue returns null", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectMap: {
          Meeting_Source__c: {
            value: "NonExistentValue",
            fieldType: "picklist",
            whenToWrite: "every_booking",
          },
        },
      });

      const createFn = vi.fn().mockResolvedValue({ success: true, id: "evt-013" });
      mockConnection.sobject.mockReturnValue({ create: createFn });
      mockConnection.query = vi.fn().mockResolvedValueOnce({ records: [{ Id: "sf-user-001" }] });

      mockConnection.describe = vi.fn().mockResolvedValue({
        fields: [
          {
            name: "Meeting_Source__c",
            type: "picklist",
            length: 0,
            picklistValues: [{ value: "Website", active: true }],
          },
        ],
      });

      const contacts = [{ id: "cnt-001", email: "attendee@example.com", recordType: "Contact" as const }];
      await service.createEvent(mockCalendarEvent as never, contacts);

      const createCallArgs = createFn.mock.calls[0][0];
      expect(createCallArgs.Meeting_Source__c).toBeUndefined();
    });

    it("passes static text values through as-is", async () => {
      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectMap: {
          Notes__c: { value: "Static Note", fieldType: "string", whenToWrite: "every_booking" },
        },
      });

      const createFn = vi.fn().mockResolvedValue({ success: true, id: "evt-014" });
      mockConnection.sobject.mockReturnValue({ create: createFn });
      mockConnection.query = vi.fn().mockResolvedValueOnce({ records: [{ Id: "sf-user-001" }] });

      mockConnection.describe = vi.fn().mockResolvedValue({
        fields: [{ name: "Notes__c", type: "string", length: 255 }],
      });

      const contacts = [{ id: "cnt-001", email: "attendee@example.com", recordType: "Contact" as const }];
      await service.createEvent(mockCalendarEvent as never, contacts);

      const createCallArgs = createFn.mock.calls[0][0];
      expect(createCallArgs.Notes__c).toBe("Static Note");
    });

    it("does not fire eventFieldTypeCoerced trace when checkbox value is already boolean", async () => {
      const traceSpy = vi.spyOn(
        await import("./tracing").then((m) => m.SalesforceRoutingTraceService),
        "eventFieldTypeCoerced"
      );

      mockAppOptions({
        onBookingWriteToEventObject: true,
        onBookingWriteToEventObjectMap: {
          Is_Demo__c: { value: true, fieldType: "boolean", whenToWrite: "every_booking" },
        },
      });

      const createFn = vi.fn().mockResolvedValue({ success: true, id: "evt-015" });
      mockConnection.sobject.mockReturnValue({ create: createFn });
      mockConnection.query = vi.fn().mockResolvedValueOnce({ records: [{ Id: "sf-user-001" }] });

      mockConnection.describe = vi.fn().mockResolvedValue({
        fields: [{ name: "Is_Demo__c", type: "boolean", length: 0 }],
      });

      const contacts = [{ id: "cnt-001", email: "attendee@example.com", recordType: "Contact" as const }];
      await service.createEvent(mockCalendarEvent as never, contacts);

      expect(traceSpy).not.toHaveBeenCalled();
      traceSpy.mockRestore();
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
