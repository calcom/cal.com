import { createSerializer, parseAsArrayOf, parseAsJson, parseAsInteger, parseAsString } from "nuqs";

/**
 * Serializer for data table query parameters
 * Used to generate URL query parameters for data tables
 * Based on the parameters used in DataTableProvider
 */
export const dataTableQueryParamsSerializer = createSerializer({
  activeFilters: parseAsArrayOf(parseAsJson()),
  sorting: parseAsArrayOf(parseAsJson()),
  cols: parseAsJson(),
  widths: parseAsJson(),
  segment: parseAsInteger,
  page: parseAsInteger,
  size: parseAsInteger,
  q: parseAsString,
});

/**
 * @deprecated Use dataTableQueryParamsSerializer instead
 */
export const activeFiltersSerializer = createSerializer({
  activeFilters: parseAsArrayOf(parseAsJson()),
});
