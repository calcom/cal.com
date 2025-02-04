import type { TimezoneSelectProps } from "@calcom/ui";
import { TimezoneSelectComponent } from "@calcom/ui";

import useGetCityTimezones from "../hooks/useGetCityTimezones";

export function Timezone(props: TimezoneSelectProps) {
  const { isLoading, data } = useGetCityTimezones();

  return (
    <TimezoneSelectComponent
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
