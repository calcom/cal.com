import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Select } from "@calcom/ui";
import { FiFilter } from "@calcom/ui/components/icon";

import { useFilterContext } from "../context/provider";

type Option = { value: "event-type" | "user"; label: string };

export const FilterType = () => {
  const { t } = useLocale();
  const { setSelectedFilter, setSelectedUserId, setSelectedEventTypeId, filter } = useFilterContext();
  const { selectedFilter } = filter;

  const filterOptions: Option[] = [
    {
      label: t("event_type"),
      value: "event-type",
    },
    {
      label: t("user"),
      value: "user",
    },
  ];

  const filterValue = selectedFilter
    ? filterOptions.find((option) => option.value === selectedFilter[0])
    : undefined;

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
      className="w-32 min-w-[130px]"
      placeholder={
        <div className="flex flex-row text-gray-900">
          <FiFilter className="m-auto text-gray-900" />
          {t("add_filter")}
        </div>
      }
    />
  );
};
