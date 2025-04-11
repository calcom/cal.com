import { describe, it, vi, expect, beforeEach } from "vitest";

import { SalesforceRecordEnum } from "../../enums";
import { SalesforceGraphQLClient } from "../SalesforceGraphQLClient";

const generateMockResponse = (children: any) => {
  return {
    data: {
      uiapi: {
        query: {
          ...children,
        },
      },
    },
  };
};

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
    mockUrqlQuery.mockResolvedValue(
      generateMockResponse({
        Contact: {
          edges: [
            {
              node: {
                Id: "contactId",
                Account: {
                  Owner: {
                    Id: "ownerId",
                    Email: {
                      value: "ownerEmail",
                    },
                  },
                },
              },
            },
          ],
        },
        // This shouldn't be hit
        Account: {
          edges: [
            {
              node: {
                Id: "accountId",
                Owner: {
                  Id: "ownerId",
                  Email: {
                    value: "ownerEmail",
                  },
                },
              },
            },
          ],
        },
      })
    );

    const client = new SalesforceGraphQLClient({ accessToken: "", instanceUrl: "" });

    const owner = await client.GetAccountRecordsForRRSkip("test@example.com");

    expect(owner).toEqual([
      {
        id: "contactId",
        email: "",
        ownerId: "ownerId",
        ownerEmail: "ownerEmail",
        recordType: SalesforceRecordEnum.ACCOUNT,
      },
    ]);
  });

  it("should return the account owner if email domain matches account website", async () => {
    mockUrqlQuery.mockResolvedValue(
      generateMockResponse({
        Contact: {
          edges: [],
        },
        Account: {
          edges: [
            {
              node: {
                Id: "accountId",
                Owner: {
                  Id: "ownerId",
                  Email: {
                    value: "ownerEmail",
                  },
                },
              },
            },
          ],
        },
      })
    );

    const client = new SalesforceGraphQLClient({ accessToken: "", instanceUrl: "" });

    const owner = await client.GetAccountRecordsForRRSkip("test@example.com");

    expect(owner).toEqual([
      {
        id: "accountId",
        email: "",
        ownerId: "ownerId",
        ownerEmail: "ownerEmail",
        recordType: SalesforceRecordEnum.ACCOUNT,
      },
    ]);
  });

  it("should return the account owner based on related contacts", async () => {
    mockUrqlQuery.mockResolvedValue(
      generateMockResponse({
        Contact: {
          edges: [],
        },
        Account: {
          edges: [],
        },
        relatedContacts: {
          edges: [
            {
              node: {
                Id: "contact1",
                AccountId: {
                  value: "accountId1",
                },
                Account: {
                  Owner: {
                    Id: "owner1",
                    Email: {
                      value: "owner1Email",
                    },
                  },
                },
              },
            },
            {
              node: {
                Id: "contact2",
                AccountId: {
                  value: "accountId2",
                },
                Account: {
                  Owner: {
                    Id: "owner2",
                    Email: {
                      value: "owner2Email",
                    },
                  },
                },
              },
            },
            {
              node: {
                Id: "contact3",
                AccountId: {
                  value: "accountId2",
                },
                Account: {
                  Owner: {
                    Id: "owner2",
                    Email: {
                      value: "owner2Email",
                    },
                  },
                },
              },
            },
            {
              node: {
                Id: "contact4",
                AccountId: {
                  value: "accountId1",
                },
                Account: {
                  Owner: {
                    Id: "owner1",
                    Email: {
                      value: "owner1Email",
                    },
                  },
                },
              },
            },
            {
              node: {
                Id: "contact5",
                AccountId: {
                  value: "accountId1",
                },
                Account: {
                  Owner: {
                    Id: "owner1",
                    Email: {
                      value: "owner1Email",
                    },
                  },
                },
              },
            },
          ],
        },
      })
    );

    const client = new SalesforceGraphQLClient({ accessToken: "", instanceUrl: "" });

    const owner = await client.GetAccountRecordsForRRSkip("test@example.com");

    expect(owner).toEqual([
      {
        id: "accountId1",
        email: "",
        ownerId: "owner1",
        ownerEmail: "owner1Email",
        recordType: SalesforceRecordEnum.ACCOUNT,
      },
    ]);
  });
});
