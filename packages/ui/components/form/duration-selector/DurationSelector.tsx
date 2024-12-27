import { useState } from "react";

import { classNames } from "@calcom/lib";
import { Button, TextField } from "@calcom/ui";

interface DurationSelectorProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
}

export function DurationSelector({ value, onChange, className }: DurationSelectorProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState<number>(value);

  const presets = [10, 15, 20, 30, 45, 60];

  const handlePresetClick = (preset: number) => {
    setShowCustom(false);
    onChange(preset);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    onChange(newValue);
    setCustomValue(newValue);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 10) {
      setCustomValue(val);
      onChange(val);
    }
  };

  return (
    <div className={classNames("space-y-4", className)}>
      {/* Preset Buttons */}
      <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
        {presets.map((preset) => (
          <Button
            key={preset}
            color={value === preset ? "primary" : "minimal"}
            className="w-full"
            onClick={() => handlePresetClick(preset)}>
            {preset} min
          </Button>
        ))}
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>10min</span>
          <span>1h</span>
          <span>2h</span>
        </div>
        <input
          type="range"
          min={10}
          max={120}
          step={5}
          value={value}
          onChange={handleSliderChange}
          className="h-4 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
        />
      </div>

      {/* Custom Duration Toggle */}
      <div className="flex items-center space-x-2">
        <Button color="minimal" size="sm" onClick={() => setShowCustom(!showCustom)} className="text-sm">
          {showCustom ? "Hide custom" : "Custom duration"}
        </Button>
        {showCustom && (
          <TextField
            type="number"
            min={10}
            value={customValue}
            onChange={handleCustomChange}
            className="w-20"
            addOnSuffix="min"
          />
        )}
      </div>
    </div>
  );
}
