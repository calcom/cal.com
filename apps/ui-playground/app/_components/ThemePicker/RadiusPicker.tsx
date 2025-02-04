"use client";

import { Label, RangeSlider } from "@calcom/ui";

interface RadiusPickerProps {
  value: Record<string, string>;
  onChange: (updates: Record<string, string>) => void;
}

export function RadiusPicker({ value, onChange }: RadiusPickerProps) {
  // Default base unit is 0.25rem (4px)
  const baseUnit = parseFloat(value["--cal-radius"]?.replace("rem", "") || "0.25");

  const handleBaseUnitChange = (newBaseUnit: number) => {
    // Create all radius variables based on the base unit
    const updates: Record<string, string> = {
      "--cal-radius-none": "0px",
      "--cal-radius-sm": `${newBaseUnit * 0.5}rem`,
      "--cal-radius": `${newBaseUnit}rem`,
      "--cal-radius-md": `${newBaseUnit * 1.5}rem`,
      "--cal-radius-lg": `${newBaseUnit * 2}rem`,
      "--cal-radius-xl": `${newBaseUnit * 3}rem`,
      "--cal-radius-2xl": `${newBaseUnit * 4}rem`,
      "--cal-radius-3xl": `${newBaseUnit * 6}rem`,
      "--cal-radius-full": "9999px",
    };
    onChange(updates);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Base Radius (rounded = {baseUnit}rem)</Label>
        <div className="flex items-center space-x-4">
          <div className="flex w-full max-w-[300px] flex-col space-y-2">
            <RangeSlider
              value={[baseUnit * 4]} // Convert to slider value (0.25rem = 1)
              min={0}
              max={8}
              step={0.5}
              onValueChange={(values) => handleBaseUnitChange(values[0] / 4)}
              aria-label="Base border radius"
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
            <div className="bg-subtle h-8 w-8" style={{ borderRadius: value["--cal-radius-sm"] }} />
            <span className="text-xs">rounded-sm</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-subtle h-8 w-8" style={{ borderRadius: value["--cal-radius"] }} />
            <span className="text-xs">rounded</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-subtle h-8 w-8" style={{ borderRadius: value["--cal-radius-lg"] }} />
            <span className="text-xs">rounded-lg</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-subtle h-8 w-8" style={{ borderRadius: value["--cal-radius-full"] }} />
            <span className="text-xs">rounded-full</span>
          </div>
        </div>
      </div>
    </div>
  );
}
