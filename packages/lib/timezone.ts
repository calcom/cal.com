import type { ITimezoneOption } from "react-timezone-select";

import dayjs from "@calcom/dayjs";
import type { ICity } from "@calcom/ui/components/form/timezone-select";

import isProblematicTimezone from "./isProblematicTimezone";

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
// NOTE: There can be multiple names for the same timezone.
export const addCitiesToDropdown = (cities: ICity[]) => {
  const cityTimezones: { [key: string]: string } = {};

  cities?.forEach((city: ICity) => {
    if (city.timezone !== null && !isProblematicTimezone(city.timezone)) {
      cityTimezones[city.timezone] = city.city;
    }
  });

  return cityTimezones;
};

const formatOffset = (offset: string) =>
  offset.replace(/^([-+])(0)(\d):00$/, (_, sign, _zero, hour) => `${sign}${hour}:00`);

export const handleOptionLabel = (option: ITimezoneOption, cities: ICity[]) => {
  const offsetUnit = option.label.split("-")[0].substring(1);
  const timezoneValue = ` ${offsetUnit} ${formatOffset(dayjs.tz(undefined, option.value).format("Z"))}`;

  const additionalTimezone = additionalTimezones.find((tz) => tz.timezone === option.value);
  if (additionalTimezone) {
    return `${additionalTimezone.city}${timezoneValue}`;
  }

  const city = cities.find((c) => c.timezone === option.value);
  if (city) {
    return `${city.city}${timezoneValue}`;
  }

  return `${option.value.replace(/_/g, " ")}${timezoneValue}`;
};
