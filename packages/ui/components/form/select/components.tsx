import {
  components as reactSelectComponents,
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

import { classNames } from "@calcom/lib";

import { Icon } from "../../../components/icon";
import { UpgradeTeamsBadge } from "../../badge";

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
        "focus:ring-0 focus:ring-offset-0 dark:!text-darkgray-900 !text-black",
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
        props.isFocused && "dark:!bg-darkgray-200 !bg-gray-100",
        props.isSelected && "dark:!bg-darkgray-300 !bg-neutral-900"
      )}>
      <>
        <span className="mr-auto">{props.label}</span>
        {(props.data as unknown as ExtendedOption).needsUpgrade && <UpgradeTeamsBadge />}
        {props.isSelected && <Icon.FiCheck className="ml-2 h-4 w-4" />}
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
      "dark:bg-darkgray-100 dark:border-darkgray-300 border-gray-300 bg-white text-sm leading-4 placeholder:text-sm placeholder:font-normal focus-within:border-0 focus-within:ring-2 focus-within:ring-neutral-800 hover:border-neutral-400 dark:focus-within:ring-white"
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
      "dark:text-darkgray-900 dark:placeholder:text-darkgray-500 text-black placeholder:text-gray-400"
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
      "dark:text-darkgray-900 dark:placeholder:text-darkgray-500 text-black placeholder:text-gray-400",
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
      "dark:bg-darkgray-200 dark:text-darkgray-900 !rounded-md bg-gray-100 text-gray-700",
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
      "dark:bg-darkgray-100 dark:border-darkgray-300 !rounded-md border border-gray-900 bg-white text-sm leading-4 dark:text-white",
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
    className={classNames(
      "scrollbar-thin scrollbar-thumb-rounded-md dark:scrollbar-thumb-darkgray-300 scrollbar-thumb-gray-300 scrollbar-track-transparent scrollbar-track-w-[80px] rounded-md",
      className
    )}
  />
);
