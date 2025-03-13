import { TimezoneSelectComponent as TimezoneSelect } from "@calcom/features/components/timezone-select";
import type { TimezoneSelectProps } from "@calcom/features/components/timezone-select";

import useGetCityTimezones from "../hooks/useGetCityTimezones";
import { filterAndFormatTimezones } from "../src/lib/filterAndFormatTimezones";

export function Timezone(props: TimezoneSelectProps & { timeZonesFromProps?: string[] }) {
  const { isLoading: isLoadingCityTimezones, data: cityTimezones } = useGetCityTimezones();
  let timeZonesFiltered = undefined;

  if (!isLoadingCityTimezones) {
    timeZonesFiltered = filterAndFormatTimezones(cityTimezones, props.timeZonesFromProps);
  }

  return (
    <TimezoneSelect
      {...props}
      data={timeZonesFiltered}
      isPending={isLoadingCityTimezones}
      isWebTimezoneSelect={false}
    />
  );
}
