import type { SortingState, ColumnSort, VisibilityState, ColumnSizingState } from "@tanstack/react-table";
import { z } from "zod";

import type { IconName } from "@calcom/ui/components/icon";

export type { SortingState } from "@tanstack/react-table";

export enum ColumnFilterType {
  SINGLE_SELECT = "ss",
  MULTI_SELECT = "ms",
  TEXT = "t",
  NUMBER = "n",
  DATE_RANGE = "dr",
}

export const textFilterOperators = [
  "equals",
  "notEquals",
  "contains",
  "notContains",
  "startsWith",
  "endsWith",
  "isEmpty",
  "isNotEmpty",
] as const;

export type TextFilterOperator = (typeof textFilterOperators)[number];

export const ZTextFilterOperator = z.enum(textFilterOperators);

export type SingleSelectFilterValue = {
  type: ColumnFilterType.SINGLE_SELECT;
  data: string | number;
};

export const ZSingleSelectFilterValue = z.object({
  type: z.literal(ColumnFilterType.SINGLE_SELECT),
  data: z.union([z.string(), z.number()]),
}) satisfies z.ZodType<SingleSelectFilterValue>;

export type MultiSelectFilterValue = {
  type: ColumnFilterType.MULTI_SELECT;
  data: Array<string | number>;
};

export const ZMultiSelectFilterValue = z.object({
  type: z.literal(ColumnFilterType.MULTI_SELECT),
  data: z.union([z.string(), z.number()]).array(),
}) satisfies z.ZodType<MultiSelectFilterValue>;

export type TextFilterValue = {
  type: ColumnFilterType.TEXT;
  data: {
    operator: TextFilterOperator;
    operand: string;
  };
};

export const ZTextFilterValue = z.object({
  type: z.literal(ColumnFilterType.TEXT),
  data: z.object({
    operator: ZTextFilterOperator,
    operand: z.string(),
  }),
}) satisfies z.ZodType<TextFilterValue>;

const numberFilterOperators = ["eq", "neq", "gt", "gte", "lt", "lte"] as const;

export type NumberFilterOperator = (typeof numberFilterOperators)[number];

export const ZNumberFilterOperator = z.enum(numberFilterOperators);

export type NumberFilterValue = {
  type: ColumnFilterType.NUMBER;
  data: {
    operator: NumberFilterOperator;
    operand: number;
  };
};

export const ZNumberFilterValue = z.object({
  type: z.literal(ColumnFilterType.NUMBER),
  data: z.object({
    operator: ZNumberFilterOperator,
    operand: z.number(),
  }),
}) satisfies z.ZodType<NumberFilterValue>;

export type DateRangeFilterValue = {
  type: ColumnFilterType.DATE_RANGE;
  data: {
    startDate: string | null;
    endDate: string | null;
    preset: string;
  };
};

export const ZDateRangeFilterValue = z.object({
  type: z.literal(ColumnFilterType.DATE_RANGE),
  data: z.object({
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    preset: z.string(),
  }),
}) satisfies z.ZodType<DateRangeFilterValue>;

export const ZFilterValue = z.union([
  ZSingleSelectFilterValue,
  ZMultiSelectFilterValue,
  ZTextFilterValue,
  ZNumberFilterValue,
  ZDateRangeFilterValue,
]);

export type DateRangeFilterOptions = {
  range?: "past" | "custom";
  endOfDay?: boolean;
};

export type TextFilterOptions = {
  allowedOperators?: TextFilterOperator[];
  placeholder?: string;
};

export type ColumnFilterMeta =
  | {
      type: ColumnFilterType.DATE_RANGE;
      icon?: IconName;
      dateRangeOptions?: DateRangeFilterOptions;
    }
  | {
      type: ColumnFilterType.TEXT;
      icon?: IconName;
      textOptions?: TextFilterOptions;
    }
  | {
      type?: Exclude<ColumnFilterType, ColumnFilterType.DATE_RANGE | ColumnFilterType.TEXT>;
      icon?: IconName;
    };

export type FilterableColumn = {
  id: string;
  title: string;
  icon?: IconName;
} & (
  | {
      type: ColumnFilterType.SINGLE_SELECT;
      options: FacetedValue[];
    }
  | {
      type: ColumnFilterType.MULTI_SELECT;
      options: FacetedValue[];
    }
  | {
      type: ColumnFilterType.TEXT;
      textOptions?: TextFilterOptions;
    }
  | {
      type: ColumnFilterType.NUMBER;
    }
  | {
      type: ColumnFilterType.DATE_RANGE;
      dateRangeOptions?: DateRangeFilterOptions;
    }
);

