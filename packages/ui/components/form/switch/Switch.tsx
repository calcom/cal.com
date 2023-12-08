import { useId } from "@radix-ui/react-id";
import * as Label from "@radix-ui/react-label";
import * as PrimitiveSwitch from "@radix-ui/react-switch";
import React from "react";

import cx from "@calcom/lib/classNames";

import { Tooltip } from "../../tooltip";

const Wrapper = ({ children, tooltip }: { tooltip?: string; children: React.ReactNode }) => {
  if (!tooltip) {
    return <>{children}</>;
  }
  return <Tooltip content={tooltip}>{children}</Tooltip>;
};
const Switch = (
  props: React.ComponentProps<typeof PrimitiveSwitch.Root> & {
    label?: string;
    fitToHeight?: boolean;
    disabled?: boolean;
    tooltip?: string;
    labelOnLeading?: boolean;
    classNames?: {
      container?: string;
      thumb?: string;
    };
    LockedIcon?: React.ReactNode;
  }
) => {
  const { label, fitToHeight, classNames, labelOnLeading, LockedIcon, ...primitiveProps } = props;
  const id = useId();
  const isChecked = props.checked || props.defaultChecked;
  return (
    <Wrapper tooltip={props.tooltip}>
      <div
        className={cx(
          "flex h-auto w-auto flex-row items-center",
          fitToHeight && "h-fit",
          labelOnLeading && "flex-row-reverse",
          classNames?.container
        )}>
        {LockedIcon && <div className="mr-2">{LockedIcon}</div>}
        <PrimitiveSwitch.Root
          className={cx(
            isChecked ? "bg-brand-default dark:bg-emphasis" : "bg-emphasis",
            primitiveProps.disabled && "cursor-not-allowed",
            "focus:ring-brand-default h-5 w-[34px] rounded-full shadow-none focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-1",
            props.className
          )}
          {...primitiveProps}>
          <PrimitiveSwitch.Thumb
            id={id}
            className={cx(
              "block h-[14px] w-[14px] rounded-full transition will-change-transform ltr:translate-x-[4px] rtl:-translate-x-[4px] ltr:[&[data-state='checked']]:translate-x-[17px] rtl:[&[data-state='checked']]:-translate-x-[17px]",
              isChecked ? "bg-brand-accent shadow-inner" : "bg-default",
              classNames?.thumb
            )}
          />
        </PrimitiveSwitch.Root>
        {label && (
          <Label.Root
            htmlFor={id}
            className={cx(
              "text-emphasis ms-2 align-text-top text-sm font-medium",
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

export default Switch;
