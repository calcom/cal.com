/* v8 ignore start */
import type { TableDefinition } from "../types";

import { id } from "./_helpers";

export const paymentTable: TableDefinition = {
  modelName: "Payment",
  displayName: "Payment",
  displayNamePlural: "Payments",
  description: "Booking payments via Stripe etc.",
  slug: "payments",
  category: "billing",
  defaultSort: "id",
  defaultSortDirection: "desc",
  fields: [
    id(),
    { column: "uid", label: "UID", type: "string", access: "readonly", searchable: true, showInList: true },
    { column: "bookingId", label: "Booking ID", type: "number", access: "readonly", searchable: true, showInList: true },
    { column: "appId", label: "App", type: "string", access: "readonly", showInList: true },
    { column: "amount", label: "Amount (cents)", type: "number", access: "readonly", showInList: true },
    { column: "fee", label: "Fee (cents)", type: "number", access: "readonly" },
    { column: "currency", label: "Currency", type: "string", access: "readonly", showInList: true },
    { column: "success", label: "Success", type: "boolean", access: "readonly", showInList: true },
    { column: "refunded", label: "Refunded", type: "boolean", access: "readonly", showInList: true },
    { column: "externalId", label: "External ID", type: "string", access: "readonly", searchable: true },
    { column: "paymentOption", label: "Option", type: "enum", access: "readonly", enumValues: ["ON_BOOKING", "HOLD"] },

    { column: "data", label: "Data", type: "json", access: "hidden" },

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
