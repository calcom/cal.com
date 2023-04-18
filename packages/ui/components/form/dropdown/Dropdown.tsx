import { CheckCircleIcon } from "@heroicons/react/outline";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { ComponentProps, forwardRef } from "react";

import { classNames } from "@calcom/lib";
import { SVGComponent } from "@calcom/types/SVGComponent";

import { ButtonColor } from "../../button/Button";

export const Dropdown = DropdownMenuPrimitive.Root;

type DropdownMenuTriggerProps = ComponentProps<typeof DropdownMenuPrimitive["Trigger"]>;
export const DropdownMenuTrigger = forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ className = "", ...props }, forwardedRef) => (
    <DropdownMenuPrimitive.Trigger
      {...props}
      className={classNames(
        !props.asChild &&
          `inline-flex items-center rounded-md bg-transparent px-3 py-2 text-sm font-medium text-gray-700 ring-0 hover:bg-gray-50 focus:bg-gray-100 group-hover:text-black ${className}`
      )}
      ref={forwardedRef}
    />
  )
);
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export const DropdownMenuTriggerItem = DropdownMenuPrimitive.Trigger;

export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

type DropdownMenuContentProps = ComponentProps<typeof DropdownMenuPrimitive["Content"]>;
export const DropdownMenuContent = forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ children, sideOffset = 2, align = "end", ...props }, forwardedRef) => {
    return (
      <DropdownMenuPrimitive.Content
        align={align}
        {...props}
        sideOffset={sideOffset}
        className={classNames(
          "shadow-dropdown w-50 relative z-10 origin-top-right rounded-md border border-gray-200 bg-white text-sm",
          "[&>*:first-child]:mt-1 [&>*:last-child]:mb-1"
        )}
        ref={forwardedRef}>
        {children}
      </DropdownMenuPrimitive.Content>
    );
  }
);
DropdownMenuContent.displayName = "DropdownMenuContent";

type DropdownMenuLabelProps = ComponentProps<typeof DropdownMenuPrimitive["Label"]>;
export const DropdownMenuLabel = (props: DropdownMenuLabelProps) => (
  <DropdownMenuPrimitive.Label {...props} className="px-3 py-2 text-gray-500" />
);

type DropdownMenuItemProps = ComponentProps<typeof DropdownMenuPrimitive["CheckboxItem"]>;
export const DropdownMenuItem = forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className = "", ...props }, forwardedRef) => (
    <DropdownMenuPrimitive.Item
      className={`focus:ring-brand-800 text-sm text-gray-700 ring-inset first-of-type:rounded-t-[inherit] last-of-type:rounded-b-[inherit] hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-1 ${className}`}
      {...props}
      ref={forwardedRef}
    />
  )
);
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuGroup = DropdownMenuPrimitive.Group;

type DropdownMenuCheckboxItemProps = ComponentProps<typeof DropdownMenuPrimitive["CheckboxItem"]>;
export const DropdownMenuCheckboxItem = forwardRef<HTMLDivElement, DropdownMenuCheckboxItemProps>(
  ({ children, ...props }, forwardedRef) => {
    return (
      <DropdownMenuPrimitive.CheckboxItem {...props} ref={forwardedRef}>
        {children}
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckCircleIcon />
        </DropdownMenuPrimitive.ItemIndicator>
      </DropdownMenuPrimitive.CheckboxItem>
    );
  }
);
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

type DropdownMenuRadioItemProps = ComponentProps<typeof DropdownMenuPrimitive["RadioItem"]>;
export const DropdownMenuRadioItem = forwardRef<HTMLDivElement, DropdownMenuRadioItemProps>(
  ({ children, ...props }, forwardedRef) => {
    return (
      <DropdownMenuPrimitive.RadioItem {...props} ref={forwardedRef}>
        {children}
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckCircleIcon />
        </DropdownMenuPrimitive.ItemIndicator>
      </DropdownMenuPrimitive.RadioItem>
    );
  }
);
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

type DropdownItemProps = {
  children: React.ReactNode;
  color?: ButtonColor;
  StartIcon?: SVGComponent;
  EndIcon?: SVGComponent;
  href?: string;
  disabled?: boolean;
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
  const { StartIcon, EndIcon, children, color, ...rest } = props;

  return (
    <ButtonOrLink
      {...rest}
      className={classNames(
        "inline-flex w-full items-center px-3 py-2 text-gray-700 hover:text-gray-900 disabled:cursor-not-allowed",
        color === "destructive" ? "hover:bg-red-100 hover:text-red-700" : "hover:bg-gray-100"
      )}>
      <>
        {StartIcon && <StartIcon className="h-4 w-4" />}
        <div className="mx-3 text-sm font-medium leading-5">{children}</div>
        {EndIcon && <EndIcon className="h-4 w-4" />}
      </>
    </ButtonOrLink>
  );
};

type DropdownMenuSeparatorProps = ComponentProps<typeof DropdownMenuPrimitive["Separator"]>;
export const DropdownMenuSeparator = forwardRef<HTMLDivElement, DropdownMenuSeparatorProps>(
  ({ className = "", ...props }, forwardedRef) => {
    return (
      <DropdownMenuPrimitive.Separator
        className={classNames("my-1 h-px bg-gray-200", className)}
        {...props}
        ref={forwardedRef}
      />
    );
  }
);
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

export default Dropdown;
