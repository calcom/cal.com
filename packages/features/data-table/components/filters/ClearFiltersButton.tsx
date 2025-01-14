import { useDataTable } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon, Button, Tooltip } from "@calcom/ui";

export const ClearFiltersButton = () => {
  const { t } = useLocale();
  const { activeFilters, clearAll } = useDataTable();

  if (!activeFilters?.length) {
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
        onClick={clearAll}>
        <Icon name="x" className="mr-1 h-4 w-4" />
        {t("clear")}
      </Button>
    </Tooltip>
  );
};
