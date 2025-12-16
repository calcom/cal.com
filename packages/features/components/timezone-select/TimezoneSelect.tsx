"use client";

import { useMemo, useState } from "react";
import type { ITimezoneOption, ITimezone, Props as SelectProps } from "react-timezone-select";
import BaseSelect from "react-timezone-select";

import { CALCOM_VERSION } from "@calcom/lib/constants";
import { filterBySearchText, addTimezonesToDropdown, handleOptionLabel } from "@calcom/lib/timezone";
import type { Timezones } from "@calcom/lib/timezone";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { getReactSelectProps, inputStyles } from "@calcom/ui/components/form";

const SELECT_SEARCH_DATA: Timezones = [
  { label: "San Francisco", timezone: "America/Los_Angeles" },
  { label: "Sao Francisco do Sul", timezone: "America/Sao_Paulo" },
  { label: "San Francisco de Macoris", timezone: "America/Santo_Domingo" },
  { label: "San Francisco Gotera", timezone: "America/El_Salvador" },
  { label: "Eastern Time - US & Canada", timezone: "America/New_York" },
  { label: "Pacific Time - US & Canada", timezone: "America/Los_Angeles" },
  { label: "Central Time - US & Canada", timezone: "America/Chicago" },
  { label: "Mountain Time - US & Canada", timezone: "America/Denver" },
  { label: "Atlantic Time - Canada", timezone: "America/Halifax" },
  { label: "Eastern European Time", timezone: "Europe/Bucharest" },
  { label: "Central European Time", timezone: "Europe/Berlin" },
  { label: "Western European Time", timezone: "Europe/London" },
  { label: "Australian Eastern Time", timezone: "Australia/Sydney" },
  { label: "Japan Standard Time", timezone: "Asia/Tokyo" },
  { label: "India Standard Time", timezone: "Asia/Kolkata" },
  { label: "Gulf Standard Time", timezone: "Asia/Dubai" },
  { label: "South Africa Standard Time", timezone: "Africa/Johannesburg" },
  { label: "Brazil Time", timezone: "America/Sao_Paulo" },
  { label: "Hawaii-Aleutian Standard Time", timezone: "Pacific/Honolulu" },
];

export type TimezoneSelectProps = SelectProps & {
  variant?: "default" | "minimal";
  timezoneSelectCustomClassname?: string;
  size?: "sm" | "md";
  grow?: boolean;
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
  const cityTimezonesFormatted = data.map(({ city, timezone }) => ({ label: city, timezone }));

  return (
    <TimezoneSelectComponent
      data={[...cityTimezonesFormatted, ...SELECT_SEARCH_DATA]}
      isPending={isPending}
      {...props}
    />
  );
}

export type TimezoneSelectComponentProps = SelectProps & {
  variant?: "default" | "minimal";
  isPending: boolean;
  data?: Timezones;
  timezoneSelectCustomClassname?: string;
  size?: "sm" | "md";
  grow?: boolean;
  isWebTimezoneSelect?: boolean;
};

// TODO: I wonder if we move this to ui package, and keep the TRPC version in features
export function TimezoneSelectComponent({
  className,
  classNames: timezoneClassNames,
  timezoneSelectCustomClassname,
  components,
  variant = "default",
  isPending,
  value,
  size = "md",
  grow = false,
  isWebTimezoneSelect = true,
  ...props
}: TimezoneSelectComponentProps) {
  const data = [...(props.data || [])];
  /*
   * we support multiple timezones for the different labels
   * e.g. 'Sao Paulo' and 'Brazil Time' both being 'America/Sao_Paulo'
   * but react-timezone-select does not.
   *
   * We make sure to be able to search through both options, and flip the key/value on final display.
   */
  const [additionalTimezones, setAdditionalTimezones] = useState<Timezones>([]);
  const handleInputChange = (searchText: string) => {
    if (data) setAdditionalTimezones(filterBySearchText(searchText, data));
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
      data-testid="timezone-select"
      isDisabled={isPending}
      {...reactSelectProps}
      timezones={{
        ...(props.data ? addTimezonesToDropdown(data) : {}),
        ...(isWebTimezoneSelect ? addTimezonesToDropdown(additionalTimezones) : {}),
      }}
      styles={{
        control: (base) => ({
          ...base,
          minHeight: size === "sm" ? "28px" : "36px",
          height: grow ? "h-auto " : size === "sm" ? "28px" : "36px",
        }),
        menuList: (base) => ({
          ...base,
          height: grow ? "h-auto " : size === "sm" ? "200px" : "180px",
        }),
      }}
      onInputChange={handleInputChange}
      {...props}
      onChange={(selectedOption) => {
        if (!props.onChange) return;

        if (!selectedOption) {
          props.onChange(selectedOption);
          return;
        }

        // Fix inconsistent timezone naming formats
        const corrections: Record<string, string> = {
          "America/Port_Of_Spain": "America/Port_of_Spain",
          "Africa/Porto-novo": "Africa/Porto-Novo",
          "Africa/Dar_Es_Salaam": "Africa/Dar_es_Salaam",
        };

        const correctedValue = corrections[selectedOption.value] || selectedOption.value;
        props.onChange({ ...selectedOption, value: correctedValue });
      }}
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
            "bg-default py-2.5 px-3 rounded-md text-default ",
            state.isFocused && "bg-subtle",
            state.isDisabled && "bg-cal-muted",
            state.isSelected && "bg-emphasis text-default",
            timezoneClassNames?.option && timezoneClassNames.option(state)
          ),
        placeholder: (state) => classNames("text-muted", state.isFocused && "hidden"),
        dropdownIndicator: () => "text-default",
        control: (state) =>
          classNames(
            inputStyles({ size }),
            state.isMulti
              ? state.hasValue
                ? "p-1 h-fit"
                : "px-3 h-fit"
              : size === "sm"
              ? "h-7 px-2"
              : "h-9 py-0 px-3",
            props.isDisabled && "bg-subtle",
            "rounded-[10px]",
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
            "rounded-md bg-default text-sm leading-4 text-default mt-1 p-1 border border-subtle",
            state.selectProps.menuIsOpen && "shadow-dropdown", // Add box-shadow when menu is open
            timezoneClassNames?.menu && timezoneClassNames.menu(state)
          ),
        groupHeading: () => "leading-none text-xs uppercase text-default pl-2.5 pt-4 pb-2",
        menuList: (state) =>
          classNames(
            "scroll-bar scrollbar-track-w-20 rounded-md flex flex-col space-y-1",
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
