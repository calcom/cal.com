"use client";

import { useMemo, useState } from "react";
import type { ITimezoneOption, ITimezone, Props as SelectProps } from "react-timezone-select";
import BaseSelect from "react-timezone-select";

import { classNames } from "@calcom/lib";
import { CALCOM_VERSION } from "@calcom/lib/constants";
import { filterByKeys, addTimezonesToDropdown, handleOptionLabel } from "@calcom/lib/timezone";
import type { Timezones } from "@calcom/lib/timezone";
import { trpc } from "@calcom/trpc/react";

import { getReactSelectProps } from "../select";

const SELECT_SEARCH_DATA: Timezones = {
  "Eastern Time - US & Canada": "America/New_York",
  "Central Time - US & Canada": "America/Los_Angeles",
  "Mountain Time - US & Canada": "America/Denver",
  "Atlantic Time - Canada": "America/Halifax",
  "Eastern European Time": "Europe/Bucharest",
  "Central European Time": "Europe/Berlin",
  "Western European Time": "Europe/London",
  "Australian Eastern Time": "Australia/Sydney",
  "Japan Standard Time": "Asia/Tokyo",
  "India Standard Time": "Asia/Kolkata",
  "Gulf Standard Time": "Asia/Dubai",
  "South Africa Standard Time": "Africa/Johannesburg",
  "Brazil Time": "America/Sao_Paulo",
  "Hawaii-Aleutian Standard Time": "Pacific/Honolulu",
};

export type TimezoneSelectProps = SelectProps & {
  variant?: "default" | "minimal";
  timezoneSelectCustomClassname?: string;
};
export function TimezoneSelect(props: TimezoneSelectProps) {
  const { data = [], isPending } = trpc.viewer.timezones.cityTimezones.useQuery(
    {
      CalComVersion: CALCOM_VERSION,
    },
    {
      trpc: { context: { skipBatch: true } },
    }
  );

  return (
    <TimezoneSelectComponent
      data={data.reduce((acc: { [label: string]: string }, { city, timezone }) => {
        acc[city] = timezone;
        return acc;
      }, {})}
      isPending={isPending}
      {...props}
    />
  );
}

export type TimezoneSelectComponentProps = SelectProps & {
  variant?: "default" | "minimal";
  isPending: boolean;
  data: Record<string, string> | undefined;
  timezoneSelectCustomClassname?: string;
};
export function TimezoneSelectComponent({
  className,
  classNames: timezoneClassNames,
  timezoneSelectCustomClassname,
  components,
  variant = "default",
  data,
  isPending,
  value,
  ...props
}: TimezoneSelectComponentProps) {
  const combinedData = { ...data, ...SELECT_SEARCH_DATA };
  /*
   * we support multiple timezones for the different labels
   * e.g. 'Sao Paulo' and 'Brazil Time' both being 'America/Sao_Paulo'
   * but react-timezone-select does not.
   *
   * We make sure to be able to search through both options, and flip the key/value on final display.
   */
  const [additionalTimezones, setAdditionalTimezones] = useState<Timezones>({});
  const handleInputChange = (searchText: string) => {
    if (data) setAdditionalTimezones(filterByKeys(searchText, combinedData));
  };

  const reactSelectProps = useMemo(() => {
    return getReactSelectProps({
      components: components || {},
    });
  }, [components]);

  return (
    <BaseSelect
      value={value}
      className={`${className} ${timezoneSelectCustomClassname}`}
      aria-label="Timezone Select"
      isLoading={isPending}
      isDisabled={isPending}
      {...reactSelectProps}
      timezones={{
        ...(data ? addTimezonesToDropdown(combinedData) : {}),
        ...addTimezonesToDropdown(additionalTimezones),
      }}
      onInputChange={handleInputChange}
      {...props}
      formatOptionLabel={(option) => (
        <p className="truncate">{(option as ITimezoneOption).value.replace(/_/g, " ")}</p>
      )}
      getOptionLabel={(option) => handleOptionLabel(option as ITimezoneOption, additionalTimezones)}
      classNames={{
        ...timezoneClassNames,
        input: (state) =>
          classNames(
            "text-emphasis h-6 md:max-w-[145px] max-w-[250px]",
            timezoneClassNames?.input && timezoneClassNames.input(state)
          ),
        option: (state) =>
          classNames(
            "bg-default flex !cursor-pointer justify-between py-2.5 px-3 rounded-none text-default ",
            state.isFocused && "bg-subtle",
            state.isSelected && "bg-emphasis",
            timezoneClassNames?.option && timezoneClassNames.option(state)
          ),
        placeholder: (state) => classNames("text-muted", state.isFocused && "hidden"),
        dropdownIndicator: () => "text-default",
        control: (state) =>
          classNames(
            "!cursor-pointer",
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
