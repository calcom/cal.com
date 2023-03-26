import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Select } from "@calcom/ui";
import { FiFilter } from "@calcom/ui/components/icon";

import { useFilterContext } from "../context/provider";

type Option = { value: "event-type" | "user"; label: string };

export const FilterType = () => {
  const { t } = useLocale();
  const {
    filter: { selectedFilter },
    setSelectedFilter,
    setSelectedUserId,
    setSelectedEventTypeId,
  } = useFilterContext();

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

  return (
    <Select<Option>
      isMulti={false}
      isSearchable={false}
      defaultValue={filterOptions.find(({ value }) => value === selectedFilter?.[0])}
      options={filterOptions}
      onChange={(input) => {
        if (input) {
          // This can multiple values, but for now we only want to have one filter active at a time

          setSelectedFilter([input.value]);
          if (input.value === "event-type") {
            setSelectedUserId(undefined);
          } else if (input.value === "user") {
            setSelectedEventTypeId(undefined);
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
