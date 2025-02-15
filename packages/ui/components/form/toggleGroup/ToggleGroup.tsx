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
  orientation?: "horizontal" | "vertical";
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
  orientation = "horizontal",
  customClassNames,
  ...props
}: ToggleGroupProps & { customClassNames?: string }) => {
  return (
    <>
      <RadixToggleGroup.Root
        type="single"
        {...props}
        orientation={orientation}
        onValueChange={onValueChange}
        className={classNames(
          `border-default bg-default relative rounded-md border p-1`,
          orientation === "horizontal" && "min-h-9 inline-flex gap-0.5 rtl:flex-row-reverse",
          orientation === "vertical" && "flex w-fit flex-col gap-0.5",
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
                "aria-checked:bg-emphasis relative rounded-[4px] px-3 py-1 text-sm leading-tight transition",
                option.disabled
                  ? "text-gray-400 hover:cursor-not-allowed"
                  : "text-default [&[aria-checked='false']]:hover:text-emphasis",
                isFullWidth && "w-full"
              )}>
              <div
                className={classNames(
                  "flex items-center gap-2",
                  orientation === "horizontal" && "justify-center",
                  orientation === "vertical" && "justify-start"
                )}>
                {option.iconLeft && <span className="flex h-4 w-4 items-center">{option.iconLeft}</span>}
                {option.label}
              </div>
            </RadixToggleGroup.Item>
          </OptionalTooltipWrapper>
        ))}
      </RadixToggleGroup.Root>
    </>
  );
};
