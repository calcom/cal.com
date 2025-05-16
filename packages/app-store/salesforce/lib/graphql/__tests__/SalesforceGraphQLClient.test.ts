import { describe, it, vi, expect, beforeEach } from "vitest";

import { SalesforceRecordEnum } from "../../enums";
import { SalesforceGraphQLClient } from "../SalesforceGraphQLClient";
import {
  mockValueOfAccountOwnershipQueryMatchingContact,
  mockValueOfAccountOwnershipQueryMatchingAccountWebsite,
  mockValueOfAccountOwnershipQueryMatchingRelatedContacts,
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
});
