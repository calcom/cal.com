// @see: https://github.com/wojtekmaj/react-daterange-picker/issues/91
import "@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css";
import PrimitiveDateRangePicker from "@wojtekmaj/react-daterange-picker/dist/entry.nostyle";
import React from "react";
import "react-calendar/dist/Calendar.css";

import { Icon } from "@calcom/ui/Icon";

type Props = {
  startDate: Date;
  endDate: Date;
  onDatesChange?: ((arg: { startDate: Date; endDate: Date }) => void) | undefined;
};

export const DateRangePicker = ({ startDate, endDate, onDatesChange }: Props) => {
  return (
    <PrimitiveDateRangePicker
      className="rounded-sm border-gray-300 text-sm"
      clearIcon={null}
      calendarIcon={<Icon.Calendar className="h-5 w-5 text-gray-500" />}
      rangeDivider={<Icon.ArrowRight className="h-4 w-4 text-gray-400 ltr:mr-2 rtl:ml-2" />}
      value={[startDate, endDate]}
      onChange={([startDate, endDate]) => {
        if (typeof onDatesChange === "function") onDatesChange({ startDate, endDate });
      }}
    />
  );
};
