"use client";

import { format } from "date-fns";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import { classNames as cn } from "@calcom/lib";

import { Button } from "../../button";
import { Popover, PopoverContent, PopoverTrigger } from "../../popover";
import { Calendar } from "./Calendar";

type DatePickerWithRangeProps = {
  dates: { startDate: Date; endDate?: Date };
  onDatesChange: ({ startDate, endDate }: { startDate?: Date; endDate?: Date }) => void;
  disabled?: boolean;
};

export function DatePickerWithRange({
  className,
  dates,
  onDatesChange,
  disabled,
}: React.HTMLAttributes<HTMLDivElement> & DatePickerWithRangeProps) {
  // Even though this is uncontrolled we need to do a bit of logic to improve the UX when selecting dates
  function _onDatesChange(onChangeValues: DateRange | undefined) {
    if (onChangeValues?.from && !onChangeValues?.to) {
      onDatesChange({ startDate: onChangeValues.from, endDate: onChangeValues.from });
    } else {
      onDatesChange({ startDate: onChangeValues?.from, endDate: onChangeValues?.to });
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            color="secondary"
            EndIcon="calendar"
            className={cn("justify-between text-left font-normal", !dates && "text-subtle")}>
            {dates?.startDate ? (
              dates?.endDate ? (
                <>
                  {format(dates.startDate, "LLL dd, y")} - {format(dates.endDate, "LLL dd, y")}
                </>
              ) : (
                format(dates.startDate, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dates?.startDate}
            selected={{ from: dates?.startDate, to: dates?.endDate }}
            onSelect={(values) => _onDatesChange(values)}
            numberOfMonths={1}
            disabled={disabled}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
