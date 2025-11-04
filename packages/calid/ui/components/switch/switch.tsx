import { cn } from "@calid/features/lib/cn";
import { useId } from "@radix-ui/react-id";
import * as Label from "@radix-ui/react-label";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import type { ReactNode } from "react";
import React from "react";

import { Tooltip } from "../tooltip";

const Wrapper = ({
  children,
  tooltip,
  tooltipSide = "top",
  tooltipOffset = 4,
  tooltipClassName,
}: {
  tooltip?: string;
  children: React.ReactNode;
  tooltipSide?: "top" | "right" | "bottom" | "left";
  tooltipOffset?: number;
  tooltipClassName?: string;
}) => {
  if (!tooltip) {
    return <>{children}</>;
  }
  return (
    <Tooltip content={tooltip} side={tooltipSide} sideOffset={tooltipOffset} className={tooltipClassName}>
      {children}
    </Tooltip>
  );
};
export const Switch = (
  props: React.ComponentProps<typeof SwitchPrimitives.Root> & {
    label?: string | ReactNode;
    fitToHeight?: boolean;
    disabled?: boolean;
    tooltip?: string;
    tooltipSide?: "top" | "right" | "bottom" | "left";
    tooltipOffset?: number;
    tooltipClassName?: string;
    labelOnLeading?: boolean;
    size?: "base" | "sm";
    classNames?: {
      container?: string;
      thumb?: string;
    };
    LockedIcon?: React.ReactNode;
    padding?: boolean;
  }
) => {
  const {
    label,
    fitToHeight,
    classNames,
    labelOnLeading,
    LockedIcon,
    padding,
    size = "base",
    tooltipSide,
    tooltipOffset,
    tooltipClassName,
    ...primitiveProps
  } = props;
  const id = useId();
  return (
    <Wrapper
      tooltip={props.tooltip}
      tooltipSide={tooltipSide}
      tooltipOffset={tooltipOffset}
      tooltipClassName={tooltipClassName}>
      <div
        className={cn(
          "flex h-auto w-fit flex-row items-center",
          fitToHeight && "h-fit",
          labelOnLeading && "flex-row-reverse",
          padding && "hover:bg-subtle rounded-md p-1.5",
          classNames?.container
        )}>
        {LockedIcon && <div className="mr-2">{LockedIcon}</div>}
        <SwitchPrimitives.Root
          {...primitiveProps}
          id={id}
          className={cn(
            size === "sm" ? "h-3 w-[20px]" : "h-3.5 w-[24px]",
            "focus:ring-brand-default data-[state=checked]:bg-brand-default dark:data-[state=checked]:bg-brand-emphasis data-[state=unchecked]:bg-emphasis peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-inner transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            size === "sm" ? "h-4 w-7" : "h-5 w-10",
            classNames?.container
          )}>
          <SwitchPrimitives.Thumb
            className={cn(
              "bg-default data-[state=checked]:bg-brand-accent shadow-switch-thumb pointer-events-none block rounded-full shadow-lg ring-0 transition-transform",
              size === "sm"
                ? "h-3 w-3 data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0"
                : "h-4 w-4 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
              classNames?.thumb
            )}
          />
        </SwitchPrimitives.Root>
        {label && (
          <Label.Root
            htmlFor={id}
            className={cn(
              "text-emphasis align-text-top font-medium",
              size === "sm" ? "m-1 text-xs" : "m-2 text-sm",
              primitiveProps.disabled ? "cursor-not-allowed opacity-25" : "cursor-pointer",
              labelOnLeading && "flex-1"
            )}>
            {label}
          </Label.Root>
        )}
      </div>
    </Wrapper>
  );
};
