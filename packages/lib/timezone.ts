import type { ITimezoneOption } from "react-timezone-select";

import dayjs from "@calcom/dayjs";

import isProblematicTimezone from "./isProblematicTimezone";

export type Timezones = { label: string; timezone: string }[];

const searchTextFilter = (tzOption: Timezones[number], searchText: string) => {
  return searchText && tzOption.label.toLowerCase().includes(searchText.toLowerCase());
};

export const filterBySearchText = (searchText: string, timezones: Timezones) => {
  return timezones.filter((tzOption) => searchTextFilter(tzOption, searchText));
};

export const addTimezonesToDropdown = (timezones: Timezones) => {
  return Object.fromEntries(
    timezones
      .filter(({ timezone }) => {
        return timezone !== null && !isProblematicTimezone(timezone);
      })
      .map(({ label, timezone }) => [timezone, label])
  );
};

const formatOffset = (offset: string) =>
  offset.replace(/^([-+])(0)(\d):00$/, (_, sign, _zero, hour) => `${sign}${hour}:00`);

export const handleOptionLabel = (option: ITimezoneOption, timezones: Timezones) => {
  const tz = option.value;
  const offset = formatOffset(dayjs.tz(undefined, tz).format("Z"));
  const zoneId = tz.replace(/_/g, " ");
  const citySuffix = option.label.includes(") ") ? option.label.split(") ").slice(1).join(") ") : undefined;
  return citySuffix ? `${zoneId} (GMT${offset}) ${citySuffix}` : `${zoneId} (GMT${offset})`;
};
