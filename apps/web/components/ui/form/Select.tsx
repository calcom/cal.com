import React, { useCallback, useEffect, useState } from "react";
import type { GroupBase, Props, InputProps, SingleValue, MultiValue } from "react-select";
import ReactSelect, { components } from "react-select";

import classNames from "@calcom/lib/classNames";
import useTheme from "@calcom/lib/hooks/useTheme";

export type SelectProps<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
> = Props<Option, IsMulti, Group>;

export const InputComponent = <Option, IsMulti extends boolean, Group extends GroupBase<Option>>({
  inputClassName,
  ...props
}: InputProps<Option, IsMulti, Group>) => {
  return (
    <components.Input
      // disables our default form focus hightlight on the react-select input element
      inputClassName={classNames("focus:ring-0 focus:ring-offset-0", inputClassName)}
      {...props}
    />
  );
};

function Select<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({ className, ...props }: SelectProps<Option, IsMulti, Group>) {
  const { resolvedTheme, forcedTheme, isReady } = useTheme();
  const hasDarkTheme = !forcedTheme && resolvedTheme === "dark";
  const darkThemeColors = {
    /** Dark Theme starts */
    //primary - Border when selected and Selected Option background
    primary: "rgb(41 41 41 / var(--tw-border-opacity))",

    neutral0: "rgb(62 62 62 / var(--tw-bg-opacity))",
    // Down Arrow  hover color
    neutral5: "white",

    neutral10: "rgb(41 41 41 / var(--tw-border-opacity))",

    // neutral20 - border color + down arrow default color
    neutral20: "rgb(41 41 41 / var(--tw-border-opacity))",

    // neutral30 - hover border color
    neutral30: "rgb(41 41 41 / var(--tw-border-opacity))",

    neutral40: "white",

    danger: "white",

    // Cross button in multiselect
    dangerLight: "rgb(41 41 41 / var(--tw-border-opacity))",

    // neutral50 - MultiSelect - "Select Text" color
    neutral50: "white",

    // neutral60 - Down Arrow color
    neutral60: "white",

    neutral70: "red",

    // neutral80 - Selected option
    neutral80: "white",

    neutral90: "blue",

    primary50: "rgba(209 , 213, 219, var(--tw-bg-opacity))",
    primary25: "rgba(244, 245, 246, var(--tw-bg-opacity))",
    /** Dark Theme ends */
  };

  // Till we know in JS the theme is ready, we can't render react-select as it would render with light theme instead
  if (!isReady) {
    return <input type="text" className={className} />;
  }
  return (
    <ReactSelect
      theme={(theme) => ({
        ...theme,
        borderRadius: 6,
        colors: {
          ...theme.colors,
          ...(hasDarkTheme
            ? darkThemeColors
            : {
                /** Light Theme starts */
                primary: "var(--brand-color)",
                primary50: "rgba(209 , 213, 219, var(--tw-bg-opacity))",
                primary25: "rgba(244, 245, 246, var(--tw-bg-opacity))",
                /** Light Theme Ends */
              }),
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
      components={{
        ...components,
        IndicatorSeparator: () => null,
        Input: InputComponent,
      }}
      className={classNames("border-0 text-sm", className)}
      {...props}
    />
  );
}

export function SelectWithValidation<
  Option extends { label: string; value: string },
  isMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  required = false,
  onChange,
  value,
  ...remainingProps
}: SelectProps<Option, isMulti, Group> & { required?: boolean }) {
  const [hiddenInputValue, _setHiddenInputValue] = useState(() => {
    if (value instanceof Array || !value) {
      return;
    }
    return value.value || "";
  });

  const setHiddenInputValue = useCallback((value: MultiValue<Option> | SingleValue<Option>) => {
    let hiddenInputValue = "";
    if (value instanceof Array) {
      hiddenInputValue = value.map((val) => val.value).join(",");
    } else {
      hiddenInputValue = value?.value || "";
    }
    _setHiddenInputValue(hiddenInputValue);
  }, []);

  useEffect(() => {
    if (!value) {
      return;
    }
    setHiddenInputValue(value);
  }, [value, setHiddenInputValue]);

  return (
    <div className={classNames("relative", remainingProps.className)}>
      <Select
        value={value}
        {...remainingProps}
        onChange={(value, ...remainingArgs) => {
          setHiddenInputValue(value);
          if (onChange) {
            onChange(value, ...remainingArgs);
          }
        }}
      />
      {required && (
        <input
          tabIndex={-1}
          autoComplete="off"
          style={{
            opacity: 0,
            width: "100%",
            height: 1,
            position: "absolute",
          }}
          value={hiddenInputValue}
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          onChange={() => {}}
          // TODO:Not able to get focus to work
          // onFocus={() => selectRef.current?.focus()}
          required={required}
        />
      )}
    </div>
  );
}
export default Select;
