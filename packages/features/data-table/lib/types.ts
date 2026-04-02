import type { FilterType, TextFilterOperator } from "@calcom/types/data-table";
import type { ColumnSort, SortingState } from "@tanstack/react-table";
import { z } from "zod";

export type { ColumnFilterMeta, FilterableColumn } from "@calcom/types/data-table";

const ColumnFilterType = {
  SINGLE_SELECT: "ss",
  MULTI_SELECT: "ms",
  TEXT: "t",
  NUMBER: "n",
  DATE_RANGE: "dr",
} as const satisfies Record<string, FilterType>;

type ColumnFilterTypeValues = typeof ColumnFilterType;

export type { SortingState } from "@tanstack/react-table";

export const SYSTEM_SEGMENT_PREFIX = "system_";

export { ColumnFilterType, type TextFilterOperator };

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

export const ZTextFilterOperator = z.enum(textFilterOperators);

export type SingleSelectFilterValue = {
  type: ColumnFilterTypeValues["SINGLE_SELECT"];
  data: string | number;
};

export const ZSingleSelectFilterValue = z.object({
  type: z.literal(ColumnFilterType.SINGLE_SELECT),
  data: z.union([z.string(), z.number()]),
}) satisfies z.ZodType<SingleSelectFilterValue>;

export type MultiSelectFilterValue = {
  type: ColumnFilterTypeValues["MULTI_SELECT"];
  data: Array<string | number>;
};

export const ZMultiSelectFilterValue = z.object({
  type: z.literal(ColumnFilterType.MULTI_SELECT),
  data: z.union([z.string(), z.number()]).array(),
}) satisfies z.ZodType<MultiSelectFilterValue>;

export type TextFilterValue = {
  type: ColumnFilterTypeValues["TEXT"];
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
  type: ColumnFilterTypeValues["NUMBER"];
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
  type: ColumnFilterTypeValues["DATE_RANGE"];
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
  range?: "past" | "future" | "any" | "customOnly";
  convertToTimeZone?: boolean;
};

export type TextFilterOptions = {
  allowedOperators?: TextFilterOperator[];
  placeholder?: string;
};

export type ColumnFilter = {
  id: string;
  value: FilterValue;
};

export const ZColumnFilter = z.object({
  id: z.string(),
  value: ZFilterValue,
}) satisfies z.ZodType<ColumnFilter>;

export type FilterValueSchema<T extends FilterType> = T extends ColumnFilterTypeValues["SINGLE_SELECT"]
  ? typeof ZSingleSelectFilterValue
  : T extends ColumnFilterTypeValues["MULTI_SELECT"]
    ? typeof ZMultiSelectFilterValue
    : T extends ColumnFilterTypeValues["TEXT"]
      ? typeof ZTextFilterValue
      : T extends ColumnFilterTypeValues["NUMBER"]
        ? typeof ZNumberFilterValue
        : T extends ColumnFilterTypeValues["DATE_RANGE"]
          ? typeof ZDateRangeFilterValue
          : never;

export type FilterValue<T extends FilterType = FilterType> = T extends ColumnFilterTypeValues["SINGLE_SELECT"]
  ? SingleSelectFilterValue
  : T extends ColumnFilterTypeValues["MULTI_SELECT"]
    ? MultiSelectFilterValue
    : T extends ColumnFilterTypeValues["TEXT"]
      ? TextFilterValue
      : T extends ColumnFilterTypeValues["NUMBER"]
        ? NumberFilterValue
        : T extends ColumnFilterTypeValues["DATE_RANGE"]
          ? DateRangeFilterValue
          : never;

export type TypedColumnFilter<T extends FilterType> = {
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

export type SystemFilterSegment = {
  id: string;
  name: string;
  activeFilters: ActiveFilters;
  sorting?: SortingState;
  columnVisibility?: Record<string, boolean>;
  columnSizing?: Record<string, number>;
  perPage?: number;
  searchTerm?: string | null;
  type: "system";
};

export type SystemFilterSegmentInternal = Omit<SystemFilterSegment, "perPage"> & {
  tableIdentifier: string;
  perPage: number;
};

export type UserFilterSegment = FilterSegmentOutput & {
  type: "user";
};

export type CombinedFilterSegment = SystemFilterSegmentInternal | UserFilterSegment;

export type SegmentIdentifier = { id: string; type: "system" } | { id: number; type: "user" };

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
  providedSegments?: FilterSegmentOutput[];
  systemSegments?: SystemFilterSegment[];
};

export type UseSegmentsReturn = {
  segments: CombinedFilterSegment[];
  preferredSegmentId: SegmentIdentifier | null;
  isSuccess: boolean;
  setPreference: ({
    tableIdentifier,
    segmentId,
  }: {
    tableIdentifier: string;
    segmentId: SegmentIdentifier | null;
  }) => void;
  isSegmentEnabled: boolean;
};
