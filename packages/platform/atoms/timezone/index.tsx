import { useMemo } from "react";

import { TimezoneSelectComponent as TimezoneSelect } from "@calcom/features/components/timezone-select";
import type { TimezoneSelectProps } from "@calcom/features/components/timezone-select";

import useGetCityTimezones from "../hooks/useGetCityTimezones";
import { filterAndFormatTimezones } from "../src/lib/filterAndFormatTimezones";

export function Timezone(props: TimezoneSelectProps & { timeZonesFromProps?: string[] }) {
  const { isLoading: isLoadingAvailableCityTimezoness, data: availableCityTimezones } = useGetCityTimezones();
  const cityTimezones = useMemo(() => availableCityTimezones, [isLoadingAvailableCityTimezoness]);

  let timeZonesFiltered = undefined;

  if (!isLoadingAvailableCityTimezoness) {
    timeZonesFiltered = filterAndFormatTimezones(cityTimezones, props.timeZonesFromProps);
  }

  return (
    <TimezoneSelect
      {...props}
      data={timeZonesFiltered}
      isPending={isLoadingAvailableCityTimezoness}
      isWebTimezoneSelect={false}
    />
  );
}
