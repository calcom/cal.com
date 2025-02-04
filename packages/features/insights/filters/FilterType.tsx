import { useMemo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { IconName } from "@calcom/ui";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icon,
  Tooltip,
} from "@calcom/ui";

import { useFilterContext } from "../context/provider";

type FilterType = "event-type" | "user" | "routing_forms" | `rf_${string}` | "booking_status";

type Option = {
  value: FilterType;
  label: string;
  StartIcon: IconName;
};

export const FilterType = () => {
  const { t } = useLocale();
  const { filter, setConfigFilters } = useFilterContext();
  const { selectedFilter, selectedUserId } = filter;

  const filterOptions = useMemo(() => {
    let options: Option[] = [
      {
        label: t("user"),
        value: "user",
        StartIcon: "users" as IconName,
      },
    ];

    options.push({
      label: t("event_type"),
      value: "event-type",
      StartIcon: "link",
    });

    if (selectedUserId) {
      // remove user option from filterOptions
      options = options.filter((option) => option.value !== "user");
    }

    return options;
  }, [t, selectedUserId]);

  return (
    <Dropdown>
      <DropdownMenuTrigger asChild>
        <div className="hover:border-emphasis border-default text-default hover:text-emphasis focus:border-subtle mb-4 flex h-9 max-h-72 items-center justify-between whitespace-nowrap rounded-md border px-3 py-2 text-sm hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-1">
          <Icon name="plus" className="mr-2 h-4 w-4" />
          <Tooltip content={t("add_filter")}>
            <div>{selectedFilter?.length ? `${selectedFilter.length} ${t("filters")}` : t("add_filter")}</div>
          </Tooltip>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="z-50">
        {filterOptions?.map((option) => (
          <DropdownMenuItem key={option.label} className="w-full">
            <DropdownItem
              type="button"
              StartIcon={option.StartIcon}
              onClick={() => {
                setConfigFilters({
                  selectedFilter: selectedFilter
                    ? selectedFilter.includes(option.value)
                      ? selectedFilter.filter((f) => f !== option.value)
                      : [...selectedFilter, option.value]
                    : [option.value],
                });
              }}
              childrenClassName="w-full">
              <div className="flex w-full items-center justify-between whitespace-normal">
                <span className="mr-2">{t(option.label)}</span>
                {selectedFilter?.includes(option.value) && (
                  <Icon name="check" className="h-4 w-4 flex-shrink-0" />
                )}
              </div>
            </DropdownItem>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </Dropdown>
  );
};
