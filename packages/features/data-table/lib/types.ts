import { z } from "zod";

import type { IconName } from "@calcom/ui/components/icon/icon-names";

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

export const ZSelectFilterValue = z.array(z.string());

export type SelectFilterValue = z.infer<typeof ZSelectFilterValue>;

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

export const ZFilterValue = z.union([ZSelectFilterValue, ZTextFilterValue, ZNumberFilterValue]);

export type FilterValue = z.infer<typeof ZFilterValue>;

export type ColumnFilterMeta = {
  type?: "select" | "text" | "number";
  icon?: IconName;
};

export type FilterableColumn = {
  id: string;
  title: string;
} & (
  | {
      type: "select";
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

export type ExternalFilter = {
  key: string;
  titleKey: string;
  component: () => React.ReactNode;
};
