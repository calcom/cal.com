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
      className="focus:border-primary-500 focus:ring-primary-500 rounded-sm border-gray-300 sm:text-sm"
      clearIcon={null}
      calendarIcon={<CalendarIcon className="h-5 w-5 text-gray-500" />}
      rangeDivider={<ArrowRightIcon className="h-4 w-4 text-gray-400 ltr:mr-2 rtl:ml-2" />}
      value={[startDate, endDate]}
      onChange={([startDate, endDate]) => {
        if (typeof onDatesChange === "function") onDatesChange({ startDate, endDate });
      }}
    />
  );
};
