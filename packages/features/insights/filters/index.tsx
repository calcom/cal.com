import { useFilterContext } from "@calcom/features/insights/context/provider";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Icon, Tooltip } from "@calcom/ui";

import { BookingStatusFilter } from "./BookingStatusFilter";
import { DateSelect } from "./DateSelect";
import { Download, RoutingDownload } from "./Download";
import { EventTypeList } from "./EventTypeList";
import { FilterType } from "./FilterType";
import { RoutingFormFieldFilter } from "./RoutingFormFieldFilter";
import { RoutingFormFilterList } from "./RoutingFormFilterList";
import { TeamAndSelfList } from "./TeamAndSelfList";
import { UserListInTeam } from "./UserListInTeam";

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

export const Filters = ({ showRoutingFilters = false }: { showRoutingFilters?: boolean }) => {
  const { filter } = useFilterContext();
  const { selectedFilter } = filter;

  // Get all filters that relate to the routing form
  const routingFormFieldIds = selectedFilter
    ? selectedFilter.map((filter) => {
        if (filter.startsWith("rf_")) return filter.substring(3);
      })
    : [];

  return (
    <div className="ml-auto mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-nowrap sm:justify-start">
        <TeamAndSelfList omitOrg={showRoutingFilters} />

        <UserListInTeam />

        <EventTypeList />

        {showRoutingFilters ? (
          <>
            <RoutingFormFilterList />
            <BookingStatusFilter />
            {routingFormFieldIds.map((fieldId) => {
              if (fieldId) return <RoutingFormFieldFilter fieldId={fieldId} />;
            })}
          </>
        ) : null}

        <FilterType showRoutingFilters={showRoutingFilters} />

        <ClearFilters />
      </div>

      {/* @NOTE: To be released in next iteration */}
      {/* <ButtonGroup combined containerProps={{ className: "hidden lg:flex mr-2" }}>
         <Tooltip content={t("settings")}>
                  <Button
                    variant="icon"
                    color="secondary"
                    target="_blank"
                    rel="noreferrer"
                    StartIcon="settings"
                    className="h-[38px]"
                  />
                </Tooltip>
         <Tooltip content={t("download_csv")>
          <Button
            variant="icon"
            color="secondary"
            target="_blank"
            rel="noreferrer"
            StartIcon="download"
            className="h-[38px]"
          />
        </Tooltip>
      </ButtonGroup> */}
      <div className="flex flex-col-reverse sm:flex-row sm:flex-nowrap sm:justify-between">
        {showRoutingFilters ? <RoutingDownload /> : <Download />}
        <DateSelect className="me-2 ms-2" />
      </div>
    </div>
  );
};
