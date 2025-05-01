import { useMemo } from "react";

import { TimezoneSelectComponent as TimezoneSelect } from "@calcom/features/components/timezone-select";
import type { TimezoneSelectProps } from "@calcom/features/components/timezone-select";
import type { Timezone } from "@calcom/features/bookings/Booker/types";
import useGetCityTimezones from "../hooks/useGetCityTimezones";
import { filterPropsTimezones, formatTimezones } from "../src/lib/timeZones";

export function Timezone(props: TimezoneSelectProps & { timeZones?: Timezone[] }) {
  const { isLoading: isLoadingAvailableCityTimezones, data: availableCityTimezones } = useGetCityTimezones();
  const cityTimeZones = useMemo(() => {
    if (props.timeZones) {
      const filteredTimeZones = filterPropsTimezones(props.timeZones, availableCityTimezones ?? []);
      return formatTimezones(filteredTimeZones);
    } else if (availableCityTimezones && !isLoadingAvailableCityTimezones) {
      return formatTimezones(availableCityTimezones);
    }

    return [];
  }, [availableCityTimezones, props.timeZones, isLoadingAvailableCityTimezones]);

  return (
    <TimezoneSelect
      {...props}
      data={cityTimeZones}
      isPending={isLoadingAvailableCityTimezones}
      isWebTimezoneSelect={false}
    />
  );
}
