/* v8 ignore start */
import type { TableDefinition } from "../types";

import { id } from "./_helpers";

export const scheduleTable: TableDefinition = {
  modelName: "Schedule",
  displayName: "Schedule",
  displayNamePlural: "Schedules",
  description: "User availability schedules",
  slug: "schedules",
  category: "core",
  defaultSort: "id",
  defaultSortDirection: "desc",
  fields: [
    id(),
    { column: "userId", label: "User ID", type: "number", access: "readonly", searchable: true, showInList: true },
    { column: "name", label: "Name", type: "string", access: "readonly", searchable: true, showInList: true },
    { column: "timeZone", label: "Timezone", type: "string", access: "readonly", showInList: true },

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
  ],
};
