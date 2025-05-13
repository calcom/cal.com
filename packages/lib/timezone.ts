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

export const handleOptionLabel = (option: ITimezoneOption) => {
  const ianaValue = option.value;
  let displayCityName = "";

  if (option.label) {
    const parts = option.label.split(") ");
    if (parts.length > 1) {
      displayCityName = parts[1];
    } else {
      const parts2 = option.label.split(" (GMT");
      if (parts2.length > 0) {
        displayCityName = parts2[0];
      }
    }
  }

  if (!displayCityName) {
    displayCityName = ianaValue.includes("/")
      ? ianaValue.split("/")[1].replace(/_/g, " ")
      : ianaValue.replace(/_/g, " ");
  }

  let offsetString = "";
  try {
    offsetString = dayjs.tz(undefined, ianaValue).format("Z");
  } catch (e) {
    console.error(`Error getting offset for ${ianaValue} using dayjs:`, e);
    offsetString = "ERR";
  }

  const displayOffset = `GMT${offsetString}`;

  return `${displayCityName} (${displayOffset})`;
};
