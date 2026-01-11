import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import type { ComponentProps } from "react";
import { forwardRef } from "react";

import classNames from "@calcom/ui/classNames";

import type { ButtonColor } from "../button";
import { Icon } from "../icon";
import type { IconName } from "../icon";

export const Dropdown = DropdownMenuPrimitive.Root;

type DropdownMenuTriggerProps = ComponentProps<(typeof DropdownMenuPrimitive)["Trigger"]>;
export const DropdownMenuTrigger = forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ className = "", ...props }, forwardedRef) => (
    <DropdownMenuPrimitive.Trigger
      {...props}
      className={classNames(
        !props.asChild &&
          `focus:bg-subtle hover:bg-cal-muted text-default group-hover:text-emphasis inline-flex items-center rounded-md bg-transparent px-3 py-2 text-sm font-medium ring-0 transition ${className}`
      )}
      ref={forwardedRef}
    />
  )
);
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export const DropdownMenuTriggerItem = DropdownMenuPrimitive.Trigger;

export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

type DropdownMenuContentProps = ComponentProps<(typeof DropdownMenuPrimitive)["Content"]>;
export const DropdownMenuContent = forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ children, sideOffset = 2, align = "end", ...props }, forwardedRef) => {
    return (
      <DropdownMenuPrimitive.Content
        align={align}
        {...props}
        sideOffset={sideOffset}
        className={classNames(
          "shadow-dropdown bg-default border-subtle relative z-50 origin-top-right stack-y-px rounded-xl border p-1 text-sm",
          "w-[220px]",
          props.className
        )}
        ref={forwardedRef}>
        {children}
      </DropdownMenuPrimitive.Content>
    );
  }
);
DropdownMenuContent.displayName = "DropdownMenuContent";

type DropdownMenuLabelProps = ComponentProps<(typeof DropdownMenuPrimitive)["Label"]>;
export const DropdownMenuLabel = (props: DropdownMenuLabelProps) => (
  <DropdownMenuPrimitive.Label
    {...props}
    className={classNames("text-subtle px-2 pb-1 pt-1.5 text-xs font-semibold leading-none", props.className)}
  />
);

type DropdownMenuItemProps = ComponentProps<(typeof DropdownMenuPrimitive)["CheckboxItem"]>;
export const DropdownMenuItem = forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className = "", ...props }, forwardedRef) => (
    <DropdownMenuPrimitive.Item
      className={`hover:bg-subtle hover:text-emphasis text-default text-sm ring-inset first-of-type:rounded-t-[inherit] last-of-type:rounded-b-[inherit] hover:ring-0 focus:outline-none focus:bg-subtle focus:text-emphasis ${className}`}
      {...props}
      ref={forwardedRef}
    />
  )
);
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuGroup = DropdownMenuPrimitive.Group;

type DropdownMenuCheckboxItemProps = ComponentProps<(typeof DropdownMenuPrimitive)["CheckboxItem"]>;
export const DropdownMenuCheckboxItem = forwardRef<HTMLDivElement, DropdownMenuCheckboxItemProps>(
  ({ children, checked, onCheckedChange, ...props }, forwardedRef) => {
    return (
      <DropdownMenuPrimitive.CheckboxItem
        {...props}
        checked={checked}
        onCheckedChange={onCheckedChange}
        ref={forwardedRef}
        className="hover:text-emphasis text-default hover:bg-subtle flex flex-1 items-center space-x-2 px-3 py-2 hover:outline-none hover:ring-0 disabled:cursor-not-allowed">
        <div className="w-full">{children}</div>
        {!checked && (
          <input
            aria-disabled={true}
            aria-label={typeof children === "string" ? `Not active ${children}` : undefined}
            aria-readonly
            checked={false}
            type="checkbox"
            className="text-emphasis dark:text-muted focus:ring-emphasis border-default bg-default ml-auto h-4 w-4 rounded transition hover:cursor-pointer"
          />
        )}
        <DropdownMenuPrimitive.ItemIndicator asChild>
          <input
            aria-disabled={true}
            aria-readonly
            aria-label={typeof children === "string" ? `Active ${children}` : undefined}
            checked={true}
            type="checkbox"
            className="text-emphasis dark:text-muted focus:ring-emphasis border-default bg-default h-4 w-4 rounded transition hover:cursor-pointer"
          />
        </DropdownMenuPrimitive.ItemIndicator>
      </DropdownMenuPrimitive.CheckboxItem>
    );
  }
);
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

type DropdownMenuRadioItemProps = ComponentProps<(typeof DropdownMenuPrimitive)["RadioItem"]>;
export const DropdownMenuRadioItem = forwardRef<HTMLDivElement, DropdownMenuRadioItemProps>(
  ({ children, ...props }, forwardedRef) => {
    return (
      <DropdownMenuPrimitive.RadioItem {...props} ref={forwardedRef}>
        {children}
        <DropdownMenuPrimitive.ItemIndicator>
          <Icon name="circle-check" />
        </DropdownMenuPrimitive.ItemIndicator>
      </DropdownMenuPrimitive.RadioItem>
    );
  }
);
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

type DropdownItemProps = {
  children: React.ReactNode;
  color?: ButtonColor;
  StartIcon?: IconName;
  CustomStartIcon?: React.ReactNode;
  kbd?: string;
  EndIcon?: IconName;
  href?: string;
  disabled?: boolean;
  childrenClassName?: string;
} & ButtonOrLinkProps;

type ButtonOrLinkProps = ComponentProps<"button"> & ComponentProps<"a">;

export function ButtonOrLink({ href, ...props }: ButtonOrLinkProps) {
  const isLink = typeof href !== "undefined";
  const ButtonOrLink = isLink ? "a" : "button";

  const content = <ButtonOrLink {...props} />;

  if (isLink) {
    return (
      <Link href={href} legacyBehavior>
        {content}
      </Link>
    );
  }

  return content;
}

export const DropdownItem = (props: DropdownItemProps) => {
  const { CustomStartIcon, StartIcon, EndIcon, children, color, childrenClassName, ...rest } = props;

  return (
    <ButtonOrLink
      {...rest}
      className={classNames(
        "hover:text-emphasis text-default inline-flex w-full items-center space-x-1 rounded-lg  p-2 disabled:cursor-not-allowed",
        color === "destructive" ? "hover:bg-error hover:text-error text-error" : "hover:bg-subtle",
        props.className
      )}>
      <>
        {CustomStartIcon || (StartIcon && <Icon name={StartIcon} className="mr-1 h-4 w-4 shrink-0" />)}
        <div className={classNames("w-full text-left text-sm font-medium leading-none", childrenClassName)}>
          {children}
        </div>
        {EndIcon && <Icon name={EndIcon} className="h-4 w-4" />}
      </>
    </ButtonOrLink>
  );
};

type DropdownMenuSeparatorProps = ComponentProps<(typeof DropdownMenuPrimitive)["Separator"]>;
export const DropdownMenuSeparator = forwardRef<HTMLDivElement, DropdownMenuSeparatorProps>(
  ({ className = "", ...props }, forwardedRef) => {
    return (
      <DropdownMenuPrimitive.Separator
        className={classNames("bg-emphasis -mx-1 my-1 h-px", className)}
        {...props}
        ref={forwardedRef}
      />
    );
  }
);
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

export default Dropdown;
