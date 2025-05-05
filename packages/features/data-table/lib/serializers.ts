import { createSerializer, parseAsArrayOf, parseAsJson } from "nuqs";

/**
 * Serializer for data table active filters
 * Used to generate URL query parameters for filtering data tables
 */
export const activeFiltersSerializer = createSerializer({
  activeFilters: parseAsArrayOf(parseAsJson),
});
