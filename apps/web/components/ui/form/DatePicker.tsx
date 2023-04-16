import React from "react";
import "react-calendar/dist/Calendar.css";
import "react-date-picker/dist/DatePicker.css";
import PrimitiveDatePicker from "react-date-picker/dist/entry.nostyle";

import { Calendar } from "@calcom/ui/components/icon";

import classNames from "@lib/classNames";

type Props = {
  date: Date;
  onDatesChange?: ((date: Date) => void) | undefined;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
};

export const DatePicker = ({ minDate, disabled, date, onDatesChange, className }: Props) => {
  return (
    <PrimitiveDatePicker
      className={classNames(
        "focus:ring-primary-500 focus:border-primary-500 border-default rounded-sm border p-1 pl-2 text-sm",
        className
      )}
      clearIcon={null}
      calendarIcon={<Calendar className="text-subtle h-5 w-5" />}
      value={date}
      minDate={minDate}
      disabled={disabled}
      onChange={onDatesChange}
    />
  );
};
