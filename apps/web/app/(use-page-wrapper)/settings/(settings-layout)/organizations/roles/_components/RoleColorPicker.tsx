"use client";

import { useRef, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

export interface RoleColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export default function RoleColorPicker({ value, onChange, disabled }: RoleColorPickerProps) {
  const { t } = useLocale();
  const [, setCustomColor] = useState(value);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
    onChange(newColor);
  };

  const handleColorSquareClick = () => {
    if (!disabled) {
      colorInputRef.current?.click();
    }
  };

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={handleColorSquareClick}
        disabled={disabled}
        className="bg-default text-default border-default hover:bg-cal-muted hover:text-emphasis focus:bg-subtle focus-visible:shadow-outline-gray-focused shadow-outline-gray-rested enabled:hover:shadow-outline-gray-hover enabled:active:shadow-outline-gray-active flex h-8 w-8 items-center justify-center gap-2 rounded-[10px] border text-sm transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50">
        <div
          className="h-5 w-5 rounded border shadow-sm"
          style={{ backgroundColor: value }}
          aria-label={t("select_color")}
        />
      </button>
      <input
        ref={colorInputRef}
        type="color"
        value={value}
        onChange={handleCustomColorChange}
        className="sr-only"
        aria-hidden="true"
      />
    </div>
  );
}
