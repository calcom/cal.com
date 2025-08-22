import { startOfDay, endOfDay, subDays, startOfMonth, startOfYear } from "date-fns";

import { ColumnFilterType, type DateRangeFilterValue } from "./types";

export type PresetOptionValue = "c" | "w" | "m" | "y" | "t" | "tdy";

export type PresetOption = {
  labelKey: string;
  i18nOptions?: Record<string, string | number>;
  value: PresetOptionValue;
};

export const CUSTOM_PRESET_VALUE = "c" as const;

export const DEFAULT_PRESET: PresetOption = {
  labelKey: "last_number_of_days",
  i18nOptions: { count: 7 },
  value: "w",
};
export const CUSTOM_PRESET: PresetOption = { labelKey: "custom_range", value: CUSTOM_PRESET_VALUE };

export const PRESET_OPTIONS: PresetOption[] = [
  { labelKey: "today", value: "tdy" },
  DEFAULT_PRESET,
  { labelKey: "last_number_of_days", i18nOptions: { count: 30 }, value: "t" },
  { labelKey: "month_to_date", value: "m" },
  { labelKey: "year_to_date", value: "y" },
  CUSTOM_PRESET,
];

export const getDefaultStartDate = () => startOfDay(subDays(new Date(), 6));
export const getDefaultEndDate = () => endOfDay(new Date());

export const getDateRangeFromPreset = (val: string | null) => {
  let startDate;
  let endDate;
  const preset = PRESET_OPTIONS.find((o) => o.value === val);
  if (!preset) {
    return { startDate: getDefaultStartDate(), endDate: getDefaultEndDate(), preset: CUSTOM_PRESET };
  }

  switch (val) {
    case "tdy": // Today
      startDate = startOfDay(new Date());
      endDate = endOfDay(new Date());
      break;
    case "w": // Last 7 days
      startDate = startOfDay(subDays(new Date(), 6));
      endDate = endOfDay(new Date());
      break;
    case "t": // Last 30 days
      startDate = startOfDay(subDays(new Date(), 29));
      endDate = endOfDay(new Date());
      break;
    case "m": // Month to Date
      startDate = startOfMonth(new Date());
      endDate = endOfDay(new Date());
      break;
    case "y": // Year to Date
      startDate = startOfYear(new Date());
      endDate = endOfDay(new Date());
      break;
    default:
      throw new Error(`Invalid preset value: ${val}`);
  }

  return { startDate, endDate, preset };
};

export const recalculateDateRange = (filterValue: DateRangeFilterValue): DateRangeFilterValue => {
  // If it's a custom range, return as is
  if (filterValue.data.preset === CUSTOM_PRESET_VALUE) {
    return filterValue;
  }

  // Recalculate dates based on the current timestamp
  const { startDate, endDate } = getDateRangeFromPreset(filterValue.data.preset);

  return {
    type: ColumnFilterType.DATE_RANGE,
    data: {
      ...filterValue.data,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
  };
};
