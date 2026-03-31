/* v8 ignore start */
import type { TableDefinition } from "../types";

import { id } from "./_helpers";

export const bookingTable: TableDefinition = {
  modelName: "Booking",
  displayName: "Booking",
  displayNamePlural: "Bookings",
  description: "All bookings across the platform",
  slug: "bookings",
  category: "core",
  defaultSort: "id",
  defaultSortDirection: "desc",
  pageSize: 50,
  fields: [
    id(),
    { column: "uid", label: "UID", type: "string", access: "readonly", searchable: true, showInList: true },
    { column: "title", label: "Title", type: "string", access: "readonly", searchable: true, showInList: true },
    { column: "startTime", label: "Start", type: "datetime", access: "readonly", showInList: true },
    { column: "endTime", label: "End", type: "datetime", access: "readonly", showInList: true },
    { column: "userId", label: "User ID", type: "number", access: "readonly", searchable: true, showInList: true },
    { column: "eventTypeId", label: "Event Type ID", type: "number", access: "readonly", showInList: true },
    {
      column: "status",
      label: "Status",
      type: "enum",
      access: "readonly",
      enumValues: ["ACCEPTED", "PENDING", "CANCELLED", "REJECTED", "AWAITING_HOST"],
      showInList: true,
    },
    { column: "paid", label: "Paid", type: "boolean", access: "readonly" },
    { column: "rescheduled", label: "Rescheduled", type: "boolean", access: "readonly" },
    { column: "isRecorded", label: "Recorded", type: "boolean", access: "readonly" },
    { column: "createdAt", label: "Created", type: "datetime", access: "readonly" },

    {
      column: "user",
      label: "Booked By",
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
      column: "eventType",
      label: "Event Type",
      type: "string",
      access: "readonly",
      showInList: true,
      relation: {
        modelName: "EventType",
        select: { id: true, title: true, slug: true },
        displayField: "title",
        linkTo: { slug: "event-types", paramField: "id" },
      },
    },

    { column: "metadata", label: "Metadata", type: "json", access: "hidden" },
    { column: "responses", label: "Responses", type: "json", access: "hidden" },
  ],
  panels: [
    {
      id: "trigger-runs",
      label: "Trigger.dev Runs",
    },
  ],
};
