import throttle from "lodash.throttle";
import React, { useEffect, useState } from "react";
import { DateRangePicker as PrimitiveDateRangePicker, OrientationShape, toMomentObject } from "react-dates";
import "react-dates/initialize";
import "react-dates/lib/css/_datepicker.css";

type Props = {
  startDate: string;
  endDate: string;
  onDatesChange?: ((arg: { startDate: Date; endDate: Date }) => void) | undefined;
};

export const DateRangePicker = ({ startDate, endDate, onDatesChange }: Props) => {
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });
  const [DATE_PICKER_ORIENTATION, setDatePickerOrientation] = useState<OrientationShape>("horizontal");
  const [focusedInput, setFocusedInput] = useState(null);

  useEffect(() => {
    if (contentSize.width < 500) {
      setDatePickerOrientation("vertical");
    } else {
      setDatePickerOrientation("horizontal");
    }
  }, [contentSize]);

  const handleResizeEvent = () => {
    const elementWidth = parseFloat(getComputedStyle(document.body).width);
    const elementHeight = parseFloat(getComputedStyle(document.body).height);

    setContentSize({
      width: elementWidth,
      height: elementHeight,
    });
  };

  const throttledHandleResizeEvent = throttle(handleResizeEvent, 100);

  useEffect(() => {
    handleResizeEvent();

    window.addEventListener("resize", throttledHandleResizeEvent);

    return () => {
      window.removeEventListener("resize", throttledHandleResizeEvent);
    };
  }, []);

  return (
    <PrimitiveDateRangePicker
      orientation={DATE_PICKER_ORIENTATION}
      startDate={toMomentObject(startDate)}
      startDateId="your_unique_start_date_id"
      endDate={toMomentObject(endDate)}
      endDateId="your_unique_end_date_id"
      onDatesChange={({ startDate, endDate }) => {
        onDatesChange({ startDate: startDate.toDate(), endDate: endDate.toDate() });
      }}
      focusedInput={focusedInput}
      onFocusChange={(focusedInput) => {
        setFocusedInput(focusedInput);
      }}
    />
  );
};
