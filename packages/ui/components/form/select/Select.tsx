import { useId } from "@radix-ui/react-id";
import * as React from "react";
import ReactSelect, {
  components as reactSelectComponents,
  GroupBase,
  Props,
  SingleValue,
  MultiValue,
  SelectComponentsConfig,
  MenuPlacement,
} from "react-select";

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
  className: classNames("block h-[36px] w-full min-w-0 flex-1 rounded-md", className),
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
  className,
  components,
  styles,
  ...props
}: SelectProps<Option, IsMulti, Group>) => {
  const reactSelectProps = React.useMemo(() => {
    return getReactSelectProps<Option, IsMulti, Group>({
      className,
      components: components || {},
    });
  }, [className, components]);

  return (
    <ReactSelect
      {...reactSelectProps}
      {...props}
      styles={{
        option: (defaultStyles, state) => ({
          ...defaultStyles,
          backgroundColor: state.isSelected
            ? state.isFocused
              ? "var(--brand-color)"
              : "var(--brand-color)"
            : state.isFocused
            ? "var(--brand-color-dark-mode)"
            : "var(--brand-text-color)",
        }),
        ...styles,
      }}
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
