/* v8 ignore start */
import type { TableDefinition } from "../types";

import { id } from "./_helpers";

export const membershipTable: TableDefinition = {
  modelName: "Membership",
  displayName: "Membership",
  displayNamePlural: "Memberships",
  description: "Team/org membership records",
  slug: "memberships",
  category: "core",
  defaultSort: "id",
  defaultSortDirection: "desc",
  fields: [
    id(),
    { column: "teamId", label: "Team ID", type: "number", access: "readonly", searchable: true, showInList: true },
    { column: "userId", label: "User ID", type: "number", access: "readonly", searchable: true, showInList: true },
    { column: "accepted", label: "Accepted", type: "boolean", access: "editable", showInList: true },
    {
      column: "role",
      label: "Role",
      type: "enum",
      access: "editable",
      enumValues: ["MEMBER", "ADMIN", "OWNER"],
      showInList: true,
    },
    { column: "disableImpersonation", label: "Disable Impersonation", type: "boolean", access: "editable" },

    {
      column: "user",
      label: "User",
      type: "string",
      access: "readonly",
      showInList: true,
      relation: {
        modelName: "User",
        select: { id: true, name: true, email: true, username: true },
        displayField: "name",
        linkTo: { slug: "users", paramField: "id" },
      },
    },
    {
      column: "team",
      label: "Team",
      type: "string",
      access: "readonly",
      showInList: true,
      relation: {
        modelName: "Team",
        select: { id: true, name: true, slug: true },
        displayField: "name",
        linkTo: { slug: "teams", paramField: "id" },
      },
    },
  ],
};
