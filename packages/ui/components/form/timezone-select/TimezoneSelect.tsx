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
      formatOptionLabel={(option) => <p className="truncate">{(option as ITimezoneOption).value}</p>}
      getOptionLabel={(data) => {
        const option = data as ITimezoneOption;
        const formatedLabel = option.label.split(")")[0].replace("(", " ").replace("T", "T ");
        return `${option.value}${formatedLabel}`;
      }}
    />
  );
}

export type { ITimezone, ITimezoneOption };
