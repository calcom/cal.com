import { useId } from "@radix-ui/react-id";
import * as React from "react";
import type {
  GroupBase,
  Props,
  SingleValue,
  MultiValue,
  MenuPlacement,
  SelectComponentsConfig,
} from "react-select";
import ReactSelect, { components as reactSelectComponents } from "react-select";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Label } from "../inputs/Label";
import {
  ControlComponent,
  InputComponent,
  MenuComponent,
  MenuListComponent,
  OptionComponent,
  SingleValueComponent,
  ValueContainerComponent,
  MultiValueComponent,
} from "./components";

export type SelectProps<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
> = Props<Option, IsMulti, Group>;

export const getReactSelectProps = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  className,
  components,
  menuPlacement = "auto",
}: {
  className?: string;
  components: SelectComponentsConfig<Option, IsMulti, Group>;
  menuPlacement?: MenuPlacement;
}) => ({
  menuPlacement,
  className: classNames("block min-h-6 w-full min-w-0 flex-1 rounded-md", className),
  classNamePrefix: "cal-react-select",
  components: {
    ...reactSelectComponents,
    IndicatorSeparator: () => null,
    Input: InputComponent,
    Option: OptionComponent,
    Control: ControlComponent,
    SingleValue: SingleValueComponent,
    Menu: MenuComponent,
    MenuList: MenuListComponent,
    ValueContainer: ValueContainerComponent,
    MultiValue: MultiValueComponent,
    ...components,
  },
});

export const Select = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  ...props
}: SelectProps<Option, IsMulti, Group>) => {
  return (
    <ReactSelect
      classNames={{
        input: () =>
          classNames(
            "focus:ring-0 focus:ring-offset-0 dark:text-darkgray-900 text-black",
            props.classNames?.input
          ),
        option: (state) =>
          classNames(
            "dark:bg-darkgray-100 flex cursor-pointer justify-between py-3",
            state.isFocused && "dark:bg-darkgray-200 bg-gray-100",
            state.isSelected && "dark:bg-darkgray-300 bg-neutral-900",
            props.classNames?.option
          ),
        control: () =>
          classNames(
            "dark:bg-darkgray-100 dark:border-darkgray-300 min-h-9  border-gray-300 bg-white text-sm leading-4 placeholder:text-sm placeholder:font-normal focus-within:border-0 focus-within:ring-2 focus-within:ring-neutral-800 hover:border-neutral-400 dark:focus-within:ring-white",
            props.classNames?.control
          ),
        singleValue: () =>
          classNames(
            "dark:text-darkgray-900 dark:placeholder:text-darkgray-500 text-black placeholder:text-gray-400",
            props.classNames?.singleValue
          ),
        valueContainer: () =>
          classNames(
            "dark:text-darkgray-900 dark:placeholder:text-darkgray-500 text-black placeholder:text-gray-400",
            props.classNames?.valueContainer
          ),
        multiValue: () =>
          classNames(
            "dark:bg-darkgray-200 dark:text-darkgray-900 rounded-md bg-gray-100 text-gray-700",
            props.classNames?.multiValue
          ),
        menu: () =>
          classNames(
            "dark:bg-darkgray-100 rounded-md bg-white text-sm leading-4 dark:text-white",
            props.classNames?.menu
          ),
        menuList: () => classNames("scroll-bar scrollbar-track-w-20 rounded-md", props.classNames?.menuList),
        ...props.classNames,
      }}
      unstyled
      {...props}
    />
  );
};

type IconLeadingProps = {
  icon: React.ReactNode;
  children?: React.ReactNode;
} & React.ComponentProps<typeof reactSelectComponents.Control>;

export const IconLeading = ({ icon, children, ...props }: IconLeadingProps) => {
  return (
    <reactSelectComponents.Control {...props}>
      {icon}
      {children}
    </reactSelectComponents.Control>
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
