/* v8 ignore start */
import type { TableDefinition } from "../types";

export const oauthClientTable: TableDefinition = {
  modelName: "OAuthClient",
  displayName: "OAuth Client",
  displayNamePlural: "OAuth Clients",
  description: "OAuth clients for third-party integrations",
  slug: "oauth-clients",
  category: "platform",
  defaultSort: "createdAt",
  defaultSortDirection: "desc",
  fields: [
    {
      column: "clientId",
      label: "Client ID",
      type: "string",
      access: "readonly",
      isPrimary: true,
      searchable: true,
      showInList: true,
    },
    { column: "name", label: "Name", type: "string", access: "readonly", searchable: true, showInList: true },
    { column: "redirectUris", label: "Redirect URIs", type: "json", access: "readonly", showInList: false },
    {
      column: "clientType",
      label: "Client Type",
      type: "enum",
      access: "readonly",
      enumValues: ["CONFIDENTIAL", "PUBLIC"],
      showInList: true,
    },
    { column: "purpose", label: "Purpose", type: "string", access: "readonly", showInList: false },
    { column: "logo", label: "Logo", type: "url", access: "readonly", showInList: false },
    { column: "websiteUrl", label: "Website URL", type: "url", access: "readonly", showInList: false },
    { column: "rejectionReason", label: "Rejection Reason", type: "string", access: "readonly", showInList: false },
    { column: "isTrusted", label: "Trusted", type: "boolean", access: "readonly", showInList: true },
    {
      column: "status",
      label: "Status",
      type: "enum",
      access: "readonly",
      enumValues: ["PENDING", "APPROVED", "REJECTED"],
      showInList: true,
    },
    { column: "userId", label: "User ID", type: "number", access: "readonly", showInList: true },
    {
      column: "user",
      label: "User",
      type: "string",
      access: "readonly",
      showInList: true,
      relation: {
        modelName: "User",
        select: { id: true, username: true, email: true },
        displayField: "email",
        linkTo: { slug: "users", paramField: "id" },
        fkColumn: "userId",
      },
    },
    { column: "createdAt", label: "Created", type: "datetime", access: "readonly", showInList: true },

    // Sensitive fields — hidden
    { column: "clientSecrets", label: "Client Secrets", type: "string", access: "hidden" },
  ],
};
