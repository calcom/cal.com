import { DateRangePicker } from "@tremor/react";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { useFilterContext } from "../context/provider";

type RangeType = "tdy" | "w" | "t" | "m" | "y" | undefined | null;

export const DateSelect = () => {
  const { t } = useLocale();
  const { filter, setDateRange } = useFilterContext();
  const currentDate = dayjs();
  const [startDate, endDate, range] = filter.dateRange;
  const startValue = startDate?.toDate() || null;
  const endValue = endDate?.toDate() || null;
  return (
    <DateRangePicker
      value={[startValue, endValue, range]}
      defaultValue={[startValue, endValue, range]}
      onValueChange={(datesArray) => {
        const [selected, ...rest] = datesArray;
        const [start, end, range] = datesArray;
        // If range has value and it's of type RangeType

        if (range && (range === "tdy" || range === "w" || range === "t" || range === "m" || range === "y")) {
          setDateRange([dayjs(start), dayjs(end), range]);
          return;
        } else if (start && !end) {
          // If only start time has value that means selected date should push to dateRange with last value null
          const currentDates = filter.dateRange;
          // remove last position of array
          currentDates.pop();
          // push new value to array
          currentDates.push(dayjs(selected));
          // if lenght > 2 then remove first value
          if (currentDates.length > 2) {
            currentDates.shift();
          }

          setDateRange([currentDates[0], currentDates[1], null]);

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
      color="blue"
      className="h-[42px] max-w-sm"
    />
  );
};
