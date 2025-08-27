"use client";

import { cn } from "@calid/features/lib/cn";
import { Icon } from "@calid/features/ui";
import React, { useState, useRef, useEffect } from "react";

interface CustomSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
    icon?: string;
    type?: "header" | "option";
  }>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder = "Select option",
  className,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={cn("relative", className)} ref={selectRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="border-border hover:border-border/60 focus:ring-ring bg-background flex h-10 w-full items-center justify-between rounded-lg border p-4 transition-colors focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50">
        <div className="flex items-center">
          {selectedOption?.icon && (
            <div className="bg-primary mr-3 flex h-7 w-7 items-center justify-center rounded">
              <span className="text-primary-foreground -space-x-1 text-xs">{selectedOption.icon}</span>
            </div>
          )}
          <span className="text-sm text-gray-600">{selectedOption?.label || placeholder}</span>
        </div>
        {isOpen ? (
          <Icon name="chevron-up" className="text-muted-foreground h-4 w-4 transition-transform" />
        ) : (
          <Icon name="chevron-down" className="text-muted-foreground h-4 w-4 transition-transform" />
        )}
      </button>

      {isOpen && (
        <div className="bg-popover border-border animate-in fade-in-0 zoom-in-95 absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border shadow-lg duration-200">
          {options.map((option) => (
            <div key={option.value}>
              {option.type === "header" ? (
                <div className="text-muted-foreground bg-default px-4 py-2 text-xs font-semibold uppercase tracking-wide">
                  {option.label}
                </div>
              ) : (
                <button
                  onClick={() => {
                    onValueChange(option.value);
                    setIsOpen(false);
                  }}
                  className="hover:bg-muted bg-default flex w-full items-center px-4 py-3 text-left transition-colors">
                  {option.icon && <span className="mr-3 text-sm">{option.icon}</span>}
                  <span className="text-sm">{option.label}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
