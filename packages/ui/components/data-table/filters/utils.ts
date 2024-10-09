"use client";

import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";

export const filtersSearchParams = {
  activeFilters: parseAsArrayOf(parseAsString).withDefault([]),
};

export function useFiltersSearchState() {
  return useQueryStates(filtersSearchParams);
}
