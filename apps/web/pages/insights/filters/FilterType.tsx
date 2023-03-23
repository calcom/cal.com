import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Select } from "@calcom/ui";
import { FiFilter } from "@calcom/ui/components/icon";

import { useFilterContext } from "../UseFilterContext";

const FilterType = () => {
  const { t } = useLocale();
  const { setSelectedFilter, setSelectedUserId, setSelectedEventTypeId, filter } = useFilterContext();
  const { selectedFilter } = filter;

  const filterOptions = [
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
    <Select<{ label: string; value: string }>
      options={filterOptions}
      value={filterValue}
      defaultValue={filterValue}
      onChange={(newValue) => {
        if (newValue) {
          // This can multiple values, but for now we only want to have one filter active at a time
          setSelectedFilter([newValue.value as "event-type" | "user"]);
          if (newValue.value === "event-type") {
            setSelectedUserId(null);
          } else if (newValue.value === "user") {
            setSelectedEventTypeId(null);
          }
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

export { FilterType };
