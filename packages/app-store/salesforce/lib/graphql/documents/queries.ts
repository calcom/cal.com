import { graphql } from "../../../src/gql/gql";

export const GetAccountRecordsForRRSkip = graphql(`
  query GetAccountRecordsForRRSkip($email: Email!, $websites: [Url!]!, $emailDomain: Email!) {
    uiapi {
      query {
        Contact(where: { Email: { eq: $email } }) {
          edges {
            node {
              Id
              Email {
                value
              }
              OwnerId {
                value
              }
              AccountId {
                value
              }
              Account {
                Website {
                  value
                }
                Owner {
                  Id
                  Email {
                    value
                  }
                }
              }
            }
          }
        }
        Account(where: { Website: { in: $websites } }) {
          edges {
            node {
              Id
              Website {
                value
              }
              Owner {
                Id
                Email {
                  value
                }
              }
            }
          }
        }
        relatedContacts: Contact(
          where: {
            and: [{ Email: { like: $emailDomain } }, { Email: { ne: $email } }, { AccountId: { ne: null } }]
          }
        ) {
          edges {
            node {
              Id
              Email {
                value
              }
              AccountId {
                value
              }
              Account {
                Id
                Owner {
                  Id
                  Email {
                    value
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`);
