import * as RadixToggleGroup from "@radix-ui/react-toggle-group";
import type { ReactNode } from "react";

import classNames from "@calcom/ui/classNames";

import { Tooltip } from "../../tooltip/Tooltip";

interface ToggleGroupProps extends Omit<RadixToggleGroup.ToggleGroupSingleProps, "type"> {
  options: {
    value: string;
    label: string | ReactNode;
    disabled?: boolean;
    tooltip?: string;
    iconLeft?: ReactNode;
    dataTestId?: string;
    onClick?: VoidFunction;
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
        style={{
          // @ts-expect-error --toggle-group-shadow is not a valid CSS property but can be a variable
          "--toggle-group-shadow":
            "0px 2px 3px 0px rgba(0, 0, 0, 0.03), 0px 2px 2px -1px rgba(0, 0, 0, 0.03)",
        }}
        className={classNames(
          `bg-muted rounded-[10px] p-0.5`,
          orientation === "horizontal" && "inline-flex gap-0.5 rtl:flex-row-reverse",
          orientation === "vertical" && "flex w-fit flex-col gap-0.5",
          props.className,
          isFullWidth && "w-full",
          customClassNames
        )}>
        {options.map((option) => (
          <OptionalTooltipWrapper key={option.value} tooltipText={option.tooltip}>
            <RadixToggleGroup.Item
              disabled={option.disabled}
              onClick={option?.onClick}
              value={option.value}
              data-testid={option.dataTestId ?? `toggle-group-item-${option.value}`}
              className={classNames(
                "aria-checked:bg-default aria-checked:border-subtle rounded-lg border border-transparent p-1.5 text-sm leading-none transition aria-checked:shadow-[0px_2px_3px_0px_rgba(0,0,0,0.03),0px_2px_2px_-1px_rgba(0,0,0,0.03)]",
                option.disabled
                  ? "text-gray-400 hover:cursor-not-allowed"
                  : "text-default [&[aria-checked='false']]:hover:text-emphasis [&[aria-checked='false']]:hover:bg-subtle cursor-pointer",
                isFullWidth && "w-full"
              )}>
              <div
                className={classNames(
                  "flex items-center gap-1",
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
