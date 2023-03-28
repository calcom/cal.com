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
        input: (state) =>
          classNames("dark:text-darkgray-900 text-gray-900", props.classNames?.input?.(state)),
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
        control: (state) =>
          classNames(
            variant === "default"
              ? "dark:bg-darkgray-100 dark:border-darkgray-300 !min-h-9 border-gray-300 bg-white text-sm leading-4 placeholder:text-sm placeholder:font-normal  focus-within:ring-2 focus-within:ring-gray-800 hover:border-gray-400 dark:focus-within:ring-darkgray-900 rounded-md border py-2 px-3"
              : "text-sm ",
            props.classNames?.control?.(state)
          ), // We remove all styling here to fit theme of booking page - no min-h also
        singleValue: (state) =>
          classNames(
            "dark:text-darkgray-900 dark:placeholder:text-darkgray-500 text-black placeholder:text-gray-400",
            props.classNames?.singleValue?.(state)
          ),
        valueContainer: (state) =>
          classNames(
            "dark:text-darkgray-900 dark:placeholder:text-darkgray-500 text-black placeholder:text-gray-400 flex gap-1",
            props.classNames?.valueContainer?.(state)
          ),
        multiValue: (state) =>
          classNames(
            "dark:bg-darkgray-200 dark:text-darkgray-700 rounded-md bg-gray-100 text-gray-700 py-1.5 px-2 flex items-center text-sm leading-none",
            props.classNames?.multiValue?.(state)
          ),
        menu: (state) =>
          classNames(
            "dark:bg-darkgray-100 rounded-md bg-white text-sm leading-4 dark:text-white mt-1 border border-gray-200 dark:border-darkgray-200 ",
            props.classNames?.menu?.(state)
          ),
        menuList: (state) =>
          classNames("scroll-bar scrollbar-track-w-20 rounded-md", props.classNames?.menuList?.(state)),
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
