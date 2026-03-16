import { Button } from "@calid/features/ui/components/button";
import * as Popover from "@radix-ui/react-popover";
import { format } from "date-fns";
import type { CSSProperties } from "react";

import classNames from "@calcom/ui/classNames";

import { Calendar } from "../date-range-picker/Calendar";

type Props = {
  date: Date;
  onDatesChange?: ((date: Date) => void) | undefined;
  className?: string;
  buttonClassName?: string;
  buttonStyle?: CSSProperties;
  disabled?: boolean;
  minDate?: Date;
  placeholder?: string;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  variant?: "default" | "compact";
  accentColor?: string;
};

const DatePicker = ({
  minDate,
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
}: Props) => {
  function handleDayClick(newDate: Date) {
    onDatesChange?.(newDate ?? new Date());
  }
  const fromDate = minDate ?? new Date();
  const calender = (
      <Calendar
        initialFocus
        fromDate={minDate === null ? undefined : fromDate}
        // toDate={maxDate}
        mode="single"
        defaultMonth={date}
        selected={date}
        onDayClick={(day) => handleDayClick(day)}
        numberOfMonths={1}
        disabled={disabled}
        variant={variant}
        accentColor={accentColor}
      />
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
          sideOffset={4}>
          {calender}
        </Popover.Content>
      </Popover.Root>
    </div>
  );
};

export default DatePicker;
