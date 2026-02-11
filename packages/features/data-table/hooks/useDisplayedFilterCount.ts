import { useMemo } from "react";

import { useDataTable } from "./useDataTable";

type UseDisplayedFilterCountProps = {
  columnIdsToHide?: string[];
};

export const useDisplayedFilterCount = ({ columnIdsToHide }: UseDisplayedFilterCountProps = {}) => {
  const { activeFilters } = useDataTable();
  return useMemo(() => {
    return (activeFilters ?? []).filter((filter) =>
      columnIdsToHide ? !columnIdsToHide.includes(filter.f) : true
    ).length;
  }, [activeFilters, columnIdsToHide]);
};
