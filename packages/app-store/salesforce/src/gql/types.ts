import type { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";

export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  Base64: { input: any; output: any };
  Currency: { input: any; output: any };
  Date: { input: any; output: any };
  DateTime: { input: any; output: any };
  Double: { input: any; output: any };
  Email: { input: any; output: any };
  EncryptedString: { input: any; output: any };
  /** Can be set to an ID or a Reference to the result of another mutation operation. */
  IdOrRef: { input: any; output: any };
  JSON: { input: any; output: any };
  Latitude: { input: any; output: any };
  /** Long type */
  Long: { input: any; output: any };
  LongTextArea: { input: any; output: any };
  Longitude: { input: any; output: any };
  MultiPicklist: { input: any; output: any };
  Percent: { input: any; output: any };
  PhoneNumber: { input: any; output: any };
  Picklist: { input: any; output: any };
  RichTextArea: { input: any; output: any };
  TextArea: { input: any; output: any };
  Time: { input: any; output: any };
  Url: { input: any; output: any };
};

export type GetAccountRecordsForRrSkipQueryVariables = Exact<{
  email: Scalars["Email"]["input"];
  websites: Array<Scalars["Url"]["input"]> | Scalars["Url"]["input"];
  emailDomain: Scalars["Email"]["input"];
}>;
export type GetAccountRecordsForRrSkipQuery = {
  __typename?: "Query";
  uiapi: {
    __typename?: "UIAPI";
    query: {
      __typename?: "RecordQuery";
      Contact?: {
        __typename?: "ContactConnection";
        edges?: Array<{
          __typename?: "ContactEdge";
          node?: {
            __typename?: "Contact";
            Id: string;
            Email?: { __typename?: "EmailValue"; value?: any | null } | null;
            OwnerId?: { __typename?: "IDValue"; value?: string | null } | null;
            AccountId?: { __typename?: "IDValue"; value?: string | null } | null;
            Account?: {
              __typename?: "Account";
              Website?: { __typename?: "UrlValue"; value?: any | null } | null;
              Owner?: {
                __typename?: "User";
                Id: string;
                Email?: { __typename?: "EmailValue"; value?: any | null } | null;
              } | null;
            } | null;
          } | null;
        } | null> | null;
      } | null;
      Account?: {
        __typename?: "AccountConnection";
        edges?: Array<{
          __typename?: "AccountEdge";
          node?: {
            __typename?: "Account";
            Id: string;
            Website?: { __typename?: "UrlValue"; value?: any | null } | null;
            Owner?: {
              __typename?: "User";
              Id: string;
              Email?: { __typename?: "EmailValue"; value?: any | null } | null;
            } | null;
          } | null;
        } | null> | null;
      } | null;
      relatedContacts?: {
        __typename?: "ContactConnection";
        edges?: Array<{
          __typename?: "ContactEdge";
          node?: {
            __typename?: "Contact";
            Id: string;
            Email?: { __typename?: "EmailValue"; value?: any | null } | null;
            AccountId?: { __typename?: "IDValue"; value?: string | null } | null;
            Account?: {
              __typename?: "Account";
              Id: string;
              Owner?: {
                __typename?: "User";
                Id: string;
                Email?: { __typename?: "EmailValue"; value?: any | null } | null;
              } | null;
            } | null;
          } | null;
        } | null> | null;
      } | null;
    };
  };
};
export const GetAccountRecordsForRrSkipDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "GetAccountRecordsForRRSkip" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "email" } },
          type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "Email" } } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "websites" } },
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "Url" } },
              },
            },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "emailDomain" } },
          type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "Email" } } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "uiapi" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "query" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "Contact" },
                        arguments: [
                          {
                            kind: "Argument",
                            name: { kind: "Name", value: "where" },
                            value: {
                              kind: "ObjectValue",
                              fields: [
                                {
                                  kind: "ObjectField",
                                  name: { kind: "Name", value: "Email" },
                                  value: {
                                    kind: "ObjectValue",
                                    fields: [
                                      {
                                        kind: "ObjectField",
                                        name: { kind: "Name", value: "eq" },
                                        value: { kind: "Variable", name: { kind: "Name", value: "email" } },
                                      },
                                    ],
                                  },
                                },
                              ],
                            },
                          },
                        ],
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "edges" },
                              selectionSet: {
                                kind: "SelectionSet",
                                selections: [
                                  {
                                    kind: "Field",
                                    name: { kind: "Name", value: "node" },
                                    selectionSet: {
                                      kind: "SelectionSet",
                                      selections: [
                                        { kind: "Field", name: { kind: "Name", value: "Id" } },
                                        {
                                          kind: "Field",
                                          name: { kind: "Name", value: "Email" },
                                          selectionSet: {
                                            kind: "SelectionSet",
                                            selections: [
                                              { kind: "Field", name: { kind: "Name", value: "value" } },
                                            ],
                                          },
                                        },
                                        {
                                          kind: "Field",
                                          name: { kind: "Name", value: "OwnerId" },
                                          selectionSet: {
                                            kind: "SelectionSet",
                                            selections: [
                                              { kind: "Field", name: { kind: "Name", value: "value" } },
                                            ],
                                          },
                                        },
                                        {
                                          kind: "Field",
                                          name: { kind: "Name", value: "AccountId" },
                                          selectionSet: {
                                            kind: "SelectionSet",
                                            selections: [
                                              { kind: "Field", name: { kind: "Name", value: "value" } },
                                            ],
                                          },
                                        },
                                        {
                                          kind: "Field",
                                          name: { kind: "Name", value: "Account" },
                                          selectionSet: {
                                            kind: "SelectionSet",
                                            selections: [
                                              {
                                                kind: "Field",
                                                name: { kind: "Name", value: "Website" },
                                                selectionSet: {
                                                  kind: "SelectionSet",
                                                  selections: [
                                                    { kind: "Field", name: { kind: "Name", value: "value" } },
                                                  ],
                                                },
                                              },
                                              {
                                                kind: "Field",
                                                name: { kind: "Name", value: "Owner" },
                                                selectionSet: {
                                                  kind: "SelectionSet",
                                                  selections: [
                                                    { kind: "Field", name: { kind: "Name", value: "Id" } },
                                                    {
                                                      kind: "Field",
                                                      name: { kind: "Name", value: "Email" },
                                                      selectionSet: {
                                                        kind: "SelectionSet",
                                                        selections: [
                                                          {
                                                            kind: "Field",
                                                            name: { kind: "Name", value: "value" },
                                                          },
                                                        ],
                                                      },
                                                    },
                                                  ],
                                                },
                                              },
                                            ],
                                          },
                                        },
                                      ],
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "Account" },
                        arguments: [
                          {
                            kind: "Argument",
                            name: { kind: "Name", value: "where" },
                            value: {
                              kind: "ObjectValue",
                              fields: [
                                {
                                  kind: "ObjectField",
                                  name: { kind: "Name", value: "Website" },
                                  value: {
                                    kind: "ObjectValue",
                                    fields: [
                                      {
                                        kind: "ObjectField",
                                        name: { kind: "Name", value: "in" },
                                        value: {
                                          kind: "Variable",
                                          name: { kind: "Name", value: "websites" },
                                        },
                                      },
                                    ],
                                  },
                                },
                              ],
                            },
                          },
                        ],
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "edges" },
                              selectionSet: {
                                kind: "SelectionSet",
                                selections: [
                                  {
                                    kind: "Field",
                                    name: { kind: "Name", value: "node" },
                                    selectionSet: {
                                      kind: "SelectionSet",
                                      selections: [
                                        { kind: "Field", name: { kind: "Name", value: "Id" } },
                                        {
                                          kind: "Field",
                                          name: { kind: "Name", value: "Website" },
                                          selectionSet: {
                                            kind: "SelectionSet",
                                            selections: [
                                              { kind: "Field", name: { kind: "Name", value: "value" } },
                                            ],
                                          },
                                        },
                                        {
                                          kind: "Field",
                                          name: { kind: "Name", value: "Owner" },
                                          selectionSet: {
                                            kind: "SelectionSet",
                                            selections: [
                                              { kind: "Field", name: { kind: "Name", value: "Id" } },
                                              {
                                                kind: "Field",
                                                name: { kind: "Name", value: "Email" },
                                                selectionSet: {
                                                  kind: "SelectionSet",
                                                  selections: [
                                                    { kind: "Field", name: { kind: "Name", value: "value" } },
                                                  ],
                                                },
                                              },
                                            ],
                                          },
                                        },
                                      ],
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        alias: { kind: "Name", value: "relatedContacts" },
                        name: { kind: "Name", value: "Contact" },
                        arguments: [
                          {
                            kind: "Argument",
                            name: { kind: "Name", value: "where" },
                            value: {
                              kind: "ObjectValue",
                              fields: [
                                {
                                  kind: "ObjectField",
                                  name: { kind: "Name", value: "and" },
                                  value: {
                                    kind: "ListValue",
                                    values: [
                                      {
                                        kind: "ObjectValue",
                                        fields: [
                                          {
                                            kind: "ObjectField",
                                            name: { kind: "Name", value: "Email" },
                                            value: {
                                              kind: "ObjectValue",
                                              fields: [
                                                {
                                                  kind: "ObjectField",
                                                  name: { kind: "Name", value: "like" },
                                                  value: {
                                                    kind: "Variable",
                                                    name: { kind: "Name", value: "emailDomain" },
                                                  },
                                                },
                                              ],
                                            },
                                          },
                                        ],
                                      },
                                      {
                                        kind: "ObjectValue",
                                        fields: [
                                          {
                                            kind: "ObjectField",
                                            name: { kind: "Name", value: "Email" },
                                            value: {
                                              kind: "ObjectValue",
                                              fields: [
                                                {
                                                  kind: "ObjectField",
                                                  name: { kind: "Name", value: "ne" },
                                                  value: {
                                                    kind: "Variable",
                                                    name: { kind: "Name", value: "email" },
                                                  },
                                                },
                                              ],
                                            },
                                          },
                                        ],
                                      },
                                      {
                                        kind: "ObjectValue",
                                        fields: [
                                          {
                                            kind: "ObjectField",
                                            name: { kind: "Name", value: "AccountId" },
                                            value: {
                                              kind: "ObjectValue",
                                              fields: [
                                                {
                                                  kind: "ObjectField",
                                                  name: { kind: "Name", value: "ne" },
                                                  value: { kind: "NullValue" },
                                                },
                                              ],
                                            },
                                          },
                                        ],
                                      },
                                    ],
                                  },
                                },
                              ],
                            },
                          },
                        ],
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "edges" },
                              selectionSet: {
                                kind: "SelectionSet",
                                selections: [
                                  {
                                    kind: "Field",
                                    name: { kind: "Name", value: "node" },
                                    selectionSet: {
                                      kind: "SelectionSet",
                                      selections: [
                                        { kind: "Field", name: { kind: "Name", value: "Id" } },
                                        {
                                          kind: "Field",
                                          name: { kind: "Name", value: "Email" },
                                          selectionSet: {
                                            kind: "SelectionSet",
                                            selections: [
                                              { kind: "Field", name: { kind: "Name", value: "value" } },
                                            ],
                                          },
                                        },
                                        {
                                          kind: "Field",
                                          name: { kind: "Name", value: "AccountId" },
                                          selectionSet: {
                                            kind: "SelectionSet",
                                            selections: [
                                              { kind: "Field", name: { kind: "Name", value: "value" } },
                                            ],
                                          },
                                        },
                                        {
                                          kind: "Field",
                                          name: { kind: "Name", value: "Account" },
                                          selectionSet: {
                                            kind: "SelectionSet",
                                            selections: [
                                              { kind: "Field", name: { kind: "Name", value: "Id" } },
                                              {
                                                kind: "Field",
                                                name: { kind: "Name", value: "Owner" },
                                                selectionSet: {
                                                  kind: "SelectionSet",
                                                  selections: [
                                                    { kind: "Field", name: { kind: "Name", value: "Id" } },
                                                    {
                                                      kind: "Field",
                                                      name: { kind: "Name", value: "Email" },
                                                      selectionSet: {
                                                        kind: "SelectionSet",
                                                        selections: [
                                                          {
                                                            kind: "Field",
                                                            name: { kind: "Name", value: "value" },
                                                          },
                                                        ],
                                                      },
                                                    },
                                                  ],
                                                },
                                              },
                                            ],
                                          },
                                        },
                                      ],
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetAccountRecordsForRrSkipQuery, GetAccountRecordsForRrSkipQueryVariables>;
