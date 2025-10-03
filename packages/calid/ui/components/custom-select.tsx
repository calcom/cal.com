"use client";

import { cn } from "@calid/features/lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@calid/features/ui/components/dropdown-menu";
import { Icon } from "@calid/features/ui/components/icon";
import React, { useState } from "react";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <button
          disabled={disabled}
          className={cn(
            "hover:border-emphasis border-default text-default focus:shadow-outline-gray-focused flex h-8 w-full min-w-0 items-center justify-between rounded-md border px-3 py-1 text-sm font-normal transition-colors",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}>
          <span className="flex-1 truncate text-left">{selectedOption?.label || placeholder}</span>
          <Icon
            name="chevron-down"
            className={`ml-auto h-4 w-4 transition-transform ${menuOpen ? "rotate-180" : ""}`}
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="max-h-60 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto"
        align="start">
        {options.map((option) => (
          <div key={option.value}>
            {option.type === "header" ? (
              <DropdownMenuLabel className="text-muted text-xs font-semibold uppercase tracking-wide">
                {option.label}
              </DropdownMenuLabel>
            ) : (
              <DropdownMenuItem
                onClick={() => onValueChange(option.value)}
                className="cursor-pointer"
                StartIcon={option.icon as any}>
                {option.label}
              </DropdownMenuItem>
            )}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
