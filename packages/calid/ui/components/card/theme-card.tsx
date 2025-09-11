"use client";

import { cn } from "@calid/features/lib/cn";
import * as React from "react";

interface ThemeCardProps {
  variant: "light" | "dark" | "system";
  value: "light" | "dark" | "system";
  label: string;
  description?: string;
  defaultChecked?: boolean;
  register: any;
  currentValue?: string | null;
  fieldName?: string;
  className?: string;
}

export default function ThemeCard({
  variant,
  label,
  description,
  value,
  defaultChecked,
  register,
  currentValue,
  fieldName = "theme",
  className,
}: ThemeCardProps) {
  const isSelected = currentValue === value || (currentValue === null && defaultChecked);

  const getThemeIcon = () => {
    switch (variant) {
      case "light":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-yellow-100">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
              />
            </svg>
          </div>
        );
      case "dark":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-black text-white">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          </div>
        );
      case "system":
        return (
          <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full border">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z"
              />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <label
      className={cn(
        "relative flex cursor-pointer flex-col rounded-lg border p-4 transition-all hover:shadow-md",
        isSelected ? "bg-blue-50 shadow-lg ring-1 ring-blue-200" : "border-gray-200 hover:border-gray-300",
        className
      )}
      htmlFor={`${fieldName}-${variant}`}
      data-testid={`${fieldName}-${variant}`}>
      <input
        id={`${fieldName}-${variant}`}
        type="radio"
        value={value}
        className="sr-only"
        {...register(fieldName)}
      />

      <div className="flex items-start justify-between rounded-lg border border-transparent p-2 transition-all">
        <div className="flex items-center space-x-3">
          {getThemeIcon()}
          <div>
            <h3 className="text-sm font-medium text-gray-900">{label}</h3>
            {description && <p className="text-xs text-gray-500">{description}</p>}
          </div>
        </div>

        <div
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
            isSelected ? "border-active" : "border-border"
          )}>
          <div
            className={cn(
              "bg-cal-active h-2.5 w-2.5 rounded-full transition-opacity",
              isSelected ? "opacity-100" : "opacity-0"
            )}
          />
        </div>
      </div>

      <div className={cn("border-border mt-4 rounded-md border p-3 transition-colors")}>
        <img
          aria-hidden="true"
          src={`/theme-${variant}.svg`}
          alt={`Theme ${variant} preview`}
          className="border-subtle h-24 w-full rounded border object-cover"
        />
      </div>
    </label>
  );
}
