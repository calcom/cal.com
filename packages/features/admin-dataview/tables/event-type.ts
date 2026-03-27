/* v8 ignore start */
import type { TableDefinition } from "../types";

import { id } from "./_helpers";

export const eventTypeTable: TableDefinition = {
  modelName: "EventType",
  displayName: "Event Type",
  displayNamePlural: "Event Types",
  description: "Booking event type configurations",
  slug: "event-types",
  category: "core",
  defaultSort: "id",
  defaultSortDirection: "desc",
  fields: [
    id(),
    { column: "title", label: "Title", type: "string", access: "editable", searchable: true, showInList: true },
    { column: "slug", label: "Slug", type: "string", access: "editable", searchable: true, showInList: true },
    { column: "description", label: "Description", type: "string", access: "hidden" },
    { column: "length", label: "Duration (min)", type: "number", access: "editable", showInList: true },
    { column: "hidden", label: "Hidden", type: "boolean", access: "editable", showInList: true },
    { column: "userId", label: "Owner User ID", type: "number", access: "readonly", showInList: true },
    { column: "teamId", label: "Team ID", type: "number", access: "readonly", showInList: true },
    {
      column: "schedulingType",
      label: "Scheduling Type",
      type: "enum",
      access: "readonly",
      enumValues: ["ROUND_ROBIN", "COLLECTIVE", "MANAGED"],
      showInList: true,
    },
    { column: "price", label: "Price", type: "number", access: "readonly" },
    { column: "currency", label: "Currency", type: "string", access: "readonly" },
    { column: "requiresConfirmation", label: "Requires Confirmation", type: "boolean", access: "editable" },
    { column: "isInstantEvent", label: "Instant Event", type: "boolean", access: "readonly" },
    { column: "seatsPerTimeSlot", label: "Seats", type: "number", access: "editable" },
    { column: "periodType", label: "Period Type", type: "enum", access: "readonly", enumValues: ["UNLIMITED", "ROLLING", "ROLLING_WINDOW", "RANGE"] },
    { column: "position", label: "Position", type: "number", access: "hidden" },
    { column: "parentId", label: "Parent ID (Managed)", type: "number", access: "readonly" },
    { column: "createdAt", label: "Created", type: "datetime", access: "readonly", showInList: true },

    {
      column: "owner",
      label: "Owner",
      type: "string",
      access: "readonly",
      showInList: true,
      relation: {
        modelName: "User",
        select: { id: true, name: true, email: true, username: true },
        displayField: "name",
        linkTo: { slug: "users", paramField: "id" },
        fkColumn: "userId",
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

    { column: "locations", label: "Locations", type: "json", access: "hidden" },
    { column: "metadata", label: "Metadata", type: "json", access: "hidden" },
    { column: "bookingFields", label: "Booking Fields", type: "json", access: "hidden" },
    { column: "recurringEvent", label: "Recurring Config", type: "json", access: "hidden" },
    { column: "bookingLimits", label: "Booking Limits", type: "json", access: "hidden" },
    { column: "durationLimits", label: "Duration Limits", type: "json", access: "hidden" },
  ],
};
