import { DateRangePicker } from "@tremor/react";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { useFilterContext } from "../context/provider";
import "./DateSelect.css";

type RangeType = "tdy" | "w" | "t" | "m" | "y" | undefined | null;

export const DateSelect = () => {
  const { t } = useLocale();
  const { filter, setConfigFilters } = useFilterContext();
  const currentDate = dayjs();
  const [startDate, endDate, range] = filter?.dateRange || [null, null, null];
  const startValue = startDate?.toDate() || null;
  const endValue = endDate?.toDate() || null;
  return (
    <div className="custom-date max-w-96 w-full sm:w-auto">
      <DateRangePicker
        value={[startValue, endValue, range]}
        defaultValue={[startValue, endValue, range]}
        onValueChange={(datesArray) => {
          const [selected, ...rest] = datesArray;
          const [start, end, range] = datesArray;
          // If range has value and it's of type RangeType

          if (
            range &&
            (range === "tdy" || range === "w" || range === "t" || range === "m" || range === "y")
          ) {
            setConfigFilters({
              dateRange: [dayjs(start).startOf("d"), dayjs(end).endOf("d"), range],
            });

            return;
          } else if (start && !end) {
            // If only start time has value that means selected date should push to dateRange with last value null
            const currentDates = filter.dateRange;
            if (currentDates && currentDates.length > 0) {
              // remove last position of array
              currentDates.pop();
              // push new value to array
              currentDates.push(dayjs(selected));
              // if lenght > 2 then remove first value
              if (currentDates.length > 2) {
                currentDates.shift();
              }
              setConfigFilters({
                dateRange: [currentDates[0], currentDates[1], null],
              });
            }

            return;
          }

          // If range has value and it's of type RangeType
        }}
        options={undefined}
        enableDropdown={true}
        placeholder={t("select_date_range")}
        enableYearPagination={true}
        minDate={currentDate.subtract(2, "year").toDate()}
        maxDate={currentDate.toDate()}
        color="gray"
      />
    </div>
  );
};
