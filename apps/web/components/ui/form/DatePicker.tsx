import { CalendarIcon } from "@heroicons/react/solid";
import React from "react";
import "react-calendar/dist/Calendar.css";
import "react-date-picker/dist/DatePicker.css";
import PrimitiveDatePicker from "react-date-picker/dist/entry.nostyle";

import classNames from "@lib/classNames";

type Props = {
  date: Date;
  onDatesChange?: ((date: Date) => void) | undefined;
  className?: string;
};

export const DatePicker = ({ date, onDatesChange, className }: Props) => {
  return (
    <PrimitiveDatePicker
      className={classNames(
        "focus:border-primary-500 focus:ring-primary-500 rounded-sm border border-gray-300 p-1 pl-2 shadow-sm sm:text-sm",
        className
      )}
      clearIcon={null}
      calendarIcon={<CalendarIcon className="h-5 w-5 text-gray-500" />}
      value={date}
      onChange={onDatesChange}
    />
  );
};
