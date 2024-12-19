import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, expect, it, beforeEach, vi } from "vitest";

import type { CredentialPayload } from "@calcom/types/Credential";

import SalesforceCRMService from "./CrmService";
import { SalesforceRecordEnum } from "./enums";

describe("SalesforceCRMService", () => {
  let service: SalesforceCRMService;
  let mockConnection: { query: any };

  setupAndTeardown();

  beforeEach(() => {
    mockConnection = {
      query: vi.fn(),
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

  describe("getContacts", () => {
    it("should return empty array when no records found", async () => {
      // Setup mock response
      mockConnection.query.mockResolvedValueOnce({ records: [] });

      const result = await service.getContacts({ emails: "test@example.com" });

      expect(result).toEqual([]);
      expect(mockConnection.query).toHaveBeenCalledWith(
        "SELECT Id, Email, OwnerId FROM Contact WHERE Email IN ('test@example.com')"
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
        "SELECT Id, Email, OwnerId FROM Contact WHERE Email IN ('test@example.com')"
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
        "SELECT Id, Email, OwnerId FROM Contact WHERE Email IN ('test1@example.com','test2@example.com')"
      );
    });

    it("should include owner information when includeOwner is true", async () => {
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

      const ownerQueryResponse = {
        records: [
          {
            Id: "owner001",
            Email: "owner@example.com",
            Name: "Test Owner",
          },
        ],
      };

      // Setup query spy with specific responses
      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy
        .mockResolvedValueOnce(contactQueryResponse) // Contact query
        .mockResolvedValueOnce(ownerQueryResponse); // Owner query

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
        "SELECT Id, Email, OwnerId FROM Contact WHERE Email IN ('test@example.com')"
      );
      expect(querySpy).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("SELECT Id, Email, Name FROM User WHERE Id = 'owner001'")
      );
    });

    it("should handle account record type with round robin skip", async () => {
      service = new SalesforceCRMService(
        {} as CredentialPayload,
        {
          createEventOn: SalesforceRecordEnum.ACCOUNT,
          roundRobinSkipCheckRecordOn: SalesforceRecordEnum.ACCOUNT,
        },
        true
      );
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      service.conn = Promise.resolve(mockConnection);

      const initialContactQueryResponse = {
        records: [
          {
            Id: "001",
            Email: "test@example.com",
            AccountId: "acc001",
            OwnerId: "owner001",
            attributes: { type: "Contact" },
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

      const ownerQueryResponse = {
        records: [
          {
            Id: "owner001",
            Email: "owner@example.com",
            Name: "Test Owner",
          },
        ],
      };

      const querySpy = vi.spyOn(mockConnection, "query");
      querySpy
        .mockResolvedValueOnce(initialContactQueryResponse)
        .mockResolvedValueOnce(accountQueryResponse)
        .mockResolvedValueOnce(ownerQueryResponse);

      const result = await service.getContacts({
        emails: "test@example.com",
        forRoundRobinSkip: true,
        includeOwner: true,
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
        "SELECT Id, Email, OwnerId, AccountId FROM Contact WHERE Email = 'test@example.com' AND AccountId != null"
      );
      expect(querySpy).toHaveBeenNthCalledWith(2, "SELECT Id, OwnerId FROM Account WHERE Id = 'acc001'");
      expect(querySpy).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining("SELECT Id, Email, Name FROM User WHERE Id = 'owner001'")
      );
    });
  });
});
