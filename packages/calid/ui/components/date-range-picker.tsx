import { cn } from "@calid/features/lib/cn";
import { addDays, format } from "date-fns";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import { Icon } from "@calcom/ui/components/icon";

import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface DatePickerWithRangeProps {
  className?: string;
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
}

export function DatePickerWithRange({ className, value, onChange }: DatePickerWithRangeProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(
    value || {
      from: new Date(2022, 0, 20),
      to: addDays(new Date(2022, 0, 20), 20),
    }
  );

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    onChange?.(newDate);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn("w-[300px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
            <Icon name="calendar" className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
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
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
