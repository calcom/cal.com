import type { FilterSegmentOutput } from "@calcom/features/data-table/lib/types";

export type { SortingState, ColumnSizingState, VisibilityState } from "@tanstack/react-table";
export {
  type ActiveFilter,
  type FilterSegmentOutput,
  ZActiveFilters,
  ZSortingState,
  ZColumnSizing,
  ZColumnVisibility,
} from "@calcom/features/data-table/lib/types";

export type FilterSegmentsListResponse = {
  segments: FilterSegmentOutput[];
  preferredSegmentId: number | null;
};
