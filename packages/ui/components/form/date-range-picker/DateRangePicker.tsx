"use client";

import classNames from "@calcom/ui/classNames";
import * as Popover from "@radix-ui/react-popover";
import { format, isBefore, isSameDay } from "date-fns";
import { type HTMLAttributes, useMemo, useState } from "react";
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
  popoverModal?: boolean;
  popoverOpen?: boolean;
  onPopoverOpenChange?: (open: boolean) => void;
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
  popoverModal = true,
  popoverOpen,
  onPopoverOpenChange,
  "data-testid": testId,
  strictlyBottom,
  allowPastDates = false,
}: HTMLAttributes<HTMLDivElement> & DatePickerWithRangeProps) {
  const [hoveredDate, setHoveredDate] = useState<Date | undefined>(undefined);

  function handleDayClick(date: Date) {
    const newDates = calculateNewDateRange({
      startDate: dates.startDate,
      endDate: dates.endDate,
      clickedDate: date,
    });
    onDatesChange(newDates);
    setHoveredDate(undefined);
  }

  function handleDayMouseEnter(date: Date) {
    if (dates.startDate && !dates.endDate) {
      setHoveredDate(date);
    }
  }

  function handleDayMouseLeave() {
    setHoveredDate(undefined);
  }

  const fromDate = allowPastDates && minDate === null ? undefined : (minDate ?? new Date());

  const hoverRangeModifier = useMemo(() => {
    if (!dates.startDate || dates.endDate || !hoveredDate) {
      return undefined;
    }
    if (isSameDay(dates.startDate, hoveredDate)) {
      return undefined;
    }
    if (isBefore(hoveredDate, dates.startDate)) {
      return { from: hoveredDate, to: dates.startDate };
    }
    return { from: dates.startDate, to: hoveredDate };
  }, [dates.startDate, dates.endDate, hoveredDate]);

  const calendar = (
    <Calendar
      initialFocus
      fromDate={fromDate}
      toDate={maxDate}
      mode="range"
      defaultMonth={dates?.startDate}
      selected={{ from: dates?.startDate, to: dates?.endDate }}
      onDayClick={(day) => handleDayClick(day)}
      onDayMouseEnter={handleDayMouseEnter}
      onDayMouseLeave={handleDayMouseLeave}
      numberOfMonths={1}
      disabled={disabled}
      data-testid={testId}
      modifiers={hoverRangeModifier ? { hoverRange: hoverRangeModifier } : undefined}
      modifiersClassNames={hoverRangeModifier ? { hoverRange: "bg-emphasis" } : undefined}
    />
  );

  if (withoutPopover) {
    return calendar;
  }

  return (
    <div className={classNames("grid gap-2", className)}>
      {/* modal prop required for iOS compatibility when nested inside Dialog modals */}
      <Popover.Root modal={popoverModal} open={popoverOpen} onOpenChange={onPopoverOpenChange}>
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
        <Popover.Portal>
          <Popover.Content
            className="bg-default text-emphasis z-50 w-auto rounded-md border p-0 outline-none"
            align="start"
            sideOffset={4}
            side={strictlyBottom ? "bottom" : undefined}
            avoidCollisions={!strictlyBottom}
            onInteractOutside={(event) => {
              if (dates?.startDate && !dates?.endDate) {
                event.preventDefault();
              }
            }}>
            {calendar}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
