import { z } from "zod";

import type { IconName } from "@calcom/ui";

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
  type: z.literal("single_select"),
  data: z.string(),
});

export type SingleSelectFilterValue = z.infer<typeof ZSingleSelectFilterValue>;

export const ZMultiSelectFilterValue = z.object({
  type: z.literal("multi_select"),
  data: z.array(z.string()),
});

export type MultiSelectFilterValue = z.infer<typeof ZMultiSelectFilterValue>;

export const ZTextFilterValue = z.object({
  type: z.literal("text"),
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
  type: z.literal("number"),
  data: z.object({
    operator: ZNumberFilterOperator,
    operand: z.number(),
  }),
});

export type NumberFilterValue = z.infer<typeof ZNumberFilterValue>;

export const ZFilterValue = z.union([
  ZSingleSelectFilterValue,
  ZMultiSelectFilterValue,
  ZTextFilterValue,
  ZNumberFilterValue,
]);

export type FilterValue = z.infer<typeof ZFilterValue>;

export type ColumnFilterType = "single_select" | "multi_select" | "text" | "number";

export type ColumnFilterMeta = {
  type?: ColumnFilterType;
  icon?: IconName;
};

export type FilterableColumn = {
  id: string;
  title: string;
} & (
  | {
      type: "single_select";
      icon?: IconName;
      options: Map<string | { label: string; value: string }, number>;
    }
  | {
      type: "multi_select";
      icon?: IconName;
      options: Map<string | { label: string; value: string }, number>;
    }
  | {
      type: "text";
      icon?: IconName;
    }
  | {
      type: "number";
      icon?: IconName;
    }
);

export const ZColumnFilter = z.object({
  id: z.string(),
  value: ZFilterValue,
});

export type ColumnFilter = z.infer<typeof ZColumnFilter>;

export type TypedColumnFilter<T extends ColumnFilterType> = {
  id: string;
  value: T extends "text"
    ? TextFilterValue
    : T extends "number"
    ? NumberFilterValue
    : T extends "single_select"
    ? SingleSelectFilterValue
    : T extends "multi_select"
    ? MultiSelectFilterValue
    : never;
};

export type ExternalFilter = {
  key: string;
  titleKey: string;
  component: () => React.ReactNode;
};
