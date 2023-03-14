import * as RadixToggleGroup from "@radix-ui/react-toggle-group";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { classNames } from "@calcom/lib";

interface ToggleGroupProps extends Omit<RadixToggleGroup.ToggleGroupSingleProps, "type"> {
  options: { value: string; label: string | ReactNode; disabled?: boolean }[];
  isFullWidth?: boolean;
}

export const ToggleGroup = ({ options, onValueChange, isFullWidth, ...props }: ToggleGroupProps) => {
  const [value, setValue] = useState<string | undefined>(props.defaultValue);
  const [activeToggleElement, setActiveToggleElement] = useState<null | HTMLButtonElement>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (value && onValueChange) onValueChange(value);
    setIsDirty(true);
  }, [value, onValueChange]);

  return (
    <>
      <RadixToggleGroup.Root
        type="single"
        {...props}
        onValueChange={setValue}
        className={classNames(
          "dark:border-darkgray-200 min-h-9 dark:bg-darkgray-50 relative inline-flex gap-0.5 rounded-md border border-gray-200 p-1",
          props.className,
          isFullWidth && "w-full"
        )}>
        {/* Active toggle. It's a separate element so we can animate it nicely. */}
        <span
          aria-hidden
          className={classNames(
            "dark:bg-darkgray-200 absolute top-[4px] bottom-[4px] left-0 z-[0] rounded-[4px] bg-gray-200",
            isDirty && "transition-all"
          )}
          style={{ left: activeToggleElement?.offsetLeft, width: activeToggleElement?.offsetWidth }}
        />
        {options.map((option) => (
          <RadixToggleGroup.Item
            disabled={option.disabled}
            key={option.value}
            value={option.value}
            className={classNames(
              "relative rounded-[4px] px-3 py-1 text-sm leading-tight",
              option.disabled
                ? "dark:text-darkgray-900 text-gray-400 hover:cursor-not-allowed"
                : "dark:text-darkgray-800 dark:[&[aria-checked='false']]:hover:bg-darkgray-100 [&[aria-checked='false']]:hover:bg-gray-100",
              isFullWidth && "w-full"
            )}
            ref={(node) => {
              if (node && value === option.value && activeToggleElement !== node) {
                setActiveToggleElement(node);
              }
              return node;
            }}>
            {option.label}
          </RadixToggleGroup.Item>
        ))}
      </RadixToggleGroup.Root>
    </>
  );
};
