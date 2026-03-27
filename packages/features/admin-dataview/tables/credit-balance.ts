/* v8 ignore start */
import type { TableDefinition } from "../types";

import { id } from "./_helpers";

export const creditBalanceTable: TableDefinition = {
  modelName: "CreditBalance",
  displayName: "Credit Balance",
  displayNamePlural: "Credit Balances",
  description: "SMS/AI credit balances for teams and users",
  slug: "credit-balances",
  category: "billing",
  defaultSort: "additionalCredits",
  defaultSortDirection: "desc",
  fields: [
    id({ type: "string" }),
    { column: "teamId", label: "Team ID", type: "number", access: "readonly", searchable: true, showInList: true },
    { column: "userId", label: "User ID", type: "number", access: "readonly", searchable: true },
    { column: "additionalCredits", label: "Credits", type: "number", access: "readonly", showInList: true },
    { column: "limitReachedAt", label: "Limit Reached", type: "datetime", access: "readonly", showInList: true },
    { column: "warningSentAt", label: "Warning Sent", type: "datetime", access: "readonly" },

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
      column: "expenseLogs",
      label: "Expenses",
      type: "number",
      access: "readonly",
      showInList: true,
      relation: {
        modelName: "CreditExpenseLog",
        select: { id: true, credits: true, creditType: true, date: true, creditFor: true },
        displayField: "_count",
        many: true,
        take: 10,
      },
    },
  ],
};
