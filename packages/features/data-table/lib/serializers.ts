import { createSerializer } from "nuqs";
import {
  activeFiltersParser,
  columnSizingParser,
  columnVisibilityParser,
  pageIndexParser,
  pageSizeParser,
  searchTermParser,
  segmentIdParser,
  sortingParser,
} from "./parsers";

/**
 * Serializer for data table query parameters
 * Used to generate URL query parameters for data tables
 * Based on the parameters used in DataTableProvider
 */
export const dataTableQueryParamsSerializer = createSerializer({
  activeFilters: activeFiltersParser,
  sorting: sortingParser,
  cols: columnVisibilityParser,
  widths: columnSizingParser,
  segment: segmentIdParser,
  page: pageIndexParser,
  size: pageSizeParser,
  q: searchTermParser,
});
