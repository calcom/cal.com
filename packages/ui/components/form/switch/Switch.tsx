import cx from "@calcom/ui/classNames";
import { useId } from "@radix-ui/react-id";
import * as Label from "@radix-ui/react-label";
import * as PrimitiveSwitch from "@radix-ui/react-switch";
import type React from "react";
import type { ReactNode } from "react";
import { Tooltip } from "../../tooltip";

const Wrapper = ({ children, tooltip }: { tooltip?: string; children: React.ReactNode }) => {
  if (!tooltip) {
    return <>{children}</>;
  }
  return <Tooltip content={tooltip}>{children}</Tooltip>;
};
export const Switch = (
  props: React.ComponentProps<typeof PrimitiveSwitch.Root> & {
    label?: string | ReactNode;
    fitToHeight?: boolean;
    disabled?: boolean;
    tooltip?: string;
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
    ...primitiveProps
  } = props;
  const id = useId();
  return (
    <Wrapper tooltip={props.tooltip}>
      <div
        className={cx(
          "flex h-auto w-fit flex-row items-center",
          fitToHeight && "h-fit",
          labelOnLeading && "flex-row-reverse justify-between",
          padding && "hover:bg-subtle rounded-md p-1.5",
          classNames?.container
        )}>
        {LockedIcon && <div className="mr-2">{LockedIcon}</div>}
        <PrimitiveSwitch.Root
          {...primitiveProps}
          id={id}
          className={cx(
            size === "sm" ? "h-3 w-[20px]" : "h-4 w-[28px]",
            "focus:ring-brand-default data-[state=checked]:bg-brand-default dark:data-[state=checked]:bg-brand-emphasis data-[state=unchecked]:bg-emphasis peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-inner transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            size === "sm" ? "h-4 w-7" : "h-6 w-11",
            classNames?.container
          )}>
          <PrimitiveSwitch.Thumb
            className={cx(
              "bg-default data-[state=checked]:bg-brand-accent shadow-switch-thumb pointer-events-none block rounded-full shadow-lg ring-0 transition-transform",
              size === "sm"
                ? "h-3 w-3 data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0 rtl:data-[state=checked]:-translate-x-3"
                : "h-5 w-5 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 rtl:data-[state=checked]:-translate-x-5",
              classNames?.thumb
            )}
          />
        </PrimitiveSwitch.Root>
        {label && (
          <Label.Root
            htmlFor={id}
            className={cx(
              "text-emphasis font-medium",
              size === "sm" ? "m-1 text-xs" : labelOnLeading ? "mr-2 text-sm" : "ml-2 text-sm",
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
