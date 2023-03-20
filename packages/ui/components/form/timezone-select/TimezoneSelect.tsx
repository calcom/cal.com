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

export function TimezoneSelect({ className, components, ...props }: SelectProps) {
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
        input: () => classNames("dark:text-darkgray-900 text-gray-900", props.classNames?.input),
        option: (state) =>
          classNames(
            "dark:bg-darkgray-100 flex cursor-pointer justify-between py-2.5 px-3 rounded-none text-gray-700 dark:text-darkgray-700",
            state.isFocused && "dark:!bg-darkgray-200 !bg-gray-100",
            state.isSelected && "dark:!bg-darkgray-300 !bg-gray-200 text-gray-900 !dark:text-darkgray-900",
            props.classNames?.option
          ),
        placeholder: (state) =>
          classNames("text-gray-400 text-sm dark:text-darkgray-400", state.isFocused && "hidden"),
        dropdownIndicator: () => "text-gray-600 dark:text-darkgray-400",
        control: () => classNames("", props.classNames?.control), // We remove all styling here to fit theme of booking page - no min-h also
        singleValue: () =>
          classNames(
            "dark:text-darkgray-900 dark:placeholder:text-darkgray-500 text-black placeholder:text-gray-400",
            props.classNames?.singleValue
          ),
        valueContainer: () =>
          classNames(
            "dark:text-darkgray-900 dark:placeholder:text-darkgray-500 text-black placeholder:text-gray-400 flex gap-1",
            props.classNames?.valueContainer
          ),
        multiValue: () =>
          classNames(
            "dark:bg-darkgray-200 dark:text-darkgray-700 rounded-md bg-gray-100 text-gray-700 py-1.5 px-2 flex items-center text-sm leading-none",
            props.classNames?.multiValue
          ),
        menu: () =>
          classNames(
            "dark:bg-darkgray-100 rounded-md bg-white text-sm leading-4 dark:text-white mt-1 border border-gray-200 dark:border-darkgray-200 ",
            props.classNames?.menu
          ),
        menuList: () => classNames("scroll-bar scrollbar-track-w-20 rounded-md", props.classNames?.menuList),
        indicatorsContainer: (state) =>
          classNames(
            state.selectProps.menuIsOpen
              ? state.isMulti
                ? "[&>*:last-child]:rotate-180 [&>*:last-child]:transition-transform"
                : "rotate-180 transition-transform"
              : "text-gray-600 dark:text-darkgray-600" // Woo it adds another SVG here on multi for some reason
          ),
        multiValueRemove: () => "text-gray-600 dark:text-darkgray-600 py-auto ml-2",
      }}
    />
  );
}

export type { ITimezone, ITimezoneOption };
