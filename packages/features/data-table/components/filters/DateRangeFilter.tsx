import type { Dayjs } from "dayjs";
import { useState } from "react";

import dayjs from "@calcom/dayjs";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { DateRangePicker } from "@calcom/ui";
import { Select } from "@calcom/ui";

import "../../../insights/filters/DateSelect.css";
import { useDataTable, useFilterValue } from "../../hooks";
import type { FilterableColumn } from "../../lib/types";
import { ZDateRangeFilterValue } from "../../lib/types";

type PresetOption = {
  labelKey: string;
  i18nOptions?: Record<string, string | number>;
  value: string | null;
};

type DateRangeFilterProps = {
  className?: string;
  column: Extract<FilterableColumn, { type: "date_range" }>;
};

const DEFAULT_PRESET_VALUE = "w" as const;
const CUSTOM_PRESET_VALUE = "c" as const;

const PRESET_OPTIONS: PresetOption[] = [
  { labelKey: "today", value: "tdy" },
  { labelKey: "last_number_of_days", i18nOptions: { count: 7 }, value: "w" },
  { labelKey: "last_number_of_days", i18nOptions: { count: 30 }, value: "t" },
  { labelKey: "month_to_date", value: "m" },
  { labelKey: "year_to_date", value: "y" },
  { labelKey: "custom_range", value: "c" },
];

const getDateRangeFromPreset = (val: string | null) => {
  let startDate = dayjs();
  let endDate = dayjs();
  const preset = PRESET_OPTIONS.find((o) => o.value === val);
  if (!preset) {
    return { startDate, endDate, preset: undefined };
  }

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

  return { startDate, endDate, preset };
};

export const DateRangeFilter = ({ className, column }: DateRangeFilterProps) => {
  const filterValue = useFilterValue(column.id, ZDateRangeFilterValue);
  const { updateFilter, removeFilter } = useDataTable();

  const { t } = useLocale();
  const currentDate = dayjs();
  const [startDate, setStartDate] = useState<Dayjs>(
    filterValue?.data.startDate
      ? dayjs(filterValue.data.startDate)
      : dayjs().subtract(1, "week").startOf("day")
  );
  const [endDate, setEndDate] = useState<Dayjs | undefined>(
    filterValue?.data.endDate ? dayjs(filterValue.data.endDate) : dayjs().endOf("day")
  );
  const [selectedPreset, setSelectedPreset] = useState<PresetOption>(
    PRESET_OPTIONS.find((o) => o.value === (filterValue?.data.preset || DEFAULT_PRESET_VALUE))
  );

  const updateValues = ({
    preset,
    startDate,
    endDate,
  }: {
    preset: PresetOption;
    startDate: Dayjs;
    endDate?: Dayjs;
  }) => {
    setSelectedPreset(preset);
    setStartDate(startDate);
    setEndDate(endDate);

    if (startDate && endDate) {
      updateFilter(column.id, {
        type: "date_range",
        data: {
          startDate: startDate.toDate().toISOString(),
          endDate: endDate.toDate().toISOString(),
          preset: preset.value,
        },
      });
    }
  };

  const updateDateRangeFromPreset = (val: string | null) => {
    if (val === CUSTOM_PRESET_VALUE) {
      updateValues({
        preset: PRESET_OPTIONS.find((o) => o.value === CUSTOM_PRESET_VALUE),
        startDate,
        endDate,
      });
    } else {
      const r = getDateRangeFromPreset(val);
      updateValues({
        preset: r.preset,
        startDate: r.startDate,
        endDate: r.endDate,
      });
    }
  };

  const updateDateRangeFromPicker = ({ startDate, endDate }: { startDate: Date; endDate: Date }) => {
    updateValues({
      preset: PRESET_OPTIONS.find((o) => o.value === CUSTOM_PRESET_VALUE),
      startDate: dayjs(startDate),
      endDate: endDate ? dayjs(endDate) : undefined,
    });
  };

  return (
    <div className={classNames("ml inline-flex space-x-2 rtl:space-x-reverse", className)}>
      <DateRangePicker
        dates={{
          startDate: startDate.toDate(),
          endDate: endDate?.toDate(),
        }}
        minDate={currentDate.subtract(2, "year").toDate()}
        maxDate={currentDate.toDate()}
        disabled={false}
        onDatesChange={updateDateRangeFromPicker}
      />
      <Select
        variant="default"
        data-testid="insights-preset"
        options={PRESET_OPTIONS.map((o) => ({
          label: t(o.labelKey, o.i18nOptions),
          value: o.value,
        }))}
        value={{ label: t(selectedPreset.labelKey, selectedPreset.i18nOptions), value: selectedPreset.value }}
        className="w-40 capitalize text-black"
        defaultValue={{
          label: t(selectedPreset.labelKey, selectedPreset.i18nOptions),
          value: selectedPreset.value,
        }}
        styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
        menuPortalTarget={document.body}
        onChange={(e) => {
          if (e) {
            updateDateRangeFromPreset(e.value);
          }
        }}
      />
    </div>
  );
};
