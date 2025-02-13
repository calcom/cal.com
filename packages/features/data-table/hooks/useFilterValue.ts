import { useMemo } from "react";
import type { z } from "zod";

import { useDataTable } from "./useDataTable";

export function useFilterValue<T>(columnId: string, schema: z.ZodType<T>) {
  const { activeFilters } = useDataTable();
  return useMemo(() => {
    const value = activeFilters.find((filter) => filter.f === columnId)?.v;
    if (schema && value) {
      const result = schema.safeParse(value);
      if (result.success) {
        return result.data;
      }
    }
    return undefined;
  }, [activeFilters, columnId, schema]);
}
