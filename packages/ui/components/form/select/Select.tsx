import { useId } from "@radix-ui/react-id";
import * as React from "react";
import type { GroupBase, Props, SingleValue, MultiValue } from "react-select";
import ReactSelect from "react-select";

import cx from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Label } from "../inputs/Label";
import { inputStyles } from "../inputs/TextField";
import { getReactSelectProps } from "./selectTheme";

export type SelectProps<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
> = Props<Option, IsMulti, Group> & {
  variant?: "default" | "checkbox";
  "data-testid"?: string;
  size?: "sm" | "md";
  grow?: boolean;
};

export const Select = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  components,
  variant = "default",
  size = "md",
  grow = true,
  ...props
}: SelectProps<Option, IsMulti, Group> & {
  innerClassNames?: {
    input?: string;
    option?: string;
    control?: string;
    singleValue?: string;
    valueContainer?: string;
    multiValue?: string;
    menu?: string;
    menuList?: string;
  };
}) => {
  const { classNames, innerClassNames, menuPlacement = "auto", ...restProps } = props;
  const reactSelectProps = React.useMemo(() => {
    return getReactSelectProps<Option, IsMulti, Group>({
      components: components || {},
      menuPlacement,
    });
  }, [components, menuPlacement]);

  const hasMultiLastIcons = props.isMulti || props.isLoading || props.isClearable;

  // Annoyingly if we update styles here we have to update timezone select too
  // We cant create a generate function for this as we can't force state changes - onSelect styles dont change for example
  return (
    <ReactSelect
      {...reactSelectProps}
      menuPlacement={menuPlacement}
      styles={{
        control: (base) => ({
          ...base,
          minHeight: size === "sm" ? "28px" : "36px",
          height: grow ? "auto" : size === "sm" ? "28px" : "36px",
        }),
      }}
      classNames={{
        input: () => cx("text-emphasis", innerClassNames?.input),
        option: (state) =>
          cx(
            "bg-default flex cursor-pointer justify-between py-1.5 px-2 rounded-md text-default items-center",
            state.isFocused && "bg-subtle",
            state.isDisabled && "bg-muted",
            state.isSelected && "bg-emphasis text-default",
            innerClassNames?.option
          ),
        placeholder: (state) => cx("text-muted", state.isFocused && variant !== "checkbox" && "hidden"),
        dropdownIndicator: () => "text-default",
        control: (state) =>
          cx(
            inputStyles({ size }),
            state.isMulti
              ? variant === "checkbox"
                ? "px-3 h-fit"
                : state.hasValue
                ? "p-1 h-fit"
                : "px-3 h-fit"
              : size === "sm"
              ? "h-7 px-2"
              : "h-9 px-3",
            props.isDisabled && "bg-subtle",
            size === "sm" ? "rounded-md" : "rounded-[10px]",
            "[&:focus-within]:border-emphasis [&:focus-within]:shadow-outline-gray-focused [&:focus-within]:ring-0 !flex",
            innerClassNames?.control
          ),
        singleValue: () => cx("text-default placeholder:text-muted", innerClassNames?.singleValue),
        valueContainer: () =>
          cx("text-default placeholder:text-muted flex gap-1", innerClassNames?.valueContainer),
        multiValue: () =>
          cx(
            "font-medium inline-flex items-center justify-center rounded bg-emphasis text-emphasis leading-none text-xs",
            size == "sm" ? "px-1.5 py-[1px] rounded-md" : "py-1 px-1.5 leading-none rounded-lg"
          ),
        menu: () =>
          cx(
            "rounded-lg bg-default text-sm leading-4 text-default mt-1 border border-subtle shadow-dropdown p-1",
            innerClassNames?.menu
          ),
        groupHeading: () => "leading-none text-xs text-muted p-2 font-medium ml-1",
        menuList: () =>
          cx(
            "scroll-bar scrollbar-track-w-20 rounded-md flex flex-col space-y-[1px]",
            innerClassNames?.menuList
          ),
        indicatorsContainer: (state) =>
          cx(
            state.selectProps.menuIsOpen
              ? hasMultiLastIcons
                ? "[&>*:last-child]:rotate-180 [&>*:last-child]:transition-transform"
                : "rotate-180 transition-transform"
              : "text-default" // Woo it adds another SVG here on multi for some reason
          ),
        multiValueRemove: () => "text-default py-auto",
        ...classNames,
      }}
      {...restProps}
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
    <div className={cx(containerClassName)}>
      <div className={cx(className)}>
        {!!label && (
          <Label
            htmlFor={id}
            {...labelProps}
            className={cx(props.error && "text-error", props.labelProps?.className)}>
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
      return "";
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
    <div className={cx("relative", remainingProps.className)}>
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
