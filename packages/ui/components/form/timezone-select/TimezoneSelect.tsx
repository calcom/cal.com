import { useMemo, useState } from "react";
import type { ITimezoneOption, ITimezone, Props as SelectProps } from "react-timezone-select";
import BaseSelect, { allTimezones } from "react-timezone-select";

import { classNames } from "@calcom/lib";
import { filterByCities, addCitiesToDropdown, handleOptionLabel } from "@calcom/lib/timezone";
import { trpc } from "@calcom/trpc/react";

import { getReactSelectProps } from "../select";

export interface ICity {
  city: string;
  timezone: string;
}

export function TimezoneSelect({
  className,
  classNames: timezoneClassNames,
  components,
  variant = "default",
  ...props
}: SelectProps & { variant?: "default" | "minimal" }) {
  const [cities, setCities] = useState<ICity[]>([]);
  const { data, isLoading } = trpc.viewer.public.cityTimezones.useQuery(undefined, {
    trpc: { context: { skipBatch: true } },
  });
  const handleInputChange = (tz: string) => {
    if (data) setCities(filterByCities(tz, data));
  };

  const reactSelectProps = useMemo(() => {
    return getReactSelectProps({
      components: components || {},
    });
  }, [components]);

  return (
    <BaseSelect
      className={className}
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
      classNames={{
        ...timezoneClassNames,
        input: (state) =>
          classNames("text-emphasis h-6", timezoneClassNames?.input && timezoneClassNames.input(state)),
        option: (state) =>
          classNames(
            "bg-default flex cursor-pointer justify-between py-2.5 px-3 rounded-none text-default ",
            state.isFocused && "bg-subtle",
            state.isSelected && "bg-emphasis text-default",
            timezoneClassNames?.option && timezoneClassNames.option(state)
          ),
        placeholder: (state) => classNames("text-muted", state.isFocused && "hidden"),
        dropdownIndicator: () => "text-default",
        control: (state) =>
          classNames(
            variant === "default"
              ? "px-3 py-2 bg-default border-default !min-h-9 text-sm leading-4 placeholder:text-sm placeholder:font-normal focus-within:ring-2 focus-within:ring-emphasis hover:border-emphasis rounded-md border gap-1"
              : "text-sm gap-1",
            timezoneClassNames?.control && timezoneClassNames.control(state)
          ),
        singleValue: (state) =>
          classNames(
            "text-emphasis placeholder:text-muted",
            timezoneClassNames?.singleValue && timezoneClassNames.singleValue(state)
          ),
        valueContainer: (state) =>
          classNames(
            "text-emphasis placeholder:text-muted flex gap-1",
            timezoneClassNames?.valueContainer && timezoneClassNames.valueContainer(state)
          ),
        multiValue: (state) =>
          classNames(
            "bg-subtle text-default rounded-md py-1.5 px-2 flex items-center text-sm leading-none",
            timezoneClassNames?.multiValue && timezoneClassNames.multiValue(state)
          ),
        menu: (state) =>
          classNames(
            "rounded-md bg-default text-sm leading-4 text-default mt-1 border border-subtle",
            state.selectProps.menuIsOpen && "shadow-dropdown", // Add box-shadow when menu is open
            timezoneClassNames?.menu && timezoneClassNames.menu(state)
          ),
        groupHeading: () => "leading-none text-xs uppercase text-default pl-2.5 pt-4 pb-2",
        menuList: (state) =>
          classNames(
            "scroll-bar scrollbar-track-w-20 rounded-md",
            timezoneClassNames?.menuList && timezoneClassNames.menuList(state)
          ),
        indicatorsContainer: (state) =>
          classNames(
            state.selectProps.menuIsOpen
              ? state.isMulti
                ? "[&>*:last-child]:rotate-180 [&>*:last-child]:transition-transform"
                : "rotate-180 transition-transform"
              : "text-default", // Woo it adds another SVG here on multi for some reason
            timezoneClassNames?.indicatorsContainer && timezoneClassNames.indicatorsContainer(state)
          ),
        multiValueRemove: () => "text-default py-auto ml-2",
        noOptionsMessage: () => "h-12 py-2 flex items-center justify-center",
      }}
    />
  );
}

export type { ITimezone, ITimezoneOption };
