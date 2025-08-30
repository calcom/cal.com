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
