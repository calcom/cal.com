import classNames from "@calcom/ui/classNames";
import * as Popover from "@radix-ui/react-popover";
import { format } from "date-fns";
import { Button } from "../../button/Button";
import { Calendar } from "../date-range-picker/Calendar";

type Props = {
  date: Date;
  onDatesChange?: ((date: Date) => void) | undefined;
  className?: string;
  disabled?: boolean;
  minDate?: Date | null;
  label?: string;
};

const DatePicker = ({ minDate, disabled, date, onDatesChange, className, label }: Props) => {
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
    />
  );

  return (
    <div className={classNames("grid gap-2", className)}>
      {/* modal prop required for iOS compatibility when nested inside Dialog modals */}
      <Popover.Root modal>
        <Popover.Trigger asChild>
          <Button
            data-testid="pick-date"
            color="secondary"
            EndIcon="calendar"
            className={classNames("justify-between text-left font-normal", !date && "text-subtle")}>
            {label ?? (date ? <>{format(date, "LLL dd, y")}</> : <span>Pick a date</span>)}
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="bg-default text-emphasis z-50 w-auto rounded-md border p-0 outline-none"
            align="start"
            sideOffset={4}>
            {calender}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
};

export default DatePicker;
