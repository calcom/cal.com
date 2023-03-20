import { useId } from "@radix-ui/react-id";
import * as React from "react";
import type { GroupBase, Props, SingleValue, MultiValue } from "react-select";
import ReactSelect from "react-select";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Label } from "../inputs/Label";
import { getReactSelectProps } from "./selectTheme";

export type SelectProps<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
> = Props<Option, IsMulti, Group> & { variant?: "default" | "checkbox" };

export const Select = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  components,
  menuPlacement,
  variant = "default",
  ...props
}: SelectProps<Option, IsMulti, Group>) => {
  const reactSelectProps = React.useMemo(() => {
    return getReactSelectProps<Option, IsMulti, Group>({
      components: components || {},
      menuPlacement,
    });
  }, [components, menuPlacement]);

  // Annoyingly if we update styles here we have to update timezone select too
  // We cant create a generate function for this as we can't force state changes - onSelect styles dont change for example
  return (
    <ReactSelect
      {...reactSelectProps}
      classNames={{
        input: () => classNames("dark:text-darkgray-900 text-gray-900", props.classNames?.input),
        option: (state) =>
          classNames(
            "dark:bg-darkgray-100 flex cursor-pointer justify-between py-2.5 px-3 rounded-none text-gray-700 dark:text-darkgray-700",
            state.isFocused && "dark:bg-darkgray-200 bg-gray-100",
            state.isSelected && "dark:bg-darkgray-300 bg-gray-200 text-gray-900 dark:text-darkgray-900",
            props.classNames?.option
          ),
        placeholder: (state) =>
          classNames(
            "text-gray-400 text-sm dark:text-darkgray-400",
            state.isFocused && variant !== "checkbox" && "hidden"
          ),
        dropdownIndicator: () => "text-gray-600 dark:text-darkgray-400",
        control: (state) =>
          classNames(
            "dark:bg-darkgray-100 dark:border-darkgray-300 !min-h-9 border-gray-300 bg-white text-sm leading-4 placeholder:text-sm placeholder:font-normal  focus-within:ring-2 focus-within:ring-gray-800 hover:border-gray-400 dark:focus-within:ring-darkgray-900 rounded-md border ",
            state.isMulti
              ? variant === "checkbox"
                ? "px-3 py-2"
                : state.hasValue
                ? "p-1"
                : "px-3 py-2"
              : "py-2 px-3",
            props.classNames?.control
          ),
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
        ...props.classNames,
      }}
      {...props}
    />
  );
};

export const SelectField = function SelectField<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>(
  props: {
    required?: boolean;
    name?: string;
    containerClassName?: string;
    label?: string;
    labelProps?: React.ComponentProps<typeof Label>;
    className?: string;
    error?: string;
  } & SelectProps<Option, IsMulti, Group>
) {
  const { t } = useLocale();
  const { label = t(props.name || ""), containerClassName, labelProps, className, ...passThrough } = props;
  const id = useId();
  return (
    <div className={classNames(containerClassName)}>
      <div className={classNames(className)}>
        {!!label && (
          <Label htmlFor={id} {...labelProps} className={classNames(props.error && "text-red-900")}>
            {label}
          </Label>
        )}
      </div>
      <Select {...passThrough} />
    </div>
  );
};

/**
 * TODO: It should replace Select after through testing
 */
export function SelectWithValidation<
  Option extends { label: string; value: string },
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  required = false,
  onChange,
  value,
  ...remainingProps
}: SelectProps<Option, IsMulti, Group> & { required?: boolean }) {
  const [hiddenInputValue, _setHiddenInputValue] = React.useState(() => {
    if (value instanceof Array || !value) {
      return;
    }
    return value.value || "";
  });

  const setHiddenInputValue = React.useCallback((value: MultiValue<Option> | SingleValue<Option>) => {
    let hiddenInputValue = "";
    if (value instanceof Array) {
      hiddenInputValue = value.map((val) => val.value).join(",");
    } else {
      hiddenInputValue = value?.value || "";
    }
    _setHiddenInputValue(hiddenInputValue);
  }, []);

  React.useEffect(() => {
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
