import type {
  ControlProps,
  GroupBase,
  InputProps,
  MenuListProps,
  MenuProps,
  MultiValueProps,
  OptionProps,
  SingleValueProps,
  ValueContainerProps,
} from "react-select";
import { components as reactSelectComponents } from "react-select";

import { classNames } from "@calcom/lib";

import { UpgradeTeamsBadge } from "../../badge";
import { FiCheck } from "../../icon";

export const InputComponent = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  inputClassName,
  ...props
}: InputProps<Option, IsMulti, Group>) => {
  return (
    <reactSelectComponents.Input
      // disables our default form focus hightlight on the react-select input element
      inputClassName={classNames(
        "focus:ring-0 focus:ring-offset-0 dark:!text-darkgray-900 !text-emphasis",
        inputClassName
      )}
      {...props}
    />
  );
};

type ExtendedOption = {
  value: string | number;
  label: string;
  needsUpgrade?: boolean;
};

export const OptionComponent = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  className,
  ...props
}: OptionProps<Option, IsMulti, Group>) => {
  return (
    <reactSelectComponents.Option
      {...props}
      className={classNames(
        className,
        "dark:bg-darkgray-100 !flex !cursor-pointer justify-between !py-3",
        props.isFocused && "dark:!bg-darkgray-200 !bg-subtle",
        props.isSelected && "dark:!bg-darkgray-300 !bg-neutral-900"
      )}>
      <>
        <span className="mr-auto">{props.label}</span>
        {(props.data as unknown as ExtendedOption).needsUpgrade && <UpgradeTeamsBadge />}
        {props.isSelected && <FiCheck className="ml-2 h-4 w-4" />}
      </>
    </reactSelectComponents.Option>
  );
};

export const ControlComponent = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  className,
  ...props
}: ControlProps<Option, IsMulti, Group>) => (
  <reactSelectComponents.Control
    {...props}
    className={classNames(
      className,
      "dark:bg-darkgray-100 dark:border-darkgray-300 !min-h-9  bg-default border-default text-sm leading-4 placeholder:text-sm placeholder:font-normal focus-within:border-0 focus-within:ring-2 focus-within:ring-neutral-800 hover:border-neutral-400 dark:focus-within:ring-white"
    )}
  />
);

export const SingleValueComponent = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  className,
  ...props
}: SingleValueProps<Option, IsMulti, Group>) => (
  <reactSelectComponents.SingleValue
    {...props}
    className={classNames(
      className,
      " dark:placeholder:text-darkgray-500 placeholder:text-muted text-emphasis"
    )}
  />
);

export const ValueContainerComponent = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  className,
  ...props
}: ValueContainerProps<Option, IsMulti, Group>) => (
  <reactSelectComponents.ValueContainer
    {...props}
    className={classNames(
      " dark:placeholder:text-darkgray-500 placeholder:text-muted text-emphasis",
      className
    )}
  />
);

export const MultiValueComponent = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  className,
  ...props
}: MultiValueProps<Option, IsMulti, Group>) => (
  <reactSelectComponents.MultiValue
    {...props}
    className={classNames(
      "dark:bg-darkgray-200  bg-subtle text-default !rounded-md",
      className
    )}
  />
);

export const MenuComponent = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  className,
  ...props
}: MenuProps<Option, IsMulti, Group>) => (
  <reactSelectComponents.Menu
    {...props}
    className={classNames(
      "dark:bg-darkgray-100 bg-default dark:text-inverted !rounded-md text-sm leading-4",
      className
    )}
  />
);

export const MenuListComponent = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  className,
  ...props
}: MenuListProps<Option, IsMulti, Group>) => (
  <reactSelectComponents.MenuList
    {...props}
    className={classNames("scroll-bar scrollbar-track-w-20 rounded-md", className)}
  />
);
