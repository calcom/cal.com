export const generateMockResponse = (children: any) => {
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

export const mockValueOfAccountOwnershipQueryMatchingContact = () => {
  return generateMockResponse({
    Contact: {
      edges: [
        {
          node: {
            Id: "contactId",
            Email: {
              value: "contact@email.com",
            },
            AccountId: {
              value: "accountId",
            },
            Account: {
              Owner: {
                Id: "ownerId",
                Email: {
                  value: "owner@test.com",
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
                value: "owner@test.com",
              },
            },
          },
        },
      ],
    },
  });
};

export const mockValueOfAccountOwnershipQueryMatchingAccountWebsite = () => {
  return generateMockResponse({
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
                value: "owner@test.com",
              },
            },
          },
        },
      ],
    },
  });
};

export const mockValueOfAccountOwnershipQueryMatchingRelatedContacts = () => {
  return generateMockResponse({
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
                  value: "owner1@test.com",
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
                  value: "owner2@test.com",
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
                  value: "owner2@test.com",
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
                  value: "owner1@test.com",
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
                  value: "owner1@test.com",
                },
              },
            },
          },
        },
      ],
    },
  });
};

/**
 * Contact tier: contact's account has a field rule field (Industry).
 */
export const mockValueOfContactWithFieldRuleFields = (industry: string) => {
  return generateMockResponse({
    Contact: {
      edges: [
        {
          node: {
            Id: "contactId",
            Email: { value: "contact@email.com" },
            AccountId: { value: "accountId" },
            Account: {
              Owner: { Id: "ownerId", Email: { value: "owner@test.com" } },
              Industry: { value: industry },
            },
          },
        },
      ],
    },
    Account: { edges: [] },
  });
};

/**
 * Contact tier: two contacts, first account fails field rules, second passes.
 */
export const mockValueOfMultipleContactsWithFieldRuleFields = () => {
  return generateMockResponse({
    Contact: {
      edges: [
        {
          node: {
            Id: "contactId1",
            Email: { value: "contact1@email.com" },
            AccountId: { value: "accountId1" },
            Account: {
              Owner: { Id: "ownerId1", Email: { value: "owner1@test.com" } },
              Industry: { value: "Finance" },
            },
          },
        },
        {
          node: {
            Id: "contactId2",
            Email: { value: "contact2@email.com" },
            AccountId: { value: "accountId2" },
            Account: {
              Owner: { Id: "ownerId2", Email: { value: "owner2@test.com" } },
              Industry: { value: "Technology" },
            },
          },
        },
      ],
    },
    Account: { edges: [] },
  });
};

/**
 * Account tier: account with a field rule field (Industry).
 */
export const mockValueOfAccountWithFieldRuleFields = (industry: string) => {
  return generateMockResponse({
    Contact: { edges: [] },
    Account: {
      edges: [
        {
          node: {
            Id: "accountId",
            Owner: { Id: "ownerId", Email: { value: "owner@test.com" } },
            Industry: { value: industry },
          },
        },
      ],
    },
  });
};

/**
 * Account tier: two accounts, first fails field rules, second passes.
 */
export const mockValueOfMultipleAccountsWithFieldRuleFields = () => {
  return generateMockResponse({
    Contact: { edges: [] },
    Account: {
      edges: [
        {
          node: {
            Id: "accountId1",
            Owner: { Id: "ownerId1", Email: { value: "owner1@test.com" } },
            Industry: { value: "Finance" },
          },
        },
        {
          node: {
            Id: "accountId2",
            Owner: { Id: "ownerId2", Email: { value: "owner2@test.com" } },
            Industry: { value: "Technology" },
          },
        },
      ],
    },
  });
};

/**
 * Related contacts tier: contacts across two accounts with field rule fields.
 * accountId1 has 3 contacts (dominant), accountId2 has 2 contacts.
 */
export const mockValueOfRelatedContactsWithFieldRuleFields = () => {
  return generateMockResponse({
    Contact: { edges: [] },
    Account: { edges: [] },
    relatedContacts: {
      edges: [
        {
          node: {
            Id: "contact1",
            AccountId: { value: "accountId1" },
            Account: {
              Id: "accountId1",
              Owner: { Id: "owner1", Email: { value: "owner1@test.com" } },
              Industry: { value: "Finance" },
            },
          },
        },
        {
          node: {
            Id: "contact2",
            AccountId: { value: "accountId1" },
            Account: {
              Id: "accountId1",
              Owner: { Id: "owner1", Email: { value: "owner1@test.com" } },
              Industry: { value: "Finance" },
            },
          },
        },
        {
          node: {
            Id: "contact3",
            AccountId: { value: "accountId1" },
            Account: {
              Id: "accountId1",
              Owner: { Id: "owner1", Email: { value: "owner1@test.com" } },
              Industry: { value: "Finance" },
            },
          },
        },
        {
          node: {
            Id: "contact4",
            AccountId: { value: "accountId2" },
            Account: {
              Id: "accountId2",
              Owner: { Id: "owner2", Email: { value: "owner2@test.com" } },
              Industry: { value: "Technology" },
            },
          },
        },
        {
          node: {
            Id: "contact5",
            AccountId: { value: "accountId2" },
            Account: {
              Id: "accountId2",
              Owner: { Id: "owner2", Email: { value: "owner2@test.com" } },
              Industry: { value: "Technology" },
            },
          },
        },
      ],
    },
  });
};
