"use client";

import * as Popover from "@radix-ui/react-popover";
import { format } from "date-fns";
import { useMemo } from "react";

import { Button } from "@calid/features/ui/components/button";
import classNames from "@calcom/ui/classNames";
import { Calendar } from "@calcom/ui/components/form";

type ExtendedDatePickerProps = {
  selectedDate: string | null;
  onChange: (date: string) => void;
  availableDates: string[];
  disabled?: boolean;
  accentColor?: string;
  placeholder?: string;
};

const toDateString = (date: Date) => format(date, "yyyy-MM-dd");

export default function ExtendedDatePicker({
  selectedDate,
  onChange,
  availableDates,
  disabled,
  accentColor,
  placeholder,
}: ExtendedDatePickerProps) {
  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);
  const selected = selectedDate ? new Date(selectedDate) : null;
  const isDisabled = disabled || availableDates.length === 0;

  const isDateDisabled = (date: Date) => !availableSet.has(toDateString(date));

  return (
    <div className="grid gap-2">
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button
            data-testid="calendar-date-picker"
            color="secondary"
            EndIcon="calendar"
            disabled={isDisabled}
            className={classNames(
              "w-full justify-between text-left font-normal",
              !selected && "text-subtle"
            )}
          >
            {selected ? (
              <>{format(selected, "LLL dd, y")}</>
            ) : (
              <span className="text-sm text-subtle">{placeholder || "Pick a date"}</span>
            )}
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
