import { DateRangePicker } from "@tremor/react";
import { useState } from "react";

import dayjs from "@calcom/dayjs";

import { useFilterContext } from "../UseFilterContext";

type RangeType = "tdy" | "w" | "t" | "m" | "y" | undefined;

const DateSelect = () => {
  const { filter, setDateRange } = useFilterContext();
  const currentDate = dayjs();
  const { startDate, endDate } = filter.dateRange;
  const start = startDate?.toDate() || null;
  const end = endDate?.toDate() || null;
  const [timeRange, setTimeRange] = useState<RangeType>("t");
  return (
    <DateRangePicker
      value={[start, end, timeRange]}
      defaultValue={[start, end, timeRange]}
      onValueChange={(datesArray) => {
        console.log({ datesArray });
        const [selected, ...rest] = datesArray;
        const [start, end, range] = datesArray;
        // If range has value and it's of type RangeType
        if (range && (range === "tdy" || range === "w" || range === "t" || range === "m" || range === "y")) {
          setTimeRange(range);
        }
        if (start && end) {
          setDateRange({ startDate: dayjs(start), endDate: dayjs(end) });
          return;
        } else if (start && !end) {
          const newDates = [end, selected];
          setDateRange({ startDate: dayjs(newDates[0]), endDate: dayjs(newDates[1]) });
        }
      }}
      options={undefined}
      enableDropdown={true}
      placeholder="Select Date Range..."
      enableYearPagination={true}
      minDate={currentDate.subtract(2, "year").toDate()}
      maxDate={currentDate.toDate()}
      color="blue"
      className="mt-[2px] h-[42px] max-w-sm"
    />
  );
};

export { DateSelect };
