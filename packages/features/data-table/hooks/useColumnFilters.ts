import { useDataTableContext } from "../DataTableProvider";

export function useColumnFilters() {
  return useDataTableContext().columnFilters;
}
