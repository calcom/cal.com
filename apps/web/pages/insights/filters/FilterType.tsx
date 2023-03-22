import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Select } from "@calcom/ui";
import { FiFilter } from "@calcom/ui/components/icon";

import { useFilterContext } from "../UseFilterContext";

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

const FilterType = () => {
  const { t } = useLocale();
  const { filter, setSelectedFilter } = useFilterContext();

  return (
    <Select
      isMulti={false}
      options={filterOptions}
      onChange={(input: { value: "event-type" | "user"; label: string }) => {
        if (input) {
          if (filter.selectedFilter?.includes(input.value)) {
            setSelectedFilter(filter.selectedFilter.filter((item) => item !== input.value));
          } else {
            setSelectedFilter([...(filter.selectedFilter ?? []), input.value]);
          }
        }
      }}
      className="mx-2 w-32"
      placeholder={
        <div className="flex flex-row">
          <FiFilter className="m-auto" />
          Add Filter
        </div>
      }
    />
  );
};

export { FilterType };
