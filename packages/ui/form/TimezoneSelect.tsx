import classNames from "classnames";
import { components } from "react-select";
import type { ITimezone, ITimezoneOption, Props as SelectProps } from "react-timezone-select";
import BaseSelect, { allTimezones } from "react-timezone-select";

import { InputComponent } from "../components/form/select/components";

function TimezoneSelect({ className, ...props }: SelectProps) {
  // @TODO: remove borderRadius and haveRoundedClassName logic from theme so we use only new style
  const haveRoundedClassName = !!(className && className.indexOf("rounded-") > -1);
  const defaultBorderRadius = 2;

  return (
    <BaseSelect
      theme={(theme) => ({
        ...theme,
        ...(haveRoundedClassName ? {} : { borderRadius: defaultBorderRadius }),
        colors: {
          ...theme.colors,
          primary: "var(--brand-color)",
          primary50: "rgba(209 , 213, 219, var(--tw-bg-opacity))",
          primary25: "rgba(244, 245, 246, var(--tw-bg-opacity))",
        },
      })}
      styles={{
        option: (provided, state) => ({
          ...provided,
          color: state.isSelected ? "var(--brand-text-color)" : "black",
          ":active": {
            backgroundColor: state.isSelected ? "" : "var(--brand-color)",
            color: "var(--brand-text-color)",
          },
        }),
      }}
      timezones={{
        ...allTimezones,
        "America/Asuncion": "Asuncion",
      }}
      components={{
        ...components,
        IndicatorSeparator: () => null,
        Input: InputComponent,
      }}
      className={classNames("text-sm", className)}
      {...props}
    />
  );
}

export default TimezoneSelect;
export type { ITimezone, ITimezoneOption };
