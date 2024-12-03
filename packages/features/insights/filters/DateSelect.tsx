import { useState } from "react";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { DateRangePicker } from "@calcom/ui";
import { Select } from "@calcom/ui";

import { useFilterContext } from "../context/provider";
import "./DateSelect.css";

export const DateSelect = () => {
  const { t } = useLocale();
  const presetOptions = [
    { label: t("today"), value: "tdy" },
    { label: t("last_number_of_days", { count: 7 }), value: "w" },
    { label: t("last_number_of_days", { count: 30 }), value: "t" },
    { label: t("month_to_date"), value: "m" },
    { label: t("year_to_date"), value: "y" },
    { label: t("custom_range"), value: null },
  ];

  const { filter, setConfigFilters } = useFilterContext();
  const currentDate = dayjs();
  const [initialStartDate, initialEndDate, range] = filter?.dateRange || [null, null, null];
  const [startDate, setStartDate] = useState<Dayjs>(initialStartDate);
  const [endDate, setEndDate] = useState<Dayjs | undefined>(initialEndDate);
  const startValue = startDate.toDate();
  const endValue = endDate?.toDate();
  const [selectedPreset, setSelectedPreset] = useState(presetOptions.find((c) => c.value === range));

  const updateDateRange = (val: string | null) => {
    setSelectedPreset(presetOptions.find((c) => c.value === val));
    let startDate = dayjs();
    let endDate = dayjs();

    switch (val) {
      case "tdy": // Today
        startDate = dayjs().startOf("day");
        endDate = dayjs().endOf("day");
        break;
      case "w": // Last 7 days
        startDate = dayjs().subtract(1, "week").startOf("day");
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
    // Update the datepicker date selection
    setStartDate(startDate);
    setEndDate(endDate);
    // Update the configuration filter
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
          if (startDate && endDate) {
            setConfigFilters({
              dateRange: [dayjs(startDate), dayjs(endDate), null],
            });
          }
          setStartDate(dayjs(startDate));
          setEndDate(endDate ? dayjs(endDate) : endDate);
          setSelectedPreset(presetOptions.find((c) => c.value === null));
        }}
      />
      <Select
        variant="default"
        data-testid="insights-preset"
        options={presetOptions}
        value={selectedPreset}
        className="w-40 capitalize text-black"
        defaultValue={selectedPreset}
        styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
        menuPortalTarget={document.body}
        onChange={(e) => {
          if (e) {
            updateDateRange(e.value);
          }
        }}
      />
    </div>
  );
};
