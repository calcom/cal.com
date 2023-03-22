import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Select } from "@calcom/ui";
import { FiFilter } from "@calcom/ui/components/icon";

import { useFilterContext } from "../UseFilterContext";

const FilterType = () => {
  const { t } = useLocale();
  const { setSelectedFilter, setSelectedUserId, setSelectedEventTypeId } = useFilterContext();

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

  return (
    <Select
      isMulti={false}
      options={filterOptions}
      onChange={(input: { value: "event-type" | "user"; label: string }) => {
        if (input) {
          // This can multiple values, but for now we only want to have one filter active at a time
          setSelectedFilter([input.value]);
          if (input.value === "event-type") {
            setSelectedUserId(null);
          } else if (input.value === "user") {
            setSelectedEventTypeId(null);
          }
        }
      }}
      className="mx-2 w-32 min-w-[140px]"
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
