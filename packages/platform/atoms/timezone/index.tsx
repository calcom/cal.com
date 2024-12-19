import type { TimezoneSelectProps } from "@calcom/ui";
import { TimezoneSelectComponent } from "@calcom/ui";

import useGetCityTimezones from "../hooks/useGetCityTimezones";

export function Timezone(props: TimezoneSelectProps) {
  const { isLoading, data } = useGetCityTimezones();
  const timezones = data?.data ?? [];

  return (
    <TimezoneSelectComponent
      {...props}
      data={timezones.map(({ city, timezone }) => ({ label: city, timezone }))}
      isPending={isLoading}
    />
  );
}
