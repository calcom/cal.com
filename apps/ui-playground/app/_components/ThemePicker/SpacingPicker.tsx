"use client";

import { Label, RangeSlider } from "@calcom/ui";

interface SpacingPickerProps {
  value: Record<string, string>;
  onChange: (updates: Record<string, string>) => void;
}

export function SpacingPicker({ value, onChange }: SpacingPickerProps) {
  // Default base unit is 0.25rem (4px)
  const baseUnit = parseFloat(value["--cal-spacing-1"]?.replace("rem", "") || "0.25");

  const handleBaseUnitChange = (newBaseUnit: number) => {
    // Create all spacing variables based on the base unit
    const updates: Record<string, string> = {
      "--cal-spacing-0": "0px",
      "--cal-spacing-px": "1px",
      "--cal-spacing-0_5": `${newBaseUnit * 0.5}rem`,
      "--cal-spacing-1": `${newBaseUnit}rem`,
      "--cal-spacing-1_5": `${newBaseUnit * 1.5}rem`,
      "--cal-spacing-2": `${newBaseUnit * 2}rem`,
      "--cal-spacing-2_5": `${newBaseUnit * 2.5}rem`,
      "--cal-spacing-3": `${newBaseUnit * 3}rem`,
      "--cal-spacing-3_5": `${newBaseUnit * 3.5}rem`,
      "--cal-spacing-4": `${newBaseUnit * 4}rem`,
      "--cal-spacing-5": `${newBaseUnit * 5}rem`,
      "--cal-spacing-6": `${newBaseUnit * 6}rem`,
      "--cal-spacing-7": `${newBaseUnit * 7}rem`,
      "--cal-spacing-8": `${newBaseUnit * 8}rem`,
      "--cal-spacing-9": `${newBaseUnit * 9}rem`,
      "--cal-spacing-10": `${newBaseUnit * 10}rem`,
      "--cal-spacing-11": `${newBaseUnit * 11}rem`,
      "--cal-spacing-12": `${newBaseUnit * 12}rem`,
      "--cal-spacing-14": `${newBaseUnit * 14}rem`,
      "--cal-spacing-16": `${newBaseUnit * 16}rem`,
      "--cal-spacing-20": `${newBaseUnit * 20}rem`,
    };
    onChange(updates);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Base Unit (p-1 = {baseUnit}rem)</Label>
        <div className="flex items-center space-x-4">
          <div className="flex w-full max-w-[300px] flex-col space-y-2">
            <RangeSlider
              value={[baseUnit * 4]} // Convert to slider value (0.25rem = 1)
              min={2}
              max={8}
              step={0.5}
              onValueChange={(values) => handleBaseUnitChange(values[0] / 4)}
              aria-label="Base spacing unit"
            />
            <div className="flex justify-between text-sm">
              <span>{baseUnit}rem</span>
              <span>{baseUnit * 16}px</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="mt-4 space-y-2">
        <Label>Preview</Label>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col items-center">
            <div className="bg-subtle h-8 w-8" style={{ margin: value["--cal-spacing-1"] }} />
            <span className="text-xs">p-1</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-subtle h-8 w-8" style={{ margin: value["--cal-spacing-2"] }} />
            <span className="text-xs">p-2</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-subtle h-8 w-8" style={{ margin: value["--cal-spacing-4"] }} />
            <span className="text-xs">p-4</span>
          </div>
        </div>
      </div>
    </div>
  );
}
