import type { ParsedUrlQuery } from "querystring";
import { z } from "zod";

// Take array as a string and return zod array
const queryStringArray = z
  .string()
  .or(z.array(z.string()))
  .transform((a) => {
    if (typeof a === "string") return a.split(",");
    if (Array.isArray(a)) return a;
    return [a];
  });

const queryNumberArray = z
  .string()
  .or(z.number())
  .or(z.array(z.number()))
  .transform((a) => {
    if (typeof a === "string") return a.split(",").map((a) => Number(a));
    if (Array.isArray(a)) return a;
    return [a];
  });

// Use filterQuerySchema when parsing filters out of query, so that additional query params(e.g. slug, appPages) aren't passed in filters
export const filterQuerySchema = z.object({
  teamIds: queryNumberArray.optional(),
  userIds: queryNumberArray.optional(),
  upIds: queryStringArray.optional(),
});

export const filterQuerySchemaStrict = z.object({
  teamIds: z.number().array().optional(),
  userIds: z.number().array().optional(),
  upIds: z.string().array().optional(),
});

export const getTeamsFiltersFromQuery = (query: ParsedUrlQuery) => {
  const filters = filterQuerySchema.parse(query);
  // Ensure that filters are sorted so that react-query caching can work better
  // [1,2] is equivalent to [2,1] when fetching filter data.
  filters.teamIds = filters.teamIds?.sort();
  filters.upIds = filters.upIds?.sort();
  filters.userIds = filters.userIds?.sort();

  const isUserIdFilterPresent = filters.userIds?.length;
  const isUpIdFilterPresent = filters.upIds?.length;
  if (!filters.teamIds?.length && !isUserIdFilterPresent && !isUpIdFilterPresent) {
    return undefined;
  }

  return filters;
};
