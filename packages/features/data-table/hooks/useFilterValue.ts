import { useMemo } from "react";
import type { z } from "zod";

import type { FilterValueSchema, ZFilterValue } from "../lib/types";
import type { FilterType } from "@calcom/types/data-table";
import { useDataTable } from "./useDataTable";

export function useFilterValue<
  T extends FilterType,
  TSchema extends FilterValueSchema<T> | typeof ZFilterValue
>(columnId: string, schema: TSchema) {
  const { activeFilters } = useDataTable();
  return useMemo(() => {
    const value = activeFilters.find((filter) => filter.f === columnId)?.v;
    if (schema && value) {
      const result = schema.safeParse(value);
      if (result.success) {
        return result.data as z.infer<TSchema>;
      }
    }
    return undefined;
  }, [activeFilters, columnId, schema]);
}
