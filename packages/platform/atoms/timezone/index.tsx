import { TimezoneSelect } from "@calcom/features/components/timezone-select";
import type { TimezoneSelectProps } from "@calcom/features/components/timezone-select";

import useGetCityTimezones from "../hooks/useGetCityTimezones";

export function Timezone(props: TimezoneSelectProps) {
  const { isLoading, data } = useGetCityTimezones();

  return (
    <TimezoneSelect
      {...props}
      data={
        Array.isArray(data)
          ? data.map(({ city, timezone }) => ({
              label: city,
              timezone,
            }))
          : []
      }
      isPending={isLoading}
    />
  );
}
