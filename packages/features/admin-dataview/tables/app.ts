/* v8 ignore start */
import type { TableDefinition } from "../types";
export const appTable: TableDefinition = {
  modelName: "App",
  displayName: "App",
  displayNamePlural: "Apps",
  description: "App store integrations",
  slug: "apps",
  category: "platform",
  defaultSort: "slug",
  defaultSortDirection: "asc",
  fields: [
    { column: "slug", label: "Slug", type: "string", access: "readonly", isPrimary: true, searchable: true, showInList: true },
    { column: "dirName", label: "Dir Name", type: "string", access: "readonly", showInList: true },
    { column: "enabled", label: "Enabled", type: "boolean", access: "readonly", showInList: true },
    { column: "createdAt", label: "Created", type: "datetime", access: "readonly" },
    { column: "updatedAt", label: "Updated", type: "datetime", access: "readonly" },

    { column: "keys", label: "Keys", type: "json", access: "hidden" },
  ],
};
