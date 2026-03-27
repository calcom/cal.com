/* v8 ignore start */
import type { TableDefinition } from "../types";

import { id } from "./_helpers";

export const impersonationsTable: TableDefinition = {
  modelName: "Impersonations",
  displayName: "Impersonation",
  displayNamePlural: "Impersonations",
  description: "Admin impersonation audit log",
  slug: "impersonations",
  category: "system",
  defaultSort: "createdAt",
  defaultSortDirection: "desc",
  fields: [
    id(),
    { column: "impersonatedUserId", label: "Impersonated User ID", type: "number", access: "readonly", searchable: true, showInList: true },
    { column: "impersonatedById", label: "Impersonated By ID", type: "number", access: "readonly", searchable: true, showInList: true },
    { column: "createdAt", label: "Created", type: "datetime", access: "readonly", showInList: true },

    {
      column: "impersonatedUser",
      label: "Target User",
      type: "string",
      access: "readonly",
      showInList: true,
      relation: {
        modelName: "User",
        select: { id: true, name: true, email: true },
        displayField: "name",
        linkTo: { slug: "users", paramField: "id" },
      },
    },
    {
      column: "impersonatedBy",
      label: "Admin",
      type: "string",
      access: "readonly",
      showInList: true,
      relation: {
        modelName: "User",
        select: { id: true, name: true, email: true },
        displayField: "name",
        linkTo: { slug: "users", paramField: "id" },
      },
    },
  ],
};
