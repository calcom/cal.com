"use client";

import * as Popover from "@radix-ui/react-popover";
import { format } from "date-fns";
import { useMemo } from "react";

import { Icon } from "@calid/features/ui/components/icon";
import { Button } from "@calid/features/ui/components/button";
import classNames from "@calcom/ui/classNames";
import { Spinner } from "@calcom/ui/components/icon";
import { Calendar } from "@calcom/ui/components/form";
import { inputStyles } from "@calid/features/ui/components/input/input";

type ExtendedDatePickerProps = {
  selectedDate: string | null;
  onChange: (date: string) => void;
  availableDates: string[];
  disabled?: boolean;
  loading?: boolean;
  variant?: "default" | "underline";
  underlineColor?: string;
  accentColor?: string;
  placeholder?: string;
};

const toDateString = (date: Date) => format(date, "yyyy-MM-dd");

export default function ExtendedDatePicker({
  selectedDate,
  onChange,
  availableDates,
  disabled,
  loading,
  variant = "default",
  underlineColor,
  accentColor,
  placeholder,
}: ExtendedDatePickerProps) {
  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);
  const selected = selectedDate ? new Date(selectedDate) : null;
  const isDisabled = disabled || availableDates.length === 0;

  const isUnderline = variant === "underline";
  const isUnderlineDisabled = isUnderline && isDisabled;
  const resolvedUnderlineColor = isUnderlineDisabled
    ? "var(--cal-border-muted)"
    : underlineColor ?? "var(--cal-secondary)";
  const underlineStyle = isUnderline ? { borderBottomColor: resolvedUnderlineColor } : undefined;

  const isDateDisabled = (date: Date) => !availableSet.has(toDateString(date));

  return (
    <div className="grid gap-2">
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button
            data-testid="calendar-date-picker"
            color="secondary"
            disabled={isDisabled}
            className={classNames(
              "w-full justify-between text-left font-normal",
              !selected && "text-subtle",
              isUnderline &&
                classNames(
                  inputStyles({ size: "md", variant: "underline" }),
                  "bg-transparent hover:bg-transparent active:bg-transparent px-0 rounded-none focus-visible:ring-0 focus-visible:shadow-none hover:shadow-none active:shadow-none",
                  isUnderlineDisabled && "disabled:opacity-100 disabled:text-default"
                )
            )}
            style={underlineStyle}
          >
            <span className="truncate">
              {selected ? format(selected, "LLL dd, y") : (
                <span className="text-sm text-subtle">{placeholder || "Pick a date"}</span>
              )}
            </span>
            <span className="ml-auto flex items-center">
              {loading ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <Icon name="calendar" className="h-4 w-4" />
              )}
            </span>
          </Button>
        </Popover.Trigger>
        <Popover.Content
          className="bg-default text-emphasis z-50 w-auto rounded-md border p-0 outline-none"
          align="start"
          sideOffset={4}
        >
          <Calendar
            initialFocus
            fromDate={new Date()}
            mode="single"
            defaultMonth={selected ?? new Date()}
            selected={selected ?? undefined}
            onDayClick={(day) => onChange(toDateString(day))}
            numberOfMonths={1}
            disabled={isDateDisabled}
            accentColor={accentColor}
          />
        </Popover.Content>
      </Popover.Root>
    </div>
  );
}
