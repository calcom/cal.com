/* v8 ignore start */
import type { TableDefinition } from "../types";

import { id } from "./_helpers";

export const bookingReportTable: TableDefinition = {
  modelName: "BookingReport",
  displayName: "Booking Report",
  displayNamePlural: "Booking Reports",
  description: "Spam/abuse reports on bookings",
  slug: "booking-reports",
  category: "abuse",
  defaultSort: "createdAt",
  defaultSortDirection: "desc",
  fields: [
    id({ type: "string" }),
    { column: "bookingUid", label: "Booking UID", type: "string", access: "readonly", searchable: true, showInList: true },
    { column: "bookerEmail", label: "Booker Email", type: "email", access: "readonly", searchable: true, showInList: true },
    { column: "reason", label: "Reason", type: "enum", access: "readonly", enumValues: ["SPAM", "DONT_KNOW_PERSON", "OTHER"], showInList: true },
    { column: "description", label: "Description", type: "string", access: "readonly" },
    { column: "status", label: "Status", type: "enum", access: "readonly", enumValues: ["PENDING", "DISMISSED", "BLOCKED"], showInList: true },
    { column: "systemStatus", label: "System Status", type: "enum", access: "readonly", enumValues: ["PENDING", "BLOCKED", "DISMISSED"], showInList: true },
    { column: "cancelled", label: "Cancelled", type: "boolean", access: "readonly" },
    { column: "createdAt", label: "Created", type: "datetime", access: "readonly", showInList: true },
    { column: "updatedAt", label: "Updated", type: "datetime", access: "readonly" },

    {
      column: "reportedBy",
      label: "Reported By",
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
      relation: {
        modelName: "Team",
        select: { id: true, name: true },
        displayField: "name",
        linkTo: { slug: "teams", paramField: "id" },
      },
    },
  ],
  actions: [
    {
      id: "dismiss-report",
      label: "Dismiss Report",
      icon: "check",
      variant: "default",
      mutation: "admin.watchlist.dismissReport",
      buildInput: (row) => ({ email: row.bookerEmail }),
      condition: (row) => row.systemStatus === "PENDING",
    },
    {
      id: "block-booker",
      label: "Block Booker",
      icon: "ban",
      variant: "destructive",
      mutation: "admin.watchlist.addToWatchlist",
      buildInput: (row) => ({ email: row.bookerEmail, type: "EMAIL", description: `Blocked from report ${row.id}` }),
      condition: (row) => row.systemStatus === "PENDING",
      confirm: { title: "Block this booker?", description: "They will be added to the global watchlist and blocked from future bookings." },
    },
  ],
};
