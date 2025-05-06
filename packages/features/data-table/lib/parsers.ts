import { parseAsArrayOf, parseAsJson, parseAsInteger, parseAsString } from "nuqs";

import { ZActiveFilter, ZSorting, ZColumnVisibility, ZColumnSizing } from "./types";

const DEFAULT_ACTIVE_FILTERS = [];
const DEFAULT_SORTING = [];
const DEFAULT_COLUMN_VISIBILITY = {};
const DEFAULT_COLUMN_SIZING = {};
const DEFAULT_PAGE_SIZE = 10;

export const activeFiltersParser = parseAsArrayOf(parseAsJson(ZActiveFilter.parse)).withDefault(
  DEFAULT_ACTIVE_FILTERS
);
export const sortingParser = parseAsArrayOf(parseAsJson(ZSorting.parse)).withDefault(DEFAULT_SORTING);
export const columnVisibilityParser = parseAsJson(ZColumnVisibility.parse).withDefault(
  DEFAULT_COLUMN_VISIBILITY
);
export const columnSizingParser = parseAsJson(ZColumnSizing.parse).withDefault(DEFAULT_COLUMN_SIZING);
export const segmentIdParser = parseAsInteger.withDefault(-1);
export const pageIndexParser = parseAsInteger.withDefault(0);
export const pageSizeParser = parseAsInteger.withDefault(DEFAULT_PAGE_SIZE);
export const searchTermParser = parseAsString.withDefault("");
