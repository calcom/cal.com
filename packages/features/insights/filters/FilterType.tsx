import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { SVGComponent } from "@calcom/types/SVGComponent";
import {
  Dropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownItem,
  DropdownMenuTrigger,
  Tooltip,
} from "@calcom/ui";
import { Plus, Link, User, Check } from "@calcom/ui/components/icon";

import { useFilterContext } from "../context/provider";

type Option = { value: "event-type" | "user"; label: string; StartIcon?: SVGComponent };

export const FilterType = () => {
  const { t } = useLocale();
  const { filter, setConfigFilters } = useFilterContext();
  const { selectedFilter, selectedUserId } = filter;

  let filterOptions: Option[] = [
    {
      label: t("event_type"),
      value: "event-type",
      StartIcon: Link,
    },
    {
      label: t("user"),
      value: "user",
      StartIcon: User,
    },
  ];

  if (selectedUserId) {
    // remove user option from filterOptions
    filterOptions = filterOptions.filter((option) => option.value !== "user");
  }

  const filterValue = selectedFilter
    ? filterOptions.find((option) => option.value === selectedFilter[0])
    : null;

  return (
    <Dropdown>
      <DropdownMenuTrigger asChild>
        <div className="hover:border-emphasis border-default text-default hover:text-emphasis mb-4 flex h-9 max-h-72 items-center justify-between whitespace-nowrap rounded-md border px-3 py-2 text-sm hover:cursor-pointer focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-1">
          <Plus className="mr-2 h-4 w-4" />
          <Tooltip content={t("add_filter")}>
            <div>{t("add_filter")}</div>
          </Tooltip>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-44">
        {filterOptions?.map((option) => (
          <DropdownMenuItem key={option.label} className="w-44">
            <DropdownItem
              type="button"
              StartIcon={option.StartIcon}
              onClick={() => {
                // This can multiple values, but for now we only want to have one filter active at a time
                setConfigFilters({
                  selectedFilter: [option.value],
                });
              }}
              childrenClassName="w-full">
              <div className="flex w-full items-center justify-between">
                {t(option.label)}
                {filterValue?.value === option.value && <Check className="h-4 w-4" />}
              </div>
            </DropdownItem>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </Dropdown>
  );
};
