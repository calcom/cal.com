/* v8 ignore start */
import type { TableDefinition } from "../types";

import { id } from "./_helpers";

export const watchlistTable: TableDefinition = {
  modelName: "Watchlist",
  displayName: "Watchlist",
  displayNamePlural: "Watchlist",
  description: "Email/domain/IP watchlist entries",
  slug: "watchlist",
  category: "abuse",
  defaultSort: "lastUpdatedAt",
  defaultSortDirection: "desc",
  fields: [
    id({ type: "string" }),
    { column: "type", label: "Type", type: "enum", access: "readonly", enumValues: ["EMAIL", "DOMAIN", "IP", "PHONE"], showInList: true },
    { column: "value", label: "Value", type: "string", access: "readonly", searchable: true, showInList: true },
    { column: "description", label: "Description", type: "string", access: "readonly", showInList: true },
    { column: "isGlobal", label: "Global", type: "boolean", access: "readonly", showInList: true },
    { column: "organizationId", label: "Org ID", type: "number", access: "readonly", searchable: true },
    { column: "action", label: "Action", type: "enum", access: "readonly", enumValues: ["REPORT", "REVIEW", "BLOCK"], showInList: true },
    { column: "source", label: "Source", type: "enum", access: "readonly", enumValues: ["MANUAL", "AUTO"] },
    { column: "lastUpdatedAt", label: "Updated", type: "datetime", access: "readonly", showInList: true },
  ],
  actions: [
    {
      id: "delete-watchlist",
      label: "Delete Entry",
      icon: "trash",
      variant: "destructive",
      mutation: "admin.watchlist.delete",
      buildInput: (row) => ({ id: row.id }),
      confirm: { title: "Delete watchlist entry?", description: "This will remove the entry from the watchlist." },
    },
  ],
};
