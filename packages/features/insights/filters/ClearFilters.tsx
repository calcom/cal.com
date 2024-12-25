import { useDataTable } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon, Button, Tooltip } from "@calcom/ui";

import { useFilterContext } from "../context/provider";

// This component clears filters from both:
// - the filter from FilterContext
// - the data table filters state
export const ClearFilters = () => {
  const { t } = useLocale();
  const { clearFilters, filter } = useFilterContext();
  const { activeFilters, clearAll } = useDataTable();

  const clear = () => {
    // clear filters from the filter context
    clearFilters();

    // clear filters from the data table state
    clearAll();
  };

  const { initialConfig, selectedTeamId, selectedMemberUserId } = filter;

  const isFilterSelected =
    initialConfig?.teamId !== selectedTeamId ||
    initialConfig?.userId !== selectedMemberUserId ||
    activeFilters?.length > 0;

  if (!isFilterSelected) {
    return null;
  }

  return (
    <Tooltip content={t("clear_filters")}>
      <Button
        variant="icon"
        color="secondary"
        target="_blank"
        rel="noreferrer"
        className="min-w-24 h-[38px] border-0"
        onClick={clear}>
        <Icon name="x" className="mr-1 h-4 w-4" />
        {t("clear")}
      </Button>
    </Tooltip>
  );
};
