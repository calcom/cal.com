import type { z } from "zod";
import { useDataTableContext } from "../DataTableProvider";

export function useFilterValue<T extends z.ZodTypeAny>(id: string, schema: T): z.infer<T> | null {
  const { columnFilters } = useDataTableContext();
  const filter = columnFilters.find((f) => f.id === id);
  if (!filter) return null;
  const result = schema.safeParse(filter.value);
  return result.success ? result.data : null;
}
