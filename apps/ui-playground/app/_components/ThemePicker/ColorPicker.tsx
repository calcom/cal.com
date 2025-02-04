"use client";

import { Label } from "@calcom/ui";

interface ColorPickerProps {
  value: Record<string, string>;
  onChange: (updates: Record<string, string>) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const handleColorChange = (variable: string, color: string) => {
    onChange({ [variable]: color });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Standard Colors */}
        <div>
          <Label>Background</Label>
          <input
            type="color"
            value={value["--cal-bg"] || "#FFFFFF"}
            onChange={(e) => handleColorChange("--cal-bg", e.target.value)}
            className="h-8 w-full cursor-pointer"
          />
        </div>
        <div>
          <Label>Text</Label>
          <input
            type="color"
            value={value["--cal-text"] || "#374151"}
            onChange={(e) => handleColorChange("--cal-text", e.target.value)}
            className="h-8 w-full cursor-pointer"
          />
        </div>
      </div>

      {/* Semantic Colors */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Success</Label>
          <input
            type="color"
            value={value["--cal-bg-semantic-success"] || "#10B981"}
            onChange={(e) => handleColorChange("--cal-bg-semantic-success", e.target.value)}
            className="h-8 w-full cursor-pointer"
          />
        </div>
        <div>
          <Label>Error</Label>
          <input
            type="color"
            value={value["--cal-bg-semantic-error"] || "#EF4444"}
            onChange={(e) => handleColorChange("--cal-bg-semantic-error", e.target.value)}
            className="h-8 w-full cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
