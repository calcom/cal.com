import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Tooltip } from "@calcom/ui";

import { useDataTable } from "../../hooks/useDataTable";

export const ClearFiltersButton = ({ exclude }: { exclude?: string[] }) => {
  const { t } = useLocale();
  const { activeFilters, clearAll } = useDataTable();

  if (!activeFilters?.length || (exclude && activeFilters.every((filter) => exclude.includes(filter.f)))) {
    return null;
  }

  return (
    <Tooltip content={t("clear_filters")}>
      <Button
        color="minimal"
        data-testid="clear-filters-button"
        target="_blank"
        rel="noreferrer"
        StartIcon="x"
        onClick={() => clearAll(exclude)}>
        {t("clear")}
      </Button>
    </Tooltip>
  );
};
