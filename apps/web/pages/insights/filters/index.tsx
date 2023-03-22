import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  Button,
  ButtonGroup,
  Dropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  Select,
} from "@calcom/ui";
import { FiFilter, FiLink, FiUser } from "@calcom/ui/components/icon";

import { useFilterContext } from "../UseFilterContext";
import { DateSelect } from "./DateSelect";
import { EventTypeListInTeam } from "./EventTypeListInTeam";
import { TeamList } from "./TeamList";
import { UserListInTeam } from "./UsersListInTeam";

const filterOptions = [
  {
    label: "Event Type",
    value: "event-type",
  },
  {
    label: "User",
    value: "user",
  },
];

const Filters = () => {
  const { t } = useLocale();
  const { filter, setSelectedFilter } = useFilterContext();
  const { selectedFilter } = filter;
  return (
    <>
      <TeamList />

      <Select
        isMulti={false}
        options={filterOptions}
        className="mx-2 w-32"
        placeholder={
          <div className="flex flex-row">
            <FiFilter className="m-auto" />
            Add Filter
          </div>
        }
      />
      <Dropdown>
        <DropdownMenuTrigger className="mx-2 py-0 px-0">
          <Tooltip content={t("filter") /* Filter */}>
            <Button
              variant="button"
              color="secondary"
              target="_blank"
              rel="noreferrer"
              StartIcon={FiFilter}
              className="w-32">
              <p>Add filter</p>
            </Button>
          </Tooltip>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            className="px-3 py-2"
            onClick={() => {
              if (selectedFilter?.includes("event-type")) {
                // If "event-type" is already selected, remove it from the selected filters
                setSelectedFilter(
                  selectedFilter.filter((item: "event-type" | "user") => item !== "event-type")
                );
              }
              if (!selectedFilter?.includes("event-type")) {
                // If "event-type" is not selected, add it to the selected filters
                setSelectedFilter([...(selectedFilter ?? []), "event-type"]);
              }
            }}>
            <p className="flex flex-row">
              <FiLink className="mr-2 h-4 w-4" /> Event Type
              {/* Add checkbox to display if filter its active */}
            </p>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="px-3 py-2"
            onClick={(event) => {
              if (selectedFilter?.includes("user")) {
                // If "user" is already selected, remove it from the selected filters
                setSelectedFilter(selectedFilter.filter((item: "event-type" | "user") => item !== "user"));
              }

              if (!selectedFilter?.includes("user")) {
                // If "user" is not selected, add it to the selected filters
                setSelectedFilter([...(selectedFilter ?? []), "user"]);
              }
            }}>
            <p className="flex flex-row">
              <FiUser className="mr-2 h-4 w-4" /> User
              {/* Add checkbox to display if filter its active */}
            </p>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </Dropdown>

      <UserListInTeam />

      <EventTypeListInTeam />

      <ButtonGroup combined containerProps={{ className: "hidden lg:flex mr-2" }}>
        {/* <Tooltip content={t("settings")}>
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
        </Tooltip> */}
      </ButtonGroup>
      <DateSelect />
    </>
  );
};

export { Filters };
