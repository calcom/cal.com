import { useMemo } from "react";
import BaseSelect, {
  allTimezones,
  ITimezoneOption,
  ITimezone,
  Props as SelectProps,
} from "react-timezone-select";

import { getReactSelectProps } from "../select";

export function TimezoneSelect({ className, components, ...props }: SelectProps) {
  const reactSelectProps = useMemo(() => {
    return getReactSelectProps({ className, components: components || {} });
  }, [className, components]);

  return (
    <BaseSelect
      {...reactSelectProps}
      timezones={{
        ...allTimezones,
        "America/Asuncion": "Asuncion",
      }}
      {...props}
    />
  );
}

export type { ITimezone, ITimezoneOption };
