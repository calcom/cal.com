import { useState } from "react";

import dayjs from "@calcom/dayjs";
import { DateRangePicker } from "@calcom/ui";
import { Select } from "@calcom/ui";

import { useFilterContext } from "../context/provider";
import "./DateSelect.css";

type RangeType = "tdy" | "w" | "t" | "m" | "y" | undefined | null;

const presetOptions = [
  { label: "Today", value: "tdy" },
  { label: "Last 7 days", value: "w" },
  { label: "Last 30 days", value: "t" },
  { label: "Month to Date", value: "m" },
  { label: "Year to Date", value: "y" },
  { label: "Custom", value: null },
];

export const DateSelect = () => {
  const { filter, setConfigFilters } = useFilterContext();
  const currentDate = dayjs();
  const [initialStartDate, initialEndDate, range] = filter?.dateRange || [null, null, null];

  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const startValue = startDate?.toDate() || null;
  const endValue = endDate?.toDate() || null;
  const [selectedPreset, setSelectedPreset] = useState(presetOptions.find((c) => c.value === range));

  const updateDateRange = (val: string | null) => {
    setSelectedPreset(presetOptions.find((c) => c.value === val));
    // get and update startDate & endDate based on selectedPreset

    // Initialize startDate and endDate variables
    let startDate = dayjs();
    let endDate = dayjs();

    // Update startDate and endDate based on the selected preset value
    switch (val) {
      case "tdy": // Today
        startDate = dayjs().startOf("day");
        endDate = dayjs().endOf("day");
        break;
      case "w": // Last 7 days
        startDate = dayjs().subtract(7, "day").startOf("day");
        endDate = dayjs().endOf("day");
        break;
      case "t": // Last 30 days
        startDate = dayjs().subtract(30, "day").startOf("day");
        endDate = dayjs().endOf("day");
        break;
      case "m": // Month to Date
        startDate = dayjs().startOf("month");
        endDate = dayjs().endOf("day");
        break;
      case "y": // Year to Date
        startDate = dayjs().startOf("year");
        endDate = dayjs().endOf("day");
        break;
      default:
        break;
    }
    // Update the state and the config filters
    setStartDate(startDate);
    setEndDate(endDate);

    setConfigFilters({
      dateRange: [dayjs(startDate), dayjs(endDate), val],
    });
  };

  return (
    <div className="ml me-2 ms-2 inline-flex space-x-2 rtl:space-x-reverse">
      <DateRangePicker
        dates={{
          startDate: startValue,
          endDate: endValue,
        }}
        minDate={currentDate.subtract(2, "year").toDate()}
        maxDate={currentDate.toDate()}
        disabled={false}
        onDatesChange={({ startDate, endDate }) => {
          setConfigFilters({
            dateRange: [dayjs(startDate), dayjs(endDate), null],
          });
          setStartDate(dayjs(startDate));
          setEndDate(dayjs(endDate));
          setSelectedPreset(presetOptions.find((c) => c.value === null));
        }}
      />
      <Select
        variant="default"
        data-testid="insights-preset"
        options={presetOptions}
        value={selectedPreset}
        className="w-40 text-black"
        defaultValue={selectedPreset}
        onChange={(e) => {
          if (e) {
            updateDateRange(e.value);
          }
        }}
      />
    </div>
  );
};
