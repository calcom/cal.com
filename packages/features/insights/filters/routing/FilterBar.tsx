import { DataTableFilters } from "@calcom/features/data-table";
import type { RoutingFormTableType } from "@calcom/features/insights/components/RoutingFormResponsesTable";
import { useFilterContext } from "@calcom/features/insights/context/provider";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Icon, Tooltip } from "@calcom/ui";

import { BookingStatusFilter } from "../BookingStatusFilter";
import { DateSelect } from "../DateSelect";
import { RoutingDownload } from "../Download";
import { FilterType } from "../FilterType";
import { RoutingFormFieldFilter } from "../RoutingFormFieldFilter";
import { RoutingFormFilterList } from "../RoutingFormFilterList";
import { TeamAndSelfList } from "../TeamAndSelfList";
import { UserListInTeam } from "../UsersListInTeam";

const ClearFilters = () => {
  const { t } = useLocale();
  const { filter, clearFilters } = useFilterContext();
  const { selectedFilter } = filter;

  if (!selectedFilter || selectedFilter?.length < 1) return null;

  return (
    <Tooltip content={t("clear_filters")}>
      <Button
        variant="icon"
        color="secondary"
        target="_blank"
        rel="noreferrer"
        className="min-w-24 h-[38px] border-0"
        onClick={() => {
          clearFilters();
        }}>
        <Icon name="x" className="mr-1 h-4 w-4" />
        {t("clear")}
      </Button>
    </Tooltip>
  );
};

export const RoutingInsightsFilters = ({ table }: { table: RoutingFormTableType }) => {
  const { filter } = useFilterContext();
  const { selectedFilter } = filter;

  // Get all filters that relate to the routing form
  const routingFormFieldIds = selectedFilter
    ? selectedFilter.map((filter) => {
        if (filter.startsWith("rf_")) return filter.substring(3);
      })
    : [];

  return (
    <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
      <div className="flex flex-wrap gap-2 sm:flex-row sm:justify-start">
        <TeamAndSelfList omitOrg={true} />

        <UserListInTeam />

        <RoutingFormFilterList />
        <BookingStatusFilter />
        {routingFormFieldIds.map((fieldId) => {
          if (fieldId) return <RoutingFormFieldFilter key={fieldId} fieldId={fieldId} />;
        })}

        <FilterType showRoutingFilters={true} />

        <ClearFilters />
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:flex-nowrap sm:justify-between">
        <RoutingDownload />
        <DateSelect />
        <DataTableFilters.ColumnVisibilityButton table={table} />
      </div>
    </div>
  );
};
