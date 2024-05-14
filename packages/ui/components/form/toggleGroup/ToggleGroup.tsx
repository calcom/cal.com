import * as RadixToggleGroup from "@radix-ui/react-toggle-group";
import type { ReactNode } from "react";

import { classNames } from "@calcom/lib";
import { Tooltip } from "@calcom/ui";

interface ToggleGroupProps extends Omit<RadixToggleGroup.ToggleGroupSingleProps, "type"> {
  options: {
    value: string;
    label: string | ReactNode;
    disabled?: boolean;
    tooltip?: string;
    iconLeft?: ReactNode;
  }[];
  isFullWidth?: boolean;
}

const OptionalTooltipWrapper = ({
  children,
  tooltipText,
}: {
  children: ReactNode;
  tooltipText?: ReactNode;
}) => {
  if (tooltipText) {
    return (
      <Tooltip delayDuration={150} sideOffset={12} side="bottom" content={tooltipText}>
        {children}
      </Tooltip>
    );
  }
  return <>{children}</>;
};

export const ToggleGroup = ({
  options,
  onValueChange,
  isFullWidth,
  customClassNames,
  ...props
}: ToggleGroupProps & { customClassNames?: string }) => {
  return (
    <>
      <RadixToggleGroup.Root
        type="single"
        {...props}
        onValueChange={onValueChange}
        className={classNames(
          `border-default bg-default relative inline-flex min-h-9 gap-0.5 rounded-md border p-1 rtl:flex-row-reverse`,
          props.className,
          isFullWidth && "w-full",
          customClassNames
        )}>
        {options.map((option) => (
          <OptionalTooltipWrapper key={option.value} tooltipText={option.tooltip}>
            <RadixToggleGroup.Item
              disabled={option.disabled}
              value={option.value}
              data-testid={`toggle-group-item-${option.value}`}
              className={classNames(
                "aria-checked:bg-emphasis relative rounded-[4px] px-3 py-1 text-sm leading-tight transition-colors",
                option.disabled
                  ? "text-gray-400 hover:cursor-not-allowed"
                  : "text-default [&[aria-checked='false']]:hover:text-emphasis",
                isFullWidth && "w-full"
              )}>
              <div className="item-center flex justify-center ">
                {option.iconLeft && <span className="mr-2 flex h-4 w-4 items-center">{option.iconLeft}</span>}
                {option.label}
              </div>
            </RadixToggleGroup.Item>
          </OptionalTooltipWrapper>
        ))}
      </RadixToggleGroup.Root>
    </>
  );
};
