import { useDataTable } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Tooltip } from "@calcom/ui";

export const ClearFiltersButton = ({ exclude }: { exclude?: string[] }) => {
  const { t } = useLocale();
  const { activeFilters, clearAll } = useDataTable();

  if (!activeFilters?.length || (exclude && activeFilters.every((filter) => exclude.includes(filter.f)))) {
    return null;
  }

  return (
    <Tooltip content={t("clear_filters")}>
      <Button
        color="secondary"
        target="_blank"
        rel="noreferrer"
        className="min-w-24 border-0"
        StartIcon="x"
        onClick={() => clearAll(exclude)}>
        {t("clear")}
      </Button>
    </Tooltip>
  );
};
