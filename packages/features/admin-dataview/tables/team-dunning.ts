/* v8 ignore start */
import type { TableDefinition } from "../types";

import { id, timestamps } from "./_helpers";

export const teamDunningTable: TableDefinition = {
  modelName: "TeamDunningStatus",
  displayName: "Team Dunning",
  displayNamePlural: "Team Dunning",
  description: "Dunning/payment failure tracking for teams",
  slug: "team-dunning",
  category: "billing",
  defaultSort: "updatedAt",
  defaultSortDirection: "desc",
  fields: [
    id({ column: "id", type: "string" }),
    { column: "teamBillingId", label: "Team Billing ID", type: "string", access: "readonly", searchable: true, showInList: true },
    {
      column: "status",
      label: "Dunning Status",
      type: "enum",
      access: "editable",
      enumValues: ["CURRENT", "WARNING", "SOFT_BLOCKED", "HARD_BLOCKED", "CANCELLED"],
      showInList: true,
    },
    { column: "firstFailedAt", label: "First Failed", type: "datetime", access: "readonly", showInList: true },
    { column: "lastFailedAt", label: "Last Failed", type: "datetime", access: "readonly", showInList: true },
    { column: "resolvedAt", label: "Resolved", type: "datetime", access: "readonly" },
    { column: "subscriptionId", label: "Subscription", type: "string", access: "readonly", searchable: true },
    { column: "failedInvoiceId", label: "Failed Invoice", type: "string", access: "readonly" },
    { column: "invoiceUrl", label: "Invoice URL", type: "url", access: "readonly" },
    { column: "failureReason", label: "Failure Reason", type: "string", access: "readonly", showInList: true },
    { column: "notificationsSent", label: "Notifications Sent", type: "number", access: "readonly" },
    ...timestamps(),
  ],
};
