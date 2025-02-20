"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";
import { forwardRef } from "react";

import { Icon } from "../icon";
import type { ButtonBaseProps, ButtonProps } from "./Button";
import { Button, buttonClasses } from "./Button";

export interface SplitButtonProps extends ButtonBaseProps {
  children?: ReactNode;
  dropdown?: {
    items: {
      label: string;
      action: () => void;
      icon?: ButtonProps["StartIcon"];
      color?: ButtonProps["color"];
    }[];
  };
}

export const SplitButton = forwardRef<HTMLButtonElement, SplitButtonProps>(function SplitButton(
  { children, dropdown, StartIcon, color = "primary", ...mainButtonProps },
  forwardedRef
) {
  if (!dropdown) {
    return (
      <Button ref={forwardedRef} StartIcon={StartIcon} color={color} {...mainButtonProps}>
        {children}
      </Button>
    );
  }

  return (
    <div className="inline-flex">
      <Button
        {...mainButtonProps}
        className="rounded-r-none border-r-0"
        StartIcon={StartIcon}
        color={color}
        ref={forwardedRef}>
        {children}
      </Button>
      <DropdownMenuPrimitive.Root>
        <DropdownMenuPrimitive.Trigger asChild>
          <button
            className={buttonClasses({
              variant: "button",
              color,
              size: mainButtonProps.size,
              className: "rounded-l-none px-2",
            })}>
            <Icon name="chevron-down" className="h-4 w-4" />
          </button>
        </DropdownMenuPrimitive.Trigger>

        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content
            align="end"
            className="bg-default border-subtle z-50 mt-1 min-w-[180px] overflow-hidden rounded-md border p-1 shadow-md">
            {dropdown.items.map((item, index) => (
              <DropdownMenuPrimitive.Item
                key={index}
                className="text-default hover:bg-subtle focus:bg-subtle flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none"
                onClick={item.action}>
                {item.icon && <Icon name={item.icon} className="h-4 w-4" />}
                {item.label}
              </DropdownMenuPrimitive.Item>
            ))}
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>
    </div>
  );
});
