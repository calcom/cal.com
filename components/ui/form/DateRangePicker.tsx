// @see: https://github.com/wojtekmaj/react-daterange-picker/issues/91
import { ArrowRightIcon, CalendarIcon } from "@heroicons/react/solid";
import "@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css";
import PrimitiveDateRangePicker from "@wojtekmaj/react-daterange-picker/dist/entry.nostyle";
import React from "react";
import "react-calendar/dist/Calendar.css";

type Props = {
  startDate: Date;
  endDate: Date;
  onDatesChange?: ((arg: { startDate: Date; endDate: Date }) => void) | undefined;
};

export const DateRangePicker = ({ startDate, endDate, onDatesChange }: Props) => {
  return (
    <PrimitiveDateRangePicker
      className="border-gray-300 rounded-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:text-gray-300"
      clearIcon={null}
      calendarIcon={<CalendarIcon className="w-5 h-5 text-gray-500" />}
      rangeDivider={<ArrowRightIcon className="w-4 h-4 mr-2 text-gray-400" />}
      value={[startDate, endDate]}
      onChange={([startDate, endDate]) => {
        onDatesChange({ startDate, endDate });
      }}
    />
  );
};
