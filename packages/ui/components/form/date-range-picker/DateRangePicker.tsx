"use client";

import * as Popover from "@radix-ui/react-popover";
import { format } from "date-fns";
import * as React from "react";

import classNames from "@calcom/ui/classNames";

import { Button } from "../../button";
import { Calendar } from "./Calendar";

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
    if (allowPastDates) {
      // for Out of Office (past dates allowed)
      if (dates?.endDate) {
        onDatesChange({ startDate: date, endDate: undefined });
      } else {
        const startDate = dates.startDate ? (date < dates.startDate ? date : dates.startDate) : date;
        const endDate = dates.startDate ? (date < dates.startDate ? dates.startDate : date) : undefined;
        onDatesChange({ startDate, endDate });
      }
    } else {
      // for Limit Future Booking (no past dates)
      if (!dates.startDate || !dates.endDate) {
        onDatesChange({ startDate: date, endDate: date });
      } else {
        const startTime = dates.startDate.getTime();
        const endTime = dates.endDate.getTime();
        const clickedTime = date.getTime();

        if (clickedTime === startTime || clickedTime === endTime) {
          onDatesChange({ startDate: date, endDate: date });
        } else if (clickedTime < startTime) {
          onDatesChange({ startDate: date, endDate: dates.endDate });
        } else if (clickedTime > endTime) {
          onDatesChange({ startDate: dates.startDate, endDate: date });
        } else {
          const startDiff = clickedTime - startTime;
          const endDiff = endTime - clickedTime;
          if (startDiff < endDiff) {
            onDatesChange({ startDate: date, endDate: dates.endDate });
          } else {
            onDatesChange({ startDate: dates.startDate, endDate: date });
          }
        }
      }
    }
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
