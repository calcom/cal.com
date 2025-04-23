import * as RadixToggleGroup from "@radix-ui/react-toggle-group";
import type { ReactNode } from "react";

import classNames from "@calcom/ui/classNames";

import { Tooltip } from "../../tooltip/Tooltip";

interface ToggleGroupProps extends Omit<RadixToggleGroup.ToggleGroupSingleProps, "type"> {
  value: string;
  onValueChange: (value: string) => void;
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

/**
 * ToggleGroup Component
 *
 * @param props - Component props
 * @param props.value - Current selected value (required)
 * @param props.options - Available options to display
 * @param props.onValueChange - Callback when selection changes
 * @example
 * <ToggleGroup
 *   value={currentLayout}
 *   onValueChange={handleLayoutChange}
 *   options={[
 *     { value: "month", label: "Month" },
 *     { value: "week", label: "Week" }
 *   ]}
 * />
 */
export const ToggleGroup = ({
  options,
  onValueChange,
  isFullWidth,
  orientation = "horizontal",
  customClassNames,
  value,
  ...props
}: ToggleGroupProps & { customClassNames?: string }) => {
  if (value === undefined) {
    console.error(
      "ToggleGroup: 'value' prop is required. You may have mistakenly used 'defaultValue' instead."
    );
  }
  const handleValueChange = (newValue: string) => {
    if (!newValue || newValue === value) return;
    onValueChange(newValue);
  };

  return (
    <>
      <RadixToggleGroup.Root
        type="single"
        {...props}
        orientation={orientation}
        onValueChange={handleValueChange}
        value={value}
        style={{
          // @ts-expect-error --toggle-group-shadow is not a valid CSS property but can be a variable
          "--toggle-group-shadow":
            "0px 2px 3px 0px rgba(0, 0, 0, 0.03), 0px 2px 2px -1px rgba(0, 0, 0, 0.03)",
        }}
        className={classNames(
          `bg-subtle border-subtle rounded-[10px] border p-0.5`,
          orientation === "horizontal" && "inline-flex gap-0.5 rtl:flex-row-reverse",
          orientation === "vertical" && "flex w-fit flex-col gap-0.5",
          props.className,
          isFullWidth && "w-full",
          customClassNames
        )}>
        {options.map((option) => (
          <OptionalTooltipWrapper
            key={option.value}
            //Tooltip displays only if option is not currently selected
            tooltipText={option.value !== value ? option.tooltip : undefined}>
            <RadixToggleGroup.Item
              disabled={option.disabled}
              value={option.value}
              data-testid={`toggle-group-item-${option.value}`}
              className={classNames(
                "aria-checked:bg-default aria-checked:border-subtle rounded-lg border border-transparent p-1.5 text-sm leading-none transition aria-checked:shadow-[0px_2px_3px_0px_rgba(0,0,0,0.03),0px_2px_2px_-1px_rgba(0,0,0,0.03)]",
                option.value === value && "cursor-default", // Option shouldn't look clickable when already selected
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
