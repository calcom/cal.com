"use client";

import * as Popover from "@radix-ui/react-popover";
import { format } from "date-fns";
import * as React from "react";

import { classNames as cn } from "@calcom/lib";

import { Button } from "../../button";
import { Calendar } from "./Calendar";

type DatePickerWithRangeProps = {
  dates: { startDate: Date; endDate?: Date };
  onDatesChange: ({ startDate, endDate }: { startDate?: Date; endDate?: Date }) => void;
  disabled?: boolean;
  minDate?: Date | null;
  maxDate?: Date;
};

export function DatePickerWithRange({
  className,
  dates,
  minDate,
  maxDate,
  onDatesChange,
  disabled,
}: React.HTMLAttributes<HTMLDivElement> & DatePickerWithRangeProps) {
  function handleDayClick(date: Date) {
    if (dates?.endDate) {
      onDatesChange({ startDate: date, endDate: undefined });
    } else {
      const startDate = date < dates.startDate ? date : dates.startDate;
      const endDate = date < dates.startDate ? dates.startDate : date;
      onDatesChange({ startDate, endDate });
    }
  }
  const fromDate = minDate ?? new Date();

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button
            data-testid="date-range"
            color="secondary"
            EndIcon="calendar"
            className={cn("justify-between text-left font-normal", !dates && "text-subtle")}>
            {dates?.startDate ? (
              dates?.endDate ? (
                <>
                  {format(dates.startDate, "LLL dd, y")} - {format(dates.endDate, "LLL dd, y")}
                </>
              ) : (
                <>{format(dates.startDate, "LLL dd, y")} - End</>
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </Popover.Trigger>
        <Popover.Content
          className="bg-default text-emphasis z-50 w-auto rounded-md border p-0 outline-none"
          align="start"
          sideOffset={4}>
          <Calendar
            initialFocus
            //When explicitly null, we want past dates to be shown as well, otherwise show only dates passed or from current date
            fromDate={minDate === null ? undefined : fromDate}
            toDate={maxDate}
            mode="range"
            defaultMonth={dates?.startDate}
            selected={{ from: dates?.startDate, to: dates?.endDate }}
            onDayClick={(day) => handleDayClick(day)}
            numberOfMonths={1}
            disabled={disabled}
          />
        </Popover.Content>
      </Popover.Root>
    </div>
  );
}
