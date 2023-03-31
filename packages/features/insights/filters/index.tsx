import { useFilterContext } from "@calcom/features/insights/context/provider";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Tooltip } from "@calcom/ui";
import { FiX } from "@calcom/ui/components/icon";

import { DateSelect } from "./DateSelect";
import { EventTypeListInTeam } from "./EventTypeListInTeam";
import { FilterType } from "./FilterType";
import { TeamList } from "./TeamList";
import { UserListInTeam } from "./UsersListInTeam";

const ClearFilters = () => {
  const { t } = useLocale();
  const { filter, setSelectedUserId, setSelectedFilter, setSelectedEventTypeId } = useFilterContext();
  const { selectedFilter } = filter;

  if (!selectedFilter || selectedFilter?.length < 1) return null;

  return (
    <Tooltip content={t("clear_filters")}>
      <Button
        variant="icon"
        color="secondary"
        target="_blank"
        rel="noreferrer"
        StartIcon={FiX}
        className="h-[38px]"
        onClick={() => {
          setSelectedFilter(null);
          setSelectedUserId(null);
          setSelectedEventTypeId(null);
        }}
      />
    </Tooltip>
  );
};

export const Filters = () => {
  return (
    <div className="mt-2 flex flex-col flex-wrap gap-2 md:flex-row lg:flex-nowrap">
      <TeamList />

      <FilterType />

      <UserListInTeam />

      <EventTypeListInTeam />

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
