"use client";

import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";

import { Badge } from "../../badge/Badge";
import { Button } from "../../button/Button";
import { inputStyles, TextField } from "../inputs/TextField";
import { RangeSlider } from "./RangeSlider";

interface RangeSliderPopoverProps {
  triggerText: string;
  resetBtnText?: string;
  applyBtnText?: string;
  value: number[];
  onChange: (value: number[]) => void;
  min: number;
  max: number;
  step?: number;
  badgeVariant?: "default" | "success" | "gray" | "warning" | "orange" | "red";
  badgeSuffix?: string;
  inputSuffix?: string;
  inputLeading?: string;
}

export const RangeSliderPopover = ({
  resetBtnText = "Reset",
  applyBtnText = "Apply",
  triggerText,
  value,
  onChange,
  min,
  max,
  step = 1,
  badgeVariant = "default",
  badgeSuffix,
  inputSuffix,
  inputLeading,
}: RangeSliderPopoverProps) => {
  const [internalValue, setInternalValue] = useState<number[]>(value);
  const [open, setOpen] = useState(false);

  const handleReset = () => {
    setInternalValue([min, max]);
  };

  const handleApply = () => {
    onChange(internalValue);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className={inputStyles()}>
          <span className="text-subtle text-sm font-medium leading-none">{triggerText}:</span>
          {value && (
            <Badge variant={badgeVariant} className="ml-2">
              {value[0]} - {value[1]} {badgeSuffix}
            </Badge>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className="border-subtle shadow-dropdown bg-default z-50 mt-2 w-72 rounded-lg border px-4 pb-3 pt-4 font-(family-name:--font-sans)">
          <div className="mb-4">
            <RangeSlider
              min={min}
              max={max}
              step={step}
              value={internalValue}
              onValueChange={setInternalValue}
            />
          </div>
          <div className="mb-4 flex items-center justify-between gap-2">
            <TextField
              labelSrOnly
              name="start"
              type="number"
              min={min}
              max={internalValue[1]}
              value={internalValue[0]}
              onChange={(e) => {
                const newValue = parseInt(e.target.value);
                if (!isNaN(newValue) && newValue >= min && newValue <= internalValue[1]) {
                  setInternalValue([newValue, internalValue[1]]);
                }
              }}
              addOnLeading={inputLeading ? inputLeading : undefined}
              addOnSuffix={inputSuffix ? inputSuffix : undefined}
              containerClassName="w-full"
            />
            <TextField
              labelSrOnly
              name="end"
              type="number"
              min={internalValue[0]}
              max={max}
              value={internalValue[1]}
              onChange={(e) => {
                const newValue = parseInt(e.target.value);
                if (!isNaN(newValue) && newValue >= internalValue[0] && newValue <= max) {
                  setInternalValue([internalValue[0], newValue]);
                }
              }}
              addOnLeading={inputLeading ? inputLeading : undefined}
              addOnSuffix={inputSuffix ? inputSuffix : undefined}
              containerClassName="w-full"
            />
          </div>

          <div className="-mx-4">
            <hr className="border-subtle" />
            <div className="mt-3 flex items-center justify-end gap-2 px-4">
              <Button color="minimal" size="sm" onClick={handleReset}>
                {resetBtnText}
              </Button>
              <Button color="secondary" size="sm" onClick={handleApply}>
                {applyBtnText}
              </Button>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
