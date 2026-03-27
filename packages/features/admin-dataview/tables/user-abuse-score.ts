/* v8 ignore start */
import type { TableDefinition } from "../types";

import { id } from "./_helpers";

export const userAbuseScoreTable: TableDefinition = {
  modelName: "UserAbuseScore",
  displayName: "Abuse Score",
  displayNamePlural: "Abuse Scores",
  description: "User abuse scoring and signals",
  slug: "abuse-scores",
  category: "abuse",
  defaultSort: "score",
  defaultSortDirection: "desc",
  fields: [
    id(),
    { column: "userId", label: "User ID", type: "number", access: "readonly", searchable: true, showInList: true },
    { column: "score", label: "Score", type: "number", access: "readonly", showInList: true },
    { column: "lastAnalyzedAt", label: "Last Analyzed", type: "datetime", access: "readonly", showInList: true },
    { column: "lockedAt", label: "Locked At", type: "datetime", access: "readonly", showInList: true },
    { column: "lockedReason", label: "Locked Reason", type: "string", access: "readonly", showInList: true },
    { column: "createdAt", label: "Created", type: "datetime", access: "readonly" },
    { column: "updatedAt", label: "Updated", type: "datetime", access: "readonly" },

    { column: "abuseData", label: "Abuse Data", type: "json", access: "hidden" },

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
      column: "signals",
      label: "Signals",
      type: "number",
      access: "readonly",
      showInList: true,
      relation: {
        modelName: "UserAbuseSignal",
        select: { id: true, type: true, weight: true, context: true, createdAt: true },
        displayField: "_count",
        many: true,
        take: 20,
      },
    },
  ],
};
