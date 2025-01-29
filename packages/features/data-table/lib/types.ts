import { z } from "zod";

import type { IconName } from "@calcom/ui";

export enum ColumnFilterType {
  SINGLE_SELECT = "ss",
  MULTI_SELECT = "ms",
  TEXT = "t",
  NUMBER = "n",
  DATE_RANGE = "dr",
}

export const ZTextFilterOperator = z.enum([
  "equals",
  "notEquals",
  "contains",
  "notContains",
  "startsWith",
  "endsWith",
  "isEmpty",
  "isNotEmpty",
]);

export type TextFilterOperator = z.infer<typeof ZTextFilterOperator>;

export const ZSingleSelectFilterValue = z.object({
  type: z.literal(ColumnFilterType.SINGLE_SELECT),
  data: z.union([z.string(), z.number()]),
});

export type SingleSelectFilterValue = z.infer<typeof ZSingleSelectFilterValue>;

export const ZMultiSelectFilterValue = z.object({
  type: z.literal(ColumnFilterType.MULTI_SELECT),
  data: z.union([z.string(), z.number()]).array(),
});

export type MultiSelectFilterValue = z.infer<typeof ZMultiSelectFilterValue>;

export const ZTextFilterValue = z.object({
  type: z.literal(ColumnFilterType.TEXT),
  data: z.object({
    operator: ZTextFilterOperator,
    operand: z.string(),
  }),
});

export type TextFilterValue = z.infer<typeof ZTextFilterValue>;

export const ZNumberFilterOperator = z.enum([
  "eq", // =
  "neq", // !=
  "gt", // >
  "gte", // >=
  "lt", // <
  "lte", // <=
]);

export type NumberFilterOperator = z.infer<typeof ZNumberFilterOperator>;

export const ZNumberFilterValue = z.object({
  type: z.literal(ColumnFilterType.NUMBER),
  data: z.object({
    operator: ZNumberFilterOperator,
    operand: z.number(),
  }),
});

export type NumberFilterValue = z.infer<typeof ZNumberFilterValue>;

export const ZDateRangeFilterValue = z.object({
  type: z.literal(ColumnFilterType.DATE_RANGE),
  data: z.object({
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    preset: z.string(),
  }),
});

export type DateRangeFilterValue = z.infer<typeof ZDateRangeFilterValue>;

export const ZFilterValue = z.union([
  ZSingleSelectFilterValue,
  ZMultiSelectFilterValue,
  ZTextFilterValue,
  ZNumberFilterValue,
  ZDateRangeFilterValue,
]);

export type FilterValue = z.infer<typeof ZFilterValue>;

export type ColumnFilterMeta = {
  type?: ColumnFilterType;
  icon?: IconName;
};

export type FilterableColumn = {
  id: string;
  title: string;
  icon?: IconName;
} & (
  | {
      type: ColumnFilterType.SINGLE_SELECT;
      options: Array<{ label: string; value: string | number }>;
    }
  | {
      type: ColumnFilterType.MULTI_SELECT;
      options: Array<{ label: string; value: string | number }>;
    }
  | {
      type: ColumnFilterType.TEXT;
    }
  | {
      type: ColumnFilterType.NUMBER;
    }
  | {
      type: ColumnFilterType.DATE_RANGE;
    }
);

export const ZColumnFilter = z.object({
  id: z.string(),
  value: ZFilterValue,
});

export type ColumnFilter = z.infer<typeof ZColumnFilter>;

export type TypedColumnFilter<T extends ColumnFilterType> = {
  id: string;
  value: T extends ColumnFilterType.TEXT
    ? TextFilterValue
    : T extends ColumnFilterType.NUMBER
    ? NumberFilterValue
    : T extends ColumnFilterType.SINGLE_SELECT
    ? SingleSelectFilterValue
    : T extends ColumnFilterType.MULTI_SELECT
    ? MultiSelectFilterValue
    : T extends ColumnFilterType.DATE_RANGE
    ? DateRangeFilterValue
    : never;
};

export const ZSorting = z.object({
  id: z.string(),
  desc: z.boolean(),
});

export type SortingState = Array<z.infer<typeof ZSorting>>;
