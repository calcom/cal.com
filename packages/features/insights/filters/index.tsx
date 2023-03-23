import { DateSelect } from "./DateSelect";
import { EventTypeListInTeam } from "./EventTypeListInTeam";
import { FilterType } from "./FilterType";
import { TeamList } from "./TeamList";
import { UserListInTeam } from "./UsersListInTeam";

export const Filters = () => {
  return (
    <div className="mt-2 flex flex-col flex-wrap gap-2 md:flex-row md:flex-nowrap">
      <TeamList />

      <FilterType />

      <UserListInTeam />

      <EventTypeListInTeam />

      <DateSelect />

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
