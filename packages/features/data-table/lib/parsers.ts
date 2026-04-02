import type { ColumnSizingState, SortingState, VisibilityState } from "@tanstack/react-table";
import { createParser, parseAsArrayOf, parseAsInteger, parseAsJson, parseAsString } from "nuqs";
import type { ActiveFilters } from "./types";
import { ZActiveFilter, ZColumnSizing, ZColumnVisibility, ZSorting } from "./types";

const DEFAULT_ACTIVE_FILTERS: ActiveFilters = [] as ActiveFilters;
const DEFAULT_SORTING: SortingState = [] as SortingState;
const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {};
const DEFAULT_COLUMN_SIZING: ColumnSizingState = {};
export const DEFAULT_PAGE_SIZE = 10;

export const activeFiltersParser = parseAsArrayOf(parseAsJson(ZActiveFilter.parse)).withDefault(
  DEFAULT_ACTIVE_FILTERS
);
export const sortingParser = parseAsArrayOf(parseAsJson(ZSorting.parse)).withDefault(DEFAULT_SORTING);
export const columnVisibilityParser = parseAsJson(ZColumnVisibility.parse).withDefault(
  DEFAULT_COLUMN_VISIBILITY
);
export const columnSizingParser = parseAsJson(ZColumnSizing.parse).withDefault(DEFAULT_COLUMN_SIZING);
export const segmentIdParser = parseAsString.withDefault("");
export const pageIndexParser = parseAsInteger.withDefault(0);
// Custom parser that validates pageSize is positive to prevent division by zero
export const pageSizeParser = createParser({
  parse: (value) => {
    const parsed = parseAsInteger.parse(value);
    // Return null for invalid values (0 or negative), which will fall back to default
    return parsed !== null && parsed > 0 ? parsed : null;
  },
  serialize: (value) => String(value),
}).withDefault(DEFAULT_PAGE_SIZE);
export const searchTermParser = parseAsString.withDefault("");
