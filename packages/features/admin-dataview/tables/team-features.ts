/* v8 ignore start */
import type { TableDefinition } from "../types";

export const teamFeaturesTable: TableDefinition = {
  modelName: "TeamFeatures",
  displayName: "Team Feature",
  displayNamePlural: "Team Features",
  description: "Feature flags assigned to teams",
  slug: "team-features",
  category: "system",
  defaultSort: "assignedAt",
  defaultSortDirection: "desc",
  fields: [
    {
      column: "teamId",
      label: "Team ID",
      type: "number",
      access: "readonly",
      isPrimary: true,
      showInList: true,
    },
    {
      column: "featureId",
      label: "Feature Slug",
      type: "string",
      access: "readonly",
      isPrimary: true,
      searchable: true,
      showInList: true,
    },
    { column: "enabled", label: "Enabled", type: "boolean", access: "readonly", showInList: true },
    { column: "assignedAt", label: "Assigned At", type: "datetime", access: "readonly", showInList: true },
    { column: "assignedBy", label: "Assigned By", type: "string", access: "readonly", showInList: true },
    { column: "updatedAt", label: "Updated", type: "datetime", access: "readonly" },
    {
      column: "team",
      label: "Team",
      type: "string",
      access: "readonly",
      showInList: true,
      relation: {
        modelName: "Team",
        select: { id: true, name: true, slug: true },
        displayField: "{name} ({slug})",
        linkTo: { slug: "teams", paramField: "id" },
      },
    },
    {
      column: "feature",
      label: "Feature",
      type: "string",
      access: "readonly",
      showInList: true,
      relation: {
        modelName: "Feature",
        select: { slug: true, enabled: true, type: true },
        displayField: "slug",
        fkColumn: "featureId",
        linkTo: { slug: "features", paramField: "slug" },
      },
    },
  ],
};
