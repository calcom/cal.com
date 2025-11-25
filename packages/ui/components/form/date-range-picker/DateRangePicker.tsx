"use client";

import * as Popover from "@radix-ui/react-popover";
import { format } from "date-fns";
import * as React from "react";

import classNames from "@calcom/ui/classNames";

import { Button } from "../../button";
import { Calendar } from "./Calendar";
import { calculateNewDateRange } from "./dateRangeLogic";

type DatePickerWithRangeProps = {
  dates: { startDate?: Date; endDate?: Date };
  onDatesChange: ({ startDate, endDate }: { startDate?: Date; endDate?: Date }) => void;
  disabled?: boolean;
  minDate?: Date | null;
  maxDate?: Date;
  withoutPopover?: boolean;
  "data-testid"?: string;
  strictlyBottom?: boolean;
  allowPastDates?: boolean;
};

export function DatePickerWithRange({
  className,
  dates,
  minDate,
  maxDate,
  onDatesChange,
  disabled,
  withoutPopover,
  "data-testid": testId,
  strictlyBottom,
  allowPastDates = false,
}: React.HTMLAttributes<HTMLDivElement> & DatePickerWithRangeProps) {
  function handleDayClick(date: Date) {
    const newDates = calculateNewDateRange({
      startDate: dates.startDate,
      endDate: dates.endDate,
      clickedDate: date,
    });
    onDatesChange(newDates);
  }

  const fromDate = allowPastDates && minDate === null ? undefined : minDate ?? new Date();

  const calendar = (
    <Calendar
      initialFocus
      fromDate={fromDate}
      toDate={maxDate}
      mode="range"
      defaultMonth={dates?.startDate}
      selected={{ from: dates?.startDate, to: dates?.endDate }}
      onDayClick={(day) => handleDayClick(day)}
      numberOfMonths={1}
      disabled={disabled}
      data-testid={testId}
    />
  );

  if (withoutPopover) {
    return calendar;
  }

  return (
    <div className={classNames("grid gap-2", className)}>
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button
            data-testid="date-range"
            color="secondary"
            EndIcon="calendar"
            className={classNames("justify-between text-left font-normal", !dates && "text-subtle")}>
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
          sideOffset={4}
          side={strictlyBottom ? "bottom" : undefined}
          avoidCollisions={!strictlyBottom}>
          {calendar}
        </Popover.Content>
      </Popover.Root>
    </div>
  );
}
