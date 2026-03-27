/* v8 ignore start */
import type { TableDefinition } from "../types";

import { id } from "./_helpers";

export const attendeeTable: TableDefinition = {
  modelName: "Attendee",
  displayName: "Attendee",
  displayNamePlural: "Attendees",
  description: "Booking attendees",
  slug: "attendees",
  category: "core",
  defaultSort: "id",
  defaultSortDirection: "desc",
  fields: [
    id(),
    { column: "email", label: "Email", type: "email", access: "readonly", searchable: true, showInList: true },
    { column: "name", label: "Name", type: "string", access: "readonly", searchable: true, showInList: true },
    { column: "timeZone", label: "Timezone", type: "string", access: "readonly", showInList: true },
    { column: "locale", label: "Locale", type: "string", access: "readonly" },
    { column: "bookingId", label: "Booking ID", type: "number", access: "readonly", searchable: true, showInList: true },
    { column: "noShow", label: "No Show", type: "boolean", access: "readonly", showInList: true },

    {
      column: "booking",
      label: "Booking",
      type: "string",
      access: "readonly",
      showInList: true,
      relation: {
        modelName: "Booking",
        select: { id: true, uid: true, title: true },
        displayField: "title",
        linkTo: { slug: "bookings", paramField: "id" },
      },
    },
  ],
};
