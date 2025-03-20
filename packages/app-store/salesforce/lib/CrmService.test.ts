import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, expect, it, beforeEach, vi } from "vitest";
import type { z } from "zod";

import type { CredentialPayload } from "@calcom/types/Credential";

import type { appDataSchema } from "../zod";
import SalesforceCRMService from "./CrmService";
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

const ownerQueryResponse = {
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

describe("SalesforceCRMService", () => {
  let service: SalesforceCRMService;
  let mockConnection: { query: any; sobject: any };

  setupAndTeardown();

  beforeEach(() => {
    mockConnection = {
      query: vi.fn(),
      sobject: vi.fn(),
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
    };

    service = new SalesforceCRMService(mockCredential, {}, true);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
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
          "SELECT Id, Email, OwnerId, AccountId, Account.Owner.Email, Account.Website FROM Contact WHERE Email = 'test@example.com' AND AccountId != null"
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
          "SELECT Id, Email, OwnerId, AccountId, Account.Owner.Email, Account.Website FROM Contact WHERE Email = 'test@example.com' AND AccountId != null"
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
        const querySpy = vi.spyOn(mockConnection, "query");
        querySpy
          .mockResolvedValueOnce(contactUnderAccountQueryResponse)
          .mockResolvedValueOnce(accountQueryResponse)
          .mockResolvedValueOnce(ownerQueryResponse);

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

        expect(querySpy).toHaveBeenNthCalledWith(
          1,
          "SELECT Id, Email, OwnerId, AccountId, Account.Owner.Email, Account.Website FROM Contact WHERE Email = 'test@example.com' AND AccountId != null"
        );
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
        it("attendee has no account", async () => {
          mockAppOptions({
            createNewContactUnderAccount: true,
            createEventOn: SalesforceRecordEnum.LEAD,
          });

          const querySpy = vi.spyOn(mockConnection, "query");
          querySpy.mockResolvedValueOnce({ records: [] });
          querySpy.mockResolvedValueOnce({ records: [] });

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
});
