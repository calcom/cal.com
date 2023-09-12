import type { ParsedUrlQuery } from "querystring";
import { z } from "zod";

import { queryNumberArray } from "@calcom/lib/hooks/useTypedQuery";
import type { RouterOutputs } from "@calcom/trpc/react";

export type IEventTypesFilters = RouterOutputs["viewer"]["eventTypes"]["listWithTeam"];
export type IEventTypeFilter = IEventTypesFilters[0];

// Use filterQuerySchema when parsing filters out of query, so that additional query params(e.g. slug, appPages) aren't passed in filters
export const filterQuerySchema = z.object({
  teamIds: queryNumberArray.optional(),
  userIds: queryNumberArray.optional(),
});

export const filterQuerySchemaStrict = z.object({
  teamIds: z.number().array().optional(),
  userIds: z.number().array().optional(),
});

export const getTeamsFiltersFromQuery = (query: ParsedUrlQuery) => {
  const filters = filterQuerySchema.parse(query);
  // Ensure that filters are sorted so that react-query caching can work better
  // [1,2] is equivalent to [2,1] when fetching filter data.
  filters.teamIds = filters.teamIds?.sort();
  filters.userIds = filters.userIds?.sort();

  if (!filters.teamIds?.length && !filters.userIds?.length) {
    return undefined;
  }

  return filters;
};
