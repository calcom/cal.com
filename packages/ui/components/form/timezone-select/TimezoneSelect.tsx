import { useMemo, useState } from "react";
import type { ITimezoneOption, ITimezone, Props as SelectProps } from "react-timezone-select";
import BaseSelect, { allTimezones } from "react-timezone-select";

import { filterByCities, addCitiesToDropdown, handleOptionLabel } from "@calcom/lib/timezone";
import { trpc } from "@calcom/trpc/react";

import { getReactSelectProps } from "../select";

export interface ICity {
  city: string;
  timezone: string;
}

export function TimezoneSelect({ className, components, ...props }: SelectProps) {
  const [cities, setCities] = useState<ICity[]>([]);
  const { data, isLoading } = trpc.viewer.public.cityTimezones.useQuery(undefined, {
    trpc: { context: { skipBatch: true } },
  });
  const handleInputChange = (tz: string) => {
    if (data) setCities(filterByCities(tz, data));
  };

  const reactSelectProps = useMemo(() => {
    return getReactSelectProps({ className, components: components || {} });
  }, [className, components]);

  return (
    <BaseSelect
      isLoading={isLoading}
      isDisabled={isLoading}
      {...reactSelectProps}
      timezones={{
        ...allTimezones,
        ...addCitiesToDropdown(cities),
        "America/Asuncion": "Asuncion",
      }}
      onInputChange={handleInputChange}
      {...props}
      formatOptionLabel={(option) => <p className="truncate">{(option as ITimezoneOption).value}</p>}
      getOptionLabel={(option) => handleOptionLabel(option as ITimezoneOption, cities)}
    />
  );
}

export type { ITimezone, ITimezoneOption };
