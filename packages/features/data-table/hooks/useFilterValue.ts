import { useMemo } from "react";
import type { z } from "zod";

import type { FilterValueSchema, ColumnFilterType, ZFilterValue } from "../lib/types";
import { useDataTable } from "./useDataTable";

export function useFilterValue<
  T extends ColumnFilterType,
  TSchema extends FilterValueSchema<T> | typeof ZFilterValue
>(columnId: string, schema: TSchema) {
  const { activeFilters } = useDataTable();
  console.log('active filters ', activeFilters)
  return useMemo(() => {
    const value = activeFilters.find((filter) => filter.f === columnId)?.v;
    if (schema && value) {
      const result = schema.safeParse(value);
      console.log('result ', result)
      if (result.success) {
        return result.data as z.infer<TSchema>;
      }
    }
    return undefined;
  }, [activeFilters, columnId, schema]);
}
