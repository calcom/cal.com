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
                value: "ownerEmail",
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
  });
};
