import "react-calendar/dist/Calendar.css";
import "react-date-picker/dist/DatePicker.css";
import PrimitiveDatePicker from "react-date-picker/dist/entry.nostyle";

import classNames from "@calcom/lib/classNames";

import { Icon } from "../../..";

type Props = {
  date: Date;
  onDatesChange?: ((date: Date) => void) | undefined;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
};

const DatePicker = ({ minDate, disabled, date, onDatesChange, className }: Props) => {
  return (
    <PrimitiveDatePicker
      className={classNames(
        "focus:ring-primary-500 focus:border-primary-500 border-default rounded-md border p-1 pl-2 shadow-sm sm:text-sm",
        className
      )}
      calendarClassName="rounded-md"
      clearIcon={null}
      calendarIcon={<Icon name="calendar" className="text-subtle h-5 w-5 rounded-md" />}
      value={date}
      disabled={disabled}
      onChange={onDatesChange}
    />
  );
};

export default DatePicker;
