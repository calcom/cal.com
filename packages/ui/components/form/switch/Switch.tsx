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
    tooltip?: string;
    classNames?: {
      container?: string;
      thumb?: string;
    };
  }
) => {
  const { label, fitToHeight, classNames, ...primitiveProps } = props;
  const id = useId();

  return (
    <Wrapper tooltip={props.tooltip}>
      <div
        className={cx(
          "flex h-auto w-auto flex-row items-center",
          fitToHeight && "h-fit",
          classNames?.container
        )}>
        <PrimitiveSwitch.Root
          className={cx(
            props.checked || props.defaultChecked ? "bg-inverted" : "bg-emphasis",
            primitiveProps.disabled && "cursor-not-allowed",
            "focus:ring-brand-default h-5 w-[34px] rounded-full shadow-none",
            props.className
          )}
          {...primitiveProps}>
          <PrimitiveSwitch.Thumb
            id={id}
            className={cx(
              "block h-[14px] w-[14px] rounded-full transition will-change-transform ltr:translate-x-[4px] rtl:-translate-x-[4px] ltr:[&[data-state='checked']]:translate-x-[17px] rtl:[&[data-state='checked']]:-translate-x-[17px]",
              props.checked || props.defaultChecked ? "bg-default shadow-inner" : "bg-inverted",
              classNames?.thumb
            )}
          />
        </PrimitiveSwitch.Root>
        {label && (
          <Label.Root
            htmlFor={id}
            className={cx(
              "text-emphasis align-text-top text-sm font-medium ltr:ml-2 rtl:mr-2",
              primitiveProps.disabled ? "cursor-not-allowed opacity-25" : "cursor-pointer "
            )}>
            {label}
          </Label.Root>
        )}
      </div>
    </Wrapper>
  );
};

export default Switch;
