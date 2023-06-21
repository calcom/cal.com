import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Select } from "@calcom/ui";
import { Plus } from "@calcom/ui/components/icon";

import { useFilterContext } from "../context/provider";

type Option = { value: "event-type" | "user"; label: string };

export const FilterType = () => {
  const { t } = useLocale();
  const { setSelectedFilter, filter } = useFilterContext();
  const { selectedFilter, selectedUserId } = filter;

  let filterOptions: Option[] = [
    {
      label: t("event_type"),
      value: "event-type",
    },
    {
      label: t("user"),
      value: "user",
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
    <Select<Option>
      options={filterOptions}
      value={filterValue}
      defaultValue={filterValue}
      onChange={(newValue) => {
        if (newValue) {
          // This can multiple values, but for now we only want to have one filter active at a time
          setSelectedFilter([newValue.value]);
        }
      }}
      className="flex-2 w-full min-w-[180px] sm:max-w-[180px] lg:max-w-[150px]"
      placeholder={
        <div className="text-emphasis flex">
          <Plus className="mr-2 h-4 w-4" />
          <p>{t("add_filter")}</p>
        </div>
      }
    />
  );
};
