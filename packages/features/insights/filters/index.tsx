import { useFilterContext } from "@calcom/features/insights/context/provider";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Tooltip } from "@calcom/ui";

import { DateSelect } from "./DateSelect";
import { EventTypeList } from "./EventTypeList";
import { FilterType } from "./FilterType";
import { TeamAndSelfList } from "./TeamAndSelfList";
import { UserListInTeam } from "./UsersListInTeam";

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
        className="h-[38px]"
        onClick={() => {
          clearFilters();
        }}>
        {t("clear_filters")}
      </Button>
    </Tooltip>
  );
};

export const Filters = () => {
  return (
    <div className="mt-2 flex flex-col flex-wrap gap-2 md:flex-row lg:flex-nowrap">
      <TeamAndSelfList />

      <FilterType />

      <UserListInTeam />

      <EventTypeList />

      <DateSelect />

      <ClearFilters />

      {/* @NOTE: To be released in next iteration */}
      {/* <ButtonGroup combined containerProps={{ className: "hidden lg:flex mr-2" }}>
         <Tooltip content={t("settings")}>
                  <Button
                    variant="icon"
                    color="secondary"
                    target="_blank"
                    rel="noreferrer"
                    StartIcon={FiSettings}
                    className="h-[38px]"
                  />
                </Tooltip>
         <Tooltip content={t("download_csv")>
          <Button
            variant="icon"
            color="secondary"
            target="_blank"
            rel="noreferrer"
            StartIcon={FiDownload}
            className="h-[38px]"
          />
        </Tooltip>
      </ButtonGroup> */}
    </div>
  );
};
