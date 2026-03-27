/* v8 ignore start */
import type { TableDefinition } from "../types";

import { id, timestamps } from "./_helpers";

export const teamBillingTable: TableDefinition = {
  modelName: "TeamBilling",
  displayName: "Team Billing",
  displayNamePlural: "Team Billing",
  description: "Stripe billing records for teams",
  slug: "team-billing",
  category: "billing",
  defaultSort: "createdAt",
  defaultSortDirection: "desc",
  fields: [
    id({ column: "id", type: "string" }),
    { column: "teamId", label: "Team ID", type: "number", access: "readonly", searchable: true, showInList: true },
    { column: "subscriptionId", label: "Subscription ID", type: "string", access: "readonly", searchable: true, showInList: true },
    { column: "customerId", label: "Stripe Customer", type: "string", access: "readonly", searchable: true, showInList: true },
    { column: "status", label: "Status", type: "string", access: "readonly", showInList: true },
    { column: "planName", label: "Plan", type: "string", access: "readonly", showInList: true },
    { column: "billingPeriod", label: "Period", type: "enum", access: "readonly", enumValues: ["MONTHLY", "ANNUALLY"] },
    { column: "billingMode", label: "Billing Mode", type: "enum", access: "readonly", enumValues: ["SEATS", "USAGE"] },
    { column: "pricePerSeat", label: "Price/Seat (cents)", type: "number", access: "readonly" },
    { column: "paidSeats", label: "Paid Seats", type: "number", access: "readonly", showInList: true },
    { column: "minSeats", label: "Min Seats", type: "number", access: "readonly" },
    { column: "highWaterMark", label: "High Water Mark", type: "number", access: "readonly" },
    { column: "subscriptionStart", label: "Sub Start", type: "datetime", access: "readonly" },
    { column: "subscriptionEnd", label: "Sub End", type: "datetime", access: "readonly" },
    { column: "subscriptionTrialEnd", label: "Trial End", type: "datetime", access: "readonly" },

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
    {
      column: "dunningStatus",
      label: "Dunning",
      type: "string",
      access: "readonly",
      showInList: true,
      relation: {
        modelName: "TeamDunningStatus",
        select: { id: true, status: true, lastFailedAt: true },
        displayField: "status",
        linkTo: { slug: "team-dunning", paramField: "id" },
      },
    },

    ...timestamps(),
  ],
  actions: [
    {
      id: "refresh-dunning-team",
      label: "Resolve Dunning",
      icon: "check",
      variant: "default",
      mutation: "admin.refreshDunning",
      buildInput: (row) => ({ billingId: row.id, entityType: "team" }),
      confirm: { title: "Resolve dunning?", description: "This marks the payment as succeeded and moves dunning status to CURRENT." },
    },
    {
      id: "transfer-billing-team",
      label: "Transfer Billing",
      icon: "arrow-right",
      variant: "default",
      mutation: "admin.transferBilling",
      buildInput: (row) => ({ billingId: row.id, entityType: "team", mode: "preview" }),
    },
  ],
};
