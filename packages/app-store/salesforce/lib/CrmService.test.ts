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

  describe("fuzzyMatchAccountByDomain (enable-fuzzy-domain-matching feature flag)", () => {
    it("cross-TLD match: acme.co.uk email matches acme.com account", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
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
      await expect(
        service.createContacts([{ name: "Test", email: "user@acme.com" }])
      ).resolves.toBeDefined();
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
      // Only 4 queries — step 4 fuzzy never fires because step 3 found a match
      expect(querySpy).toHaveBeenCalledTimes(4);
    });

    it("all 4 steps run when each prior step misses (full waterfall)", async () => {
      mockAppOptions({
        createNewContactUnderAccount: true,
        createEventOn: SalesforceRecordEnum.LEAD,
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
            picklistValues: [{ value: "Website", active: true }, { value: "Referral", active: true }],
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
