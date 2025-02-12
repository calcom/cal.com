import dayjs from "@calcom/dayjs";

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

export const getDefaultStartDate = () => dayjs().subtract(1, "week").startOf("day");

export const getDefaultEndDate = () => dayjs().endOf("day");
