/* eslint-disable */
// import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";

import * as types from "./types";

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
  "\n  query GetAccountRecordsForRRSkip($email: Email!, $websites: [Url!]!, $emailDomain: Email!) {\n    uiapi {\n      query {\n        Contact(where: { Email: { eq: $email } }) {\n          edges {\n            node {\n              Id\n              Email {\n                value\n              }\n              OwnerId {\n                value\n              }\n              AccountId {\n                value\n              }\n              Account {\n                Website {\n                  value\n                }\n                Owner {\n                  Id\n                  Email {\n                    value\n                  }\n                }\n              }\n            }\n          }\n        }\n        Account(where: { Website: { in: $websites } }) {\n          edges {\n            node {\n              Id\n              Website {\n                value\n              }\n              Owner {\n                Id\n                Email {\n                  value\n                }\n              }\n            }\n          }\n        }\n        relatedContacts: Contact(\n          where: {\n            and: [{ Email: { like: $emailDomain } }, { Email: { ne: $email } }, { AccountId: { ne: null } }]\n          }\n        ) {\n          edges {\n            node {\n              Id\n              Email {\n                value\n              }\n              AccountId {\n                value\n              }\n              Account {\n                Id\n                Owner {\n                  Id\n                  Email {\n                    value\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n": typeof types.GetAccountRecordsForRrSkipDocument;
};
const documents: Documents = {
  "\n  query GetAccountRecordsForRRSkip($email: Email!, $websites: [Url!]!, $emailDomain: Email!) {\n    uiapi {\n      query {\n        Contact(where: { Email: { eq: $email } }) {\n          edges {\n            node {\n              Id\n              Email {\n                value\n              }\n              OwnerId {\n                value\n              }\n              AccountId {\n                value\n              }\n              Account {\n                Website {\n                  value\n                }\n                Owner {\n                  Id\n                  Email {\n                    value\n                  }\n                }\n              }\n            }\n          }\n        }\n        Account(where: { Website: { in: $websites } }) {\n          edges {\n            node {\n              Id\n              Website {\n                value\n              }\n              Owner {\n                Id\n                Email {\n                  value\n                }\n              }\n            }\n          }\n        }\n        relatedContacts: Contact(\n          where: {\n            and: [{ Email: { like: $emailDomain } }, { Email: { ne: $email } }, { AccountId: { ne: null } }]\n          }\n        ) {\n          edges {\n            node {\n              Id\n              Email {\n                value\n              }\n              AccountId {\n                value\n              }\n              Account {\n                Id\n                Owner {\n                  Id\n                  Email {\n                    value\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n":
    types.GetAccountRecordsForRrSkipDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  query GetAccountRecordsForRRSkip($email: Email!, $websites: [Url!]!, $emailDomain: Email!) {\n    uiapi {\n      query {\n        Contact(where: { Email: { eq: $email } }) {\n          edges {\n            node {\n              Id\n              Email {\n                value\n              }\n              OwnerId {\n                value\n              }\n              AccountId {\n                value\n              }\n              Account {\n                Website {\n                  value\n                }\n                Owner {\n                  Id\n                  Email {\n                    value\n                  }\n                }\n              }\n            }\n          }\n        }\n        Account(where: { Website: { in: $websites } }) {\n          edges {\n            node {\n              Id\n              Website {\n                value\n              }\n              Owner {\n                Id\n                Email {\n                  value\n                }\n              }\n            }\n          }\n        }\n        relatedContacts: Contact(\n          where: {\n            and: [{ Email: { like: $emailDomain } }, { Email: { ne: $email } }, { AccountId: { ne: null } }]\n          }\n        ) {\n          edges {\n            node {\n              Id\n              Email {\n                value\n              }\n              AccountId {\n                value\n              }\n              Account {\n                Id\n                Owner {\n                  Id\n                  Email {\n                    value\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n"
): (typeof documents)["\n  query GetAccountRecordsForRRSkip($email: Email!, $websites: [Url!]!, $emailDomain: Email!) {\n    uiapi {\n      query {\n        Contact(where: { Email: { eq: $email } }) {\n          edges {\n            node {\n              Id\n              Email {\n                value\n              }\n              OwnerId {\n                value\n              }\n              AccountId {\n                value\n              }\n              Account {\n                Website {\n                  value\n                }\n                Owner {\n                  Id\n                  Email {\n                    value\n                  }\n                }\n              }\n            }\n          }\n        }\n        Account(where: { Website: { in: $websites } }) {\n          edges {\n            node {\n              Id\n              Website {\n                value\n              }\n              Owner {\n                Id\n                Email {\n                  value\n                }\n              }\n            }\n          }\n        }\n        relatedContacts: Contact(\n          where: {\n            and: [{ Email: { like: $emailDomain } }, { Email: { ne: $email } }, { AccountId: { ne: null } }]\n          }\n        ) {\n          edges {\n            node {\n              Id\n              Email {\n                value\n              }\n              AccountId {\n                value\n              }\n              Account {\n                Id\n                Owner {\n                  Id\n                  Email {\n                    value\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> =
  TDocumentNode extends DocumentNode<infer TType, any> ? TType : never;
