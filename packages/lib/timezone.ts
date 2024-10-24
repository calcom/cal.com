import type { ITimezoneOption } from "react-timezone-select";

import dayjs from "@calcom/dayjs";
import type { ICity } from "@calcom/ui/components/form/timezone-select";

import isProblematicTimezone from "./isProblematicTimezone";

export type Timezones = { [label: string]: string /* timezone */ };

function findPartialMatch(itemsToSearch: string, searchString: string) {
  const searchItems = searchString.split(" ");
  return searchItems.every((i) => itemsToSearch.toLowerCase().indexOf(i.toLowerCase()) >= 0);
}

function findFromCity(searchString: string, data: ICity[]): ICity[] {
  if (searchString) {
    const cityLookup = data.filter((o) => findPartialMatch(o.city, searchString));
    return cityLookup?.length ? cityLookup : [];
  }
  return [];
}

export const filterByCities = (tz: string, data: ICity[]): ICity[] => {
  const cityLookup = findFromCity(tz, data);
  return cityLookup.map(({ city, timezone }) => ({ city, timezone }));
};

const filterBySearchText = (
  acc: { [label: string]: string },
  [label, value]: [string, string],
  searchText: string
) => {
  if (label.toLowerCase().includes(searchText.toLowerCase())) {
    acc[label] = value;
  }
  return acc;
};

export const filterByKeys = (searchText: string, timezones: Timezones) => {
  return Object.entries(timezones).reduce((acc, entry) => filterBySearchText(acc, entry, searchText), {});
};

export const addTimezonesToDropdown = (timezones: Timezones) => {
  return Object.fromEntries(
    Object.entries(timezones)
      .filter(([_, timezone]) => {
        return timezone !== null && !isProblematicTimezone(timezone);
      })
      .map(([key, value]) => [value, key])
  );
};

const formatOffset = (offset: string) =>
  offset.replace(/^([-+])(0)(\d):00$/, (_, sign, _zero, hour) => `${sign}${hour}:00`);

export const handleOptionLabel = (option: ITimezoneOption, timezones: Timezones) => {
  const offsetUnit = option.label.split("-")[0].substring(1);
  const cityName = option.label.split(") ")[1];

  const timezoneValue = ` ${offsetUnit} ${formatOffset(dayjs.tz(undefined, option.value).format("Z"))}`;
  return Object.entries(timezones).length > 0
    ? `${cityName}${timezoneValue}`
    : `${option.value.replace(/_/g, " ")}${timezoneValue}`;
};
