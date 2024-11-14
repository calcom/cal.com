import { z } from "zod";

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

export const ZFilterValue = z.union([ZSelectFilterValue, ZTextFilterValue]);

export type FilterValue = z.infer<typeof ZFilterValue>;

export type FilterableColumn = {
  id: string;
  title: string;
  filterType: "text" | "select";
  options: Map<string, number>;
};
