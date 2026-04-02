import type { Timezone } from "@calcom/features/bookings/Booker/types";
import type { TimezoneSelectComponentProps } from "@calcom/features/timezone/components/TimezoneSelectComponent";
import { TimezoneSelectComponent as TimezoneSelect } from "@calcom/features/timezone/components/TimezoneSelectComponent";
import { useMemo } from "react";
import useGetCityTimezones from "../hooks/useGetCityTimezones";
import { filterPropsTimezones, formatTimezones } from "../src/lib/timeZones";

export function Timezone(
  props: Omit<TimezoneSelectComponentProps, "data" | "isPending" | "isWebTimezoneSelect"> & {
    timeZones?: Timezone[];
  }
) {
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
