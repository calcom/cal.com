import { useMemo } from "react";

import { TimezoneSelectComponent as TimezoneSelect } from "@calcom/features/components/timezone-select";
import type { TimezoneSelectProps } from "@calcom/features/components/timezone-select";

import useGetCityTimezones from "../hooks/useGetCityTimezones";
import { filterPropsTimezones, formatTimezones } from "../src/lib/timeZones";

export function Timezone(props: TimezoneSelectProps & { timeZonesFromProps?: string[] }) {
  const { isLoading: isLoadingAvailableCityTimezoness, data: availableCityTimezones } = useGetCityTimezones();
  const cityTimeZones = useMemo(() => {
    if (props.timeZonesFromProps && !isLoadingAvailableCityTimezoness) {
      const filteredTimeZones = filterPropsTimezones(props.timeZonesFromProps, availableCityTimezones ?? []);
      return formatTimezones(filteredTimeZones);
    } else if (availableCityTimezones && !isLoadingAvailableCityTimezoness) {
      return formatTimezones(availableCityTimezones);
    }

    return [];
  }, [availableCityTimezones, props.timeZonesFromProps, isLoadingAvailableCityTimezoness]);

  return (
    <TimezoneSelect
      {...props}
      data={cityTimeZones}
      isPending={isLoadingAvailableCityTimezoness}
      isWebTimezoneSelect={false}
    />
  );
}
