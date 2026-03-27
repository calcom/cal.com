/* v8 ignore start */
import type { TableDefinition } from "../types";

import { id } from "./_helpers";

export const webhookTable: TableDefinition = {
  modelName: "Webhook",
  displayName: "Webhook",
  displayNamePlural: "Webhooks",
  description: "Webhook subscriptions for events",
  slug: "webhooks",
  category: "platform",
  defaultSort: "createdAt",
  defaultSortDirection: "desc",
  fields: [
    id({ type: "string" }),
    { column: "subscriberUrl", label: "Subscriber URL", type: "url", access: "readonly", searchable: true, showInList: true },
    { column: "userId", label: "User ID", type: "number", access: "readonly", searchable: true },
    { column: "teamId", label: "Team ID", type: "number", access: "readonly", searchable: true },
    { column: "eventTypeId", label: "Event Type ID", type: "number", access: "readonly" },
    { column: "active", label: "Active", type: "boolean", access: "readonly", showInList: true },
    { column: "platform", label: "Platform", type: "boolean", access: "readonly", showInList: true },
    { column: "createdAt", label: "Created", type: "datetime", access: "readonly", showInList: true },

    { column: "secret", label: "Secret", type: "string", access: "hidden" },
    { column: "payloadTemplate", label: "Payload Template", type: "string", access: "hidden" },

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
      relation: {
        modelName: "Team",
        select: { id: true, name: true, slug: true },
        displayField: "name",
        linkTo: { slug: "teams", paramField: "id" },
      },
    },
  ],
};
