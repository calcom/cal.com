import { Fragment, useState } from "react";

import { useFilterQuery } from "@calcom/features/bookings/lib/useFilterQuery";
import {
  TeamsFilter,
  FilterCheckboxFieldsContainer,
  FilterCheckboxField,
} from "@calcom/features/filters/components/TeamsFilter";
import cx from "@calcom/lib/classNames";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Dropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownItem,
  DropdownMenuTrigger,
  AnimatedPopover,
  Avatar,
  FilterSearchField,
  Tooltip,
} from "@calcom/ui";
import { Plus } from "@calcom/ui/components/icon";

import { useBookingMultiFilterStore } from "../BookingMultiFiltersStore";
import { EventTypeFilter } from "./EventTypeFilter";

const PeopleFilter = () => {
  const { t } = useLocale();
  const { data: query, pushItemToKey, removeItemByKeyAndValue, removeByKey } = useFilterQuery();
  const [searchText, setSearchText] = useState("");

  const members = trpc.viewer.teams.listMembers.useQuery({});

  const filteredMembers = members?.data?.filter((member) =>
    searchText.trim() !== ""
      ? member?.name?.toLowerCase()?.includes(searchText.toLowerCase()) ||
        member?.username?.toLowerCase()?.includes(searchText.toLowerCase())
      : true
  );

  return (
    <AnimatedPopover text={t("people")}>
      <FilterSearchField onChange={(e) => setSearchText(e.target.value)} placeholder={t("search")} />
      <FilterCheckboxFieldsContainer>
        {filteredMembers?.map((member) => (
          <FilterCheckboxField
            key={member.id}
            id={member.id.toString()}
            label={member?.name ?? "No Name"}
            checked={!!query.userIds?.includes(member.id)}
            onChange={(e) => {
              if (e.target.checked) {
                pushItemToKey("userIds", member.id);
              } else if (!e.target.checked) {
                removeItemByKeyAndValue("userIds", member.id);
              }
            }}
            icon={
              <Avatar
                alt={`${member?.id} avatar`}
                imageSrc={member.username ? `${WEBAPP_URL}/${member.username}/avatar.png` : undefined}
                size="xs"
              />
            }
          />
        ))}
      </FilterCheckboxFieldsContainer>
    </AnimatedPopover>
  );
};

const LocationFilter = () => {
  const { t } = useLocale();
  const locations = trpc.viewer.locationOptions.useQuery();

  const { data: query, pushItemToKey, removeItemByKeyAndValue, removeByKey } = useFilterQuery();

  return (
    <AnimatedPopover text={t("location")}>
      <FilterCheckboxFieldsContainer>
        {locations?.data?.map((location) => {
          return (
            <Fragment key={location.label}>
              <div className="text-subtle py-2 px-4 text-xs font-medium uppercase leading-none">
                {location.label}
              </div>
              {location.options?.map((option) => {
                return (
                  <FilterCheckboxField
                    key={option.value}
                    id={option.value}
                    label={option.label}
                    checked={!!query.locationValues?.includes(option.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        pushItemToKey("locationValues", option.value);
                      } else if (!e.target.checked) {
                        removeItemByKeyAndValue("locationValues", option.value);
                      }
                    }}
                    icon={
                      <img
                        src={option.icon}
                        alt="cover"
                        // invert all the icons except app icons
                        className={cx(
                          "h-3.5 w-3.5",
                          option.icon && !option.icon.startsWith("/app-store") && "dark:invert"
                        )}
                      />
                    }
                  />
                );
              })}
            </Fragment>
          );
        })}
      </FilterCheckboxFieldsContainer>
    </AnimatedPopover>
  );
};

export function FiltersContainer() {
  const { t } = useLocale();

  const [addFilterOptions, toggleOption, isFilterActive] = useBookingMultiFilterStore((state) => [
    state.addFilterOptions,
    state.toggleOption,
    state.isFilterActive,
  ]);

  const isPeopleFilterActive = isFilterActive("people");
  const isEventTypeFilterActive = isFilterActive("event_type");
  // const isDateRangeFilterActive = isFilterActive("date_range");
  const isLocationFilterActive = isFilterActive("location");

  return (
    <div className="flex w-full space-x-2 rtl:space-x-reverse">
      {addFilterOptions.length > 0 && (
        <Dropdown>
          <DropdownMenuTrigger asChild>
            <div className="hover:border-emphasis border-default text-default hover:text-emphasis mb-4 flex h-9 max-h-72 items-center justify-between whitespace-nowrap rounded-md border px-3 py-2 text-sm hover:cursor-pointer focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-1">
              <Plus className="mr-2 h-4 w-4" />
              <Tooltip content={t("add_filter")}>
                <div>{t("add_filter")}</div>
              </Tooltip>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            {addFilterOptions?.map((option) => (
              <DropdownMenuItem key={option.label}>
                <DropdownItem
                  type="button"
                  StartIcon={option.StartIcon}
                  onClick={() => {
                    toggleOption(option);
                  }}>
                  {t(option.label)}
                </DropdownItem>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </Dropdown>
      )}

      {isPeopleFilterActive && <PeopleFilter />}
      {isEventTypeFilterActive && <EventTypeFilter />}
      {isLocationFilterActive && <LocationFilter />}

      <TeamsFilter />
    </div>
  );
}
