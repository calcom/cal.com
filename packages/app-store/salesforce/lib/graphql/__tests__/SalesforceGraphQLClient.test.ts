import { describe, it, vi, expect, beforeEach } from "vitest";

import { RRSkipFieldRuleActionEnum } from "../../../zod";
import type { RRSkipFieldRule } from "../../../zod";
import { SalesforceRecordEnum } from "../../enums";
import { SalesforceGraphQLClient } from "../SalesforceGraphQLClient";
import {
  mockValueOfAccountOwnershipQueryMatchingContact,
  mockValueOfAccountOwnershipQueryMatchingAccountWebsite,
  mockValueOfAccountOwnershipQueryMatchingRelatedContacts,
  mockValueOfContactWithFieldRuleFields,
  mockValueOfMultipleContactsWithFieldRuleFields,
  mockValueOfAccountWithFieldRuleFields,
  mockValueOfMultipleAccountsWithFieldRuleFields,
  mockValueOfRelatedContactsWithFieldRuleFields,
} from "./urqlMock";

const mockUrqlQuery = vi.fn();

vi.mock("@urql/core", () => ({
  Client: class {
    query = mockUrqlQuery;
  },
  cacheExchange: vi.fn(),
  fetchExchange: vi.fn(),
}));

describe("SalesforceGraphQLClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the account owner if a contact exists", async () => {
    mockUrqlQuery.mockResolvedValue(mockValueOfAccountOwnershipQueryMatchingContact());

    const client = new SalesforceGraphQLClient({ accessToken: "", instanceUrl: "" });

    const owner = await client.GetAccountRecordsForRRSkip("test@example.com");

    expect(owner).toEqual([
      {
        id: "accountId",
        email: "contact@email.com",
        ownerId: "ownerId",
        ownerEmail: "owner@test.com",
        recordType: SalesforceRecordEnum.ACCOUNT,
      },
    ]);
  });

  it("should return the account owner if email domain matches account website", async () => {
    mockUrqlQuery.mockResolvedValue(mockValueOfAccountOwnershipQueryMatchingAccountWebsite());

    const client = new SalesforceGraphQLClient({ accessToken: "", instanceUrl: "" });

    const owner = await client.GetAccountRecordsForRRSkip("test@example.com");

    expect(owner).toEqual([
      {
        id: "accountId",
        email: "",
        ownerId: "ownerId",
        ownerEmail: "owner@test.com",
        recordType: SalesforceRecordEnum.ACCOUNT,
      },
    ]);
  });

  it("should return the account owner based on related contacts", async () => {
    mockUrqlQuery.mockResolvedValue(mockValueOfAccountOwnershipQueryMatchingRelatedContacts());

    const client = new SalesforceGraphQLClient({ accessToken: "", instanceUrl: "" });

    const owner = await client.GetAccountRecordsForRRSkip("test@example.com");

    expect(owner).toEqual([
      {
        id: "accountId1",
        email: "",
        ownerId: "owner1",
        ownerEmail: "owner1@test.com",
        recordType: SalesforceRecordEnum.ACCOUNT,
      },
    ]);
  });

  describe("with field rules", () => {
    const ignoreFinanceRule: RRSkipFieldRule[] = [
      { field: "Industry", value: "Finance", action: RRSkipFieldRuleActionEnum.IGNORE },
    ];

    const mustIncludeTechRule: RRSkipFieldRule[] = [
      { field: "Industry", value: "Technology", action: RRSkipFieldRuleActionEnum.MUST_INCLUDE },
    ];

    describe("contact tier", () => {
      it("should return contact when account passes ignore rule", async () => {
        mockUrqlQuery.mockResolvedValue(mockValueOfContactWithFieldRuleFields("Technology"));

        const client = new SalesforceGraphQLClient({ accessToken: "", instanceUrl: "" });
        const result = await client.GetAccountRecordsForRRSkip("test@example.com", ignoreFinanceRule);

        expect(result).toEqual([
          {
            id: "accountId",
            email: "contact@email.com",
            ownerId: "ownerId",
            ownerEmail: "owner@test.com",
            recordType: SalesforceRecordEnum.ACCOUNT,
          },
        ]);
      });

      it("should filter out contact when account matches ignore rule", async () => {
        mockUrqlQuery.mockResolvedValue(mockValueOfContactWithFieldRuleFields("Finance"));

        const client = new SalesforceGraphQLClient({ accessToken: "", instanceUrl: "" });
        const result = await client.GetAccountRecordsForRRSkip("test@example.com", ignoreFinanceRule);

        expect(result).toEqual([]);
      });

      it("should return contact when account matches must_include rule", async () => {
        mockUrqlQuery.mockResolvedValue(mockValueOfContactWithFieldRuleFields("Technology"));

        const client = new SalesforceGraphQLClient({ accessToken: "", instanceUrl: "" });
        const result = await client.GetAccountRecordsForRRSkip("test@example.com", mustIncludeTechRule);

        expect(result).toEqual([
          {
            id: "accountId",
            email: "contact@email.com",
            ownerId: "ownerId",
            ownerEmail: "owner@test.com",
            recordType: SalesforceRecordEnum.ACCOUNT,
          },
        ]);
      });

      it("should filter out contact when account fails must_include rule", async () => {
        mockUrqlQuery.mockResolvedValue(mockValueOfContactWithFieldRuleFields("Healthcare"));

        const client = new SalesforceGraphQLClient({ accessToken: "", instanceUrl: "" });
        const result = await client.GetAccountRecordsForRRSkip("test@example.com", mustIncludeTechRule);

        expect(result).toEqual([]);
      });

      it("should skip to next contact when first contact's account is filtered", async () => {
        mockUrqlQuery.mockResolvedValue(mockValueOfMultipleContactsWithFieldRuleFields());

        const client = new SalesforceGraphQLClient({ accessToken: "", instanceUrl: "" });
        const result = await client.GetAccountRecordsForRRSkip("test@example.com", ignoreFinanceRule);

        expect(result).toEqual([
          {
            id: "accountId2",
            email: "contact2@email.com",
            ownerId: "ownerId2",
            ownerEmail: "owner2@test.com",
            recordType: SalesforceRecordEnum.ACCOUNT,
          },
        ]);
      });
    });

    describe("account tier", () => {
      it("should return account when it passes ignore rule", async () => {
        mockUrqlQuery.mockResolvedValue(mockValueOfAccountWithFieldRuleFields("Technology"));

        const client = new SalesforceGraphQLClient({ accessToken: "", instanceUrl: "" });
        const result = await client.GetAccountRecordsForRRSkip("test@example.com", ignoreFinanceRule);

        expect(result).toEqual([
          {
            id: "accountId",
            email: "",
            ownerId: "ownerId",
            ownerEmail: "owner@test.com",
            recordType: SalesforceRecordEnum.ACCOUNT,
          },
        ]);
      });

      it("should filter out account matching ignore rule and fall through to next", async () => {
        mockUrqlQuery.mockResolvedValue(mockValueOfMultipleAccountsWithFieldRuleFields());

        const client = new SalesforceGraphQLClient({ accessToken: "", instanceUrl: "" });
        const result = await client.GetAccountRecordsForRRSkip("test@example.com", ignoreFinanceRule);

        expect(result).toEqual([
          {
            id: "accountId2",
            email: "",
            ownerId: "ownerId2",
            ownerEmail: "owner2@test.com",
            recordType: SalesforceRecordEnum.ACCOUNT,
          },
        ]);
      });

      it("should return empty when all accounts fail must_include rule", async () => {
        mockUrqlQuery.mockResolvedValue(mockValueOfAccountWithFieldRuleFields("Healthcare"));

        const client = new SalesforceGraphQLClient({ accessToken: "", instanceUrl: "" });
        const result = await client.GetAccountRecordsForRRSkip("test@example.com", mustIncludeTechRule);

        expect(result).toEqual([]);
      });
    });

    describe("related contacts tier", () => {
      it("should skip dominant account when it fails field rules and use next account", async () => {
        // accountId1 is dominant (3 contacts) but has Industry=Finance
        // accountId2 (2 contacts) has Industry=Technology
        mockUrqlQuery.mockResolvedValue(mockValueOfRelatedContactsWithFieldRuleFields());

        const client = new SalesforceGraphQLClient({ accessToken: "", instanceUrl: "" });
        const result = await client.GetAccountRecordsForRRSkip("test@example.com", ignoreFinanceRule);

        expect(result).toEqual([
          {
            id: "accountId2",
            email: "",
            ownerId: "owner2",
            ownerEmail: "owner2@test.com",
            recordType: SalesforceRecordEnum.ACCOUNT,
          },
        ]);
      });

      it("should return dominant account when it passes must_include rule", async () => {
        mockUrqlQuery.mockResolvedValue(mockValueOfRelatedContactsWithFieldRuleFields());

        const client = new SalesforceGraphQLClient({ accessToken: "", instanceUrl: "" });
        const result = await client.GetAccountRecordsForRRSkip("test@example.com", [
          { field: "Industry", value: "Finance", action: RRSkipFieldRuleActionEnum.MUST_INCLUDE },
        ]);

        expect(result).toEqual([
          {
            id: "accountId1",
            email: "",
            ownerId: "owner1",
            ownerEmail: "owner1@test.com",
            recordType: SalesforceRecordEnum.ACCOUNT,
          },
        ]);
      });

      it("should return empty when all accounts fail field rules", async () => {
        mockUrqlQuery.mockResolvedValue(mockValueOfRelatedContactsWithFieldRuleFields());

        const client = new SalesforceGraphQLClient({ accessToken: "", instanceUrl: "" });
        const result = await client.GetAccountRecordsForRRSkip("test@example.com", [
          { field: "Industry", value: "Healthcare", action: RRSkipFieldRuleActionEnum.MUST_INCLUDE },
        ]);

        expect(result).toEqual([]);
      });
    });

    it("should be case-insensitive when evaluating field rules", async () => {
      mockUrqlQuery.mockResolvedValue(mockValueOfContactWithFieldRuleFields("TECHNOLOGY"));

      const client = new SalesforceGraphQLClient({ accessToken: "", instanceUrl: "" });
      const result = await client.GetAccountRecordsForRRSkip("test@example.com", [
        { field: "Industry", value: "technology", action: RRSkipFieldRuleActionEnum.MUST_INCLUDE },
      ]);

      expect(result).toEqual([
        {
          id: "accountId",
          email: "contact@email.com",
          ownerId: "ownerId",
          ownerEmail: "owner@test.com",
          recordType: SalesforceRecordEnum.ACCOUNT,
        },
      ]);
    });

    it("should use dynamic query when field rules are provided", async () => {
      mockUrqlQuery.mockResolvedValue(mockValueOfContactWithFieldRuleFields("Technology"));

      const client = new SalesforceGraphQLClient({ accessToken: "", instanceUrl: "" });
      await client.GetAccountRecordsForRRSkip("test@example.com", mustIncludeTechRule);

      // When field rules are present, the query document should be a string (dynamic query)
      // rather than the static typed document
      const queryArg = mockUrqlQuery.mock.calls[0][0];
      expect(typeof queryArg).toBe("string");
      expect(queryArg).toContain("Industry { value }");
    });
  });
});