export type ColumnFilter = {
  id: string;
  value: FilterValue;
};

export const ZColumnFilter = z.object({
  id: z.string(),
  value: ZFilterValue,
}) satisfies z.ZodType<ColumnFilter>;

export type FilterValueSchema<T extends ColumnFilterType> = T extends ColumnFilterType.SINGLE_SELECT
  ? typeof ZSingleSelectFilterValue
  : T extends ColumnFilterType.MULTI_SELECT
  ? typeof ZMultiSelectFilterValue
  : T extends ColumnFilterType.TEXT
  ? typeof ZTextFilterValue
  : T extends ColumnFilterType.NUMBER
  ? typeof ZNumberFilterValue
  : T extends ColumnFilterType.DATE_RANGE
  ? typeof ZDateRangeFilterValue
  : never;

export type FilterValue<T extends ColumnFilterType = ColumnFilterType> =
  T extends ColumnFilterType.SINGLE_SELECT
    ? SingleSelectFilterValue
    : T extends ColumnFilterType.MULTI_SELECT
    ? MultiSelectFilterValue
    : T extends ColumnFilterType.TEXT
    ? TextFilterValue
    : T extends ColumnFilterType.NUMBER
    ? NumberFilterValue
    : T extends ColumnFilterType.DATE_RANGE
    ? DateRangeFilterValue
    : never;

export type TypedColumnFilter<T extends ColumnFilterType> = {
  id: string;
  value: FilterValue<T>;
};

export type Sorting = ColumnSort;

export const ZSorting = z.object({
  id: z.string(),
  desc: z.boolean(),
}) satisfies z.ZodType<Sorting>;

export const ZSortingState = z.array(ZSorting);

export const ZColumnSizing = z.record(z.string(), z.number());

export const ZColumnVisibility = z.record(z.string(), z.boolean());

export type FacetedValue = {
  label: string;
  value: string | number;
  section?: string;
};

export type ActiveFilter = {
  f: string;
  v?: FilterValue;
};

export type ActiveFilters = ActiveFilter[];

export const ZActiveFilter = z.object({
  f: z.string(),
  v: ZFilterValue.optional(),
}) satisfies z.ZodType<ActiveFilter>;

export const ZActiveFilters = ZActiveFilter.array();

export type FilterSegmentOutput = {
  id: number;
  name: string;
  tableIdentifier: string;
  scope: "USER" | "TEAM";
  activeFilters: ActiveFilters;
  sorting: SortingState;
  columnVisibility: Record<string, boolean>;
  columnSizing: Record<string, number>;
  perPage: number;
  searchTerm: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: number;
  teamId: number | null;
  team: { id: number; name: string } | null;
};

export type FilterSegmentsListResponse = {
  segments: FilterSegmentOutput[];
  preferredSegmentId: number | null;
};

export type SegmentStorage = {
  [tableIdentifier: string]: {
    segmentId: number;
  };
};

export const ZSegmentStorage = z.record(
  z.string(),
  z.object({
    segmentId: z.number(),
  })
) satisfies z.ZodType<SegmentStorage>;

export type UseSegments = (props: UseSegmentsProps) => UseSegmentsReturn;

export type UseSegmentsProps = {
  tableIdentifier: string;
  activeFilters: ActiveFilters;
  sorting: SortingState;
  columnVisibility: VisibilityState;
  columnSizing: ColumnSizingState;
  pageSize: number;
  searchTerm: string;
  defaultPageSize: number;
  segmentId: number;
  setSegmentId: (segmentId: number | null) => void;
  setActiveFilters: (activeFilters: ActiveFilters) => void;
  setSorting: (sorting: SortingState) => void;
  setColumnVisibility: (columnVisibility: VisibilityState) => void;
  setColumnSizing: (columnSizing: ColumnSizingState) => void;
  setPageSize: (pageSize: number) => void;
  setPageIndex: (pageIndex: number) => void;
  setSearchTerm: (searchTerm: string | null) => void;
  segments?: FilterSegmentOutput[];
  preferredSegmentId?: number | null;
};

export type UseSegmentsReturn = {
  segments: FilterSegmentOutput[];
  selectedSegment: FilterSegmentOutput | undefined;
  canSaveSegment: boolean;
  setAndPersistSegmentId: (segmentId: number | null) => void;
  isSegmentEnabled: boolean;
};
