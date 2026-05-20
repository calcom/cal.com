import { useDataTableContext } from "../DataTableProvider";

export function useColumnFilters({ exclude }: { exclude?: string[] } = {}) {
  const filters = useDataTableContext().columnFilters;
  if (!exclude?.length) return filters;
  return filters.filter((f) => !exclude.includes(f.id));
}
