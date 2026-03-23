import { Button } from "@calid/features/ui/components/button";
import * as Popover from "@radix-ui/react-popover";
import { format } from "date-fns";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

import classNames from "@calcom/ui/classNames";

import { Calendar } from "../date-range-picker/Calendar";
import { Icon } from "../../icon";

type Props = {
  date: Date;
  onDatesChange?: ((date: Date) => void) | undefined;
  className?: string;
  buttonClassName?: string;
  buttonStyle?: CSSProperties;
  disabled?: boolean;
  minDate?: Date | null;
  maxDate?: Date;
  placeholder?: string;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  variant?: "default" | "compact";
  accentColor?: string;
  popoverSide?: "top" | "right" | "bottom" | "left";
};

const DatePicker = ({
  minDate,
  maxDate,
  disabled,
  date,
  onDatesChange,
  className,
  buttonClassName,
  buttonStyle,
  placeholder,
  onBlur,
  variant = "default",
  accentColor,
  popoverSide,
}: Props) => {
  const isValidDate = (value: unknown): value is Date =>
    value instanceof Date && !Number.isNaN(value.getTime());

  function handleDayClick(newDate: Date) {
    onDatesChange?.(newDate ?? new Date());
  }

  const getMonthStart = (value: Date) => new Date(value.getFullYear(), value.getMonth(), 1);
  const getLastDateOfMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const clampDateWithinBounds = (value: Date) => {
    if (effectiveMinDate && value < effectiveMinDate) return new Date(effectiveMinDate);
    if (maxDate && value > maxDate) return new Date(maxDate);
    return value;
  };
  const getNextSelectedDateForMonth = (targetMonthStart: Date) => {
    const anchorDate = isValidDate(date)
      ? date
      : new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1);
    const targetYear = targetMonthStart.getFullYear();
    const targetMonth = targetMonthStart.getMonth();
    const targetDay = Math.min(anchorDate.getDate(), getLastDateOfMonth(targetYear, targetMonth));
    const nextDate = new Date(targetYear, targetMonth, targetDay);
    return clampDateWithinBounds(nextDate);
  };

  const fromDate = minDate ?? new Date();
  const effectiveMinDate = minDate === null ? undefined : fromDate;
  const minNavigableMonth = effectiveMinDate ? getMonthStart(effectiveMinDate) : undefined;
  const maxNavigableMonth = maxDate ? getMonthStart(maxDate) : undefined;

  const [displayMonth, setDisplayMonth] = useState<Date>(() =>
    getMonthStart(date ?? maxDate ?? effectiveMinDate ?? new Date())
  );

  useEffect(() => {
    if (date) {
      setDisplayMonth(getMonthStart(date));
    }
  }, [date]);

  const canShiftYear = (years: number) => {
    const candidate = getMonthStart(new Date(displayMonth.getFullYear() + years, displayMonth.getMonth(), 1));
    if (minNavigableMonth && candidate < minNavigableMonth) return false;
    if (maxNavigableMonth && candidate > maxNavigableMonth) return false;
    return true;
  };

  const canShiftMonth = (months: number) => {
    const candidate = getMonthStart(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + months, 1));
    if (minNavigableMonth && candidate < minNavigableMonth) return false;
    if (maxNavigableMonth && candidate > maxNavigableMonth) return false;
    return true;
  };

  const shiftYear = (years: number) => {
    setDisplayMonth((prevMonth) => {
      const nextMonthStart = getMonthStart(new Date(prevMonth.getFullYear() + years, prevMonth.getMonth(), 1));
      onDatesChange?.(getNextSelectedDateForMonth(nextMonthStart));
      return nextMonthStart;
    });
  };

  const shiftMonth = (months: number) => {
    setDisplayMonth((prevMonth) => {
      const nextMonthStart = getMonthStart(new Date(prevMonth.getFullYear(), prevMonth.getMonth() + months, 1));
      onDatesChange?.(getNextSelectedDateForMonth(nextMonthStart));
      return nextMonthStart;
    });
  };

  const calender = (
    <div>
      <div className="border-subtle mb-1 flex items-center justify-between border-b px-3 py-2">
        <div className="border-subtle bg-muted/40 inline-flex items-center gap-1 rounded-md border px-1 py-0.5">
          <button
            type="button"
            data-testid="datepicker-prev-year"
            aria-label="Previous year"
            disabled={!canShiftYear(-1)}
            onClick={() => shiftYear(-1)}
            className="hover:bg-subtle disabled:text-muted inline-flex h-6 w-6 items-center justify-center rounded transition-colors disabled:cursor-not-allowed">
            <Icon name="chevron-left" className="h-3.5 w-3.5" />
          </button>
          <span data-testid="datepicker-current-year" className="text-emphasis min-w-[3rem] text-center text-xs font-semibold">
            {displayMonth.getFullYear()}
          </span>
          <button
            type="button"
            data-testid="datepicker-next-year"
            aria-label="Next year"
            disabled={!canShiftYear(1)}
            onClick={() => shiftYear(1)}
            className="hover:bg-subtle disabled:text-muted inline-flex h-6 w-6 items-center justify-center rounded transition-colors disabled:cursor-not-allowed">
            <Icon name="chevron-right" className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="border-subtle bg-muted/40 inline-flex items-center gap-1 rounded-md border px-1 py-0.5">
          <button
            type="button"
            data-testid="datepicker-prev-month"
            aria-label="Previous month"
            disabled={!canShiftMonth(-1)}
            onClick={() => shiftMonth(-1)}
            className="hover:bg-subtle disabled:text-muted inline-flex h-6 w-6 items-center justify-center rounded transition-colors disabled:cursor-not-allowed">
            <Icon name="chevron-left" className="h-3.5 w-3.5" />
          </button>
          <span data-testid="datepicker-current-month" className="text-emphasis min-w-[5.5rem] text-center text-xs font-semibold">
            {format(displayMonth, "MMMM")}
          </span>
          <button
            type="button"
            data-testid="datepicker-next-month"
            aria-label="Next month"
            disabled={!canShiftMonth(1)}
            onClick={() => shiftMonth(1)}
            className="hover:bg-subtle disabled:text-muted inline-flex h-6 w-6 items-center justify-center rounded transition-colors disabled:cursor-not-allowed">
            <Icon name="chevron-right" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <Calendar
        initialFocus
        fromDate={minDate === null ? undefined : fromDate}
        toDate={maxDate}
        month={displayMonth}
        onMonthChange={(nextMonth) => {
          const nextMonthStart = getMonthStart(nextMonth);
          setDisplayMonth(nextMonthStart);
          onDatesChange?.(getNextSelectedDateForMonth(nextMonthStart));
        }}
        mode="single"
        defaultMonth={date}
        selected={date}
        onDayClick={(day) => handleDayClick(day)}
        numberOfMonths={1}
        disabled={disabled}
        classNames={{ caption: "hidden", nav: "hidden" }}
        variant={variant}
        accentColor={accentColor}
      />
    </div>
  );

  return (
    <div className={classNames("grid gap-2", className)}>
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button
            data-testid="pick-date"
            color="secondary"
            EndIcon="calendar"
            disabled={disabled}
            onBlur={onBlur}
            style={buttonStyle}
            className={classNames(
              "justify-between text-left font-normal",
              !date && "text-subtle",
              buttonClassName
            )}>
            {date ? (
              <>{format(date, "LLL dd, y")}</>
            ) : (
              <span className="text-sm text-subtle">{placeholder || "Pick a date"}</span>
            )}
          </Button>
        </Popover.Trigger>
        <Popover.Content
          className="bg-default text-emphasis z-50 w-auto rounded-md border p-0 outline-none"
          align="start"
          side={popoverSide}
          sideOffset={4}>
          {calender}
        </Popover.Content>
      </Popover.Root>
    </div>
  );
};

export default DatePicker;
