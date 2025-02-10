import { useFilterContext } from "@calcom/features/insights/context/provider";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Tooltip } from "@calcom/ui";

import { DateSelect } from "./DateSelect";
import { Download } from "./Download";
import { EventTypeList } from "./EventTypeList";
import { FilterType } from "./FilterType";
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
        color="minimal"
        target="_blank"
        rel="noreferrer"
        StartIcon="x"
        onClick={() => {
          clearFilters();
        }}>
        {t("clear")}
      </Button>
    </Tooltip>
  );
};

export const Filters = () => {
  return (
    <div className="mb-2 ml-auto mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-nowrap sm:justify-start">
        <TeamAndSelfList omitOrg={false} />

        <UserListInTeam />

        <EventTypeList />

        <FilterType />

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
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-nowrap sm:justify-between">
        <Download />
        <DateSelect />
      </div>
    </div>
  );
};
