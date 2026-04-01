/* v8 ignore start */
import type { TableDefinition } from "../types";

import { id, timestamps } from "./_helpers";

export const profileTable: TableDefinition = {
  modelName: "Profile",
  displayName: "Profile",
  displayNamePlural: "Profiles",
  description: "User profiles within organizations",
  slug: "profiles",
  category: "core",
  defaultSort: "id",
  defaultSortDirection: "desc",
  fields: [
    id(),
    { column: "uid", label: "UID", type: "string", access: "readonly", showInList: true },
    { column: "userId", label: "User ID", type: "number", access: "readonly", searchable: true, showInList: true },
    { column: "organizationId", label: "Org ID", type: "number", access: "readonly", searchable: true, showInList: true },
    { column: "username", label: "Username", type: "string", access: "readonly", searchable: true, showInList: true },
    ...timestamps(),

    {
      column: "user",
      label: "User",
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
      column: "organization",
      label: "Organization",
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
  actions: [
    {
      id: "release-username",
      label: "Release Username",
      icon: "trash",
      variant: "destructive",
      mutation: "admin.releaseUsername",
      buildInput: (row) => ({
        username: row.username,
        organizationId: row.organizationId,
        mode: "preview",
      }),
      formId: "release-username",
    },
  ],
};
