/* v8 ignore start */
import type { TableDefinition } from "../types";

import { id } from "./_helpers";

export const workflowTable: TableDefinition = {
  modelName: "Workflow",
  displayName: "Workflow",
  displayNamePlural: "Workflows",
  description: "Automation workflows (emails, SMS, webhooks)",
  slug: "workflows",
  category: "core",
  defaultSort: "id",
  defaultSortDirection: "desc",
  fields: [
    id(),
    { column: "name", label: "Name", type: "string", access: "readonly", searchable: true, showInList: true },
    { column: "userId", label: "User ID", type: "number", access: "readonly", searchable: true },
    { column: "teamId", label: "Team ID", type: "number", access: "readonly", searchable: true },
    { column: "trigger", label: "Trigger", type: "enum", access: "readonly", enumValues: ["BEFORE_EVENT", "EVENT_CANCELLED", "NEW_EVENT", "AFTER_EVENT", "RESCHEDULE_EVENT", "AFTER_HOSTS_CAL_VIDEO_NO_SHOW", "AFTER_GUESTS_CAL_VIDEO_NO_SHOW"], showInList: true },
    { column: "time", label: "Time", type: "number", access: "readonly" },
    { column: "timeUnit", label: "Time Unit", type: "enum", access: "readonly", enumValues: ["DAY", "HOUR", "MINUTE"] },
    { column: "isActiveOnAll", label: "Active On All", type: "boolean", access: "readonly", showInList: true },

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
      column: "team",
      label: "Team",
      type: "string",
      access: "readonly",
      showInList: true,
      relation: {
        modelName: "Team",
        select: { id: true, name: true },
        displayField: "name",
        linkTo: { slug: "teams", paramField: "id" },
      },
    },
  ],
};
