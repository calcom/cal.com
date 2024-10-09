"use client";

import { parseAsArrayOf, parseAsJson, useQueryStates } from "nuqs";
import { z } from "zod";

const filterSchema = z.object({
  f: z.string(),
  v: z.array(z.string()).optional(),
});

export const filtersSearchParams = {
  activeFilters: parseAsArrayOf(parseAsJson(filterSchema.parse)).withDefault([]),
};

export function useFiltersSearchState() {
  return useQueryStates(filtersSearchParams);
}
