import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/solid";
import { useState } from "react";

import classNames from "@calcom/lib/classNames";
import { yyyymmdd, daysInMonth } from "@calcom/lib/date-fns";
import { weekdayNames } from "@calcom/lib/weekday";

export type DatePickerProps = {
  // which day of the week to render the calendar. Usually Sunday (=0) or Monday (=1) - default: Sunday
  weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  // Fires whenever a selected date is changed.
  onChange: (date: Date) => void;
  // which date is currently selected (not tracked from here)
  selected?: Date;
  // defaults to current date.
  minDate?: Date;
  // Furthest date selectable in the future, default = UNLIMITED
  maxDate?: Date;
  // locale, any IETF language tag, e.g. "hu-HU" - defaults to Browser settings
  locale: string;
  // Defaults to [], which dates are not bookable. Array of strings like: ["2022-04-23", "2022-04-24"]
  excludedDates?: string[];
  // allows adding classes to the container
  className?: string;
};

const Day = ({ checked, children, ...props }: JSX.IntrinsicElements["button"] & { checked: boolean }) => {
  return (
    <button
      style={props.disabled ? {} : {}}
      className={classNames(
        "absolute top-0 left-0 right-0 bottom-0 mx-auto w-full rounded-sm text-center",
        "hover:border-brand hover:border dark:hover:border-white",
        props.disabled ? "text-bookinglighter cursor-default font-light hover:border-0" : "font-medium",
        checked
          ? "bg-brand text-brandcontrast dark:bg-darkmodebrand dark:text-darkmodebrandcontrast"
          : !props.disabled
          ? " bg-gray-100 dark:bg-gray-600 dark:text-white"
          : ""
      )}
      data-testid="day"
      data-disabled={props.disabled}
      {...props}>
      {children}
    </button>
  );
};

const Days = ({
  minDate = new Date(),
  excludedDates = [],
  browsingDate,
  weekStart,
  selected,
  ...props
}: Omit<DatePickerProps, "locale" | "className" | "weekStart"> & {
  browsingDate: Date;
  weekStart: number;
}) => {
  // Create placeholder elements for empty days in first week
  let weekdayOfFirst = new Date(new Date(browsingDate).setDate(1)).getDay();

  const days: (Date | null)[] = Array((weekdayOfFirst - weekStart + 7) % 7).fill(null);
  for (let day = 1, dayCount = daysInMonth(browsingDate); day <= dayCount; day++) {
    const date = new Date(new Date(browsingDate).setDate(day));
    days.push(date);
  }

  return (
    <>
      {days.map((day, idx) => (
        <div
          key={day === null ? `e-${idx}` : `day-${day}`}
          style={{
            paddingTop: "100%",
          }}
          className="relative w-full">
          {day === null ? (
            <div key={`e-${idx}`} />
          ) : (
            <Day
              onClick={() => props.onChange(day)}
              disabled={excludedDates.includes(yyyymmdd(day)) || day < minDate}
              checked={selected ? yyyymmdd(selected) === yyyymmdd(day) : false}>
              {day.getDate()}
            </Day>
          )}
        </div>
      ))}
    </>
  );
};

const DatePicker = ({
  weekStart = 0,
  className,
  excludedDates = [],
  locale,
  selected,
  ...passThroughProps
}: DatePickerProps) => {
  const [month, setMonth] = useState(selected ? selected.getMonth() : new Date().getMonth());

  return (
    <div className={className}>
      <div className="mb-4 flex text-xl font-light">
        <span className="w-1/2 dark:text-white">
          <strong className="text-bookingdarker dark:text-white">
            {new Date(new Date().setMonth(month)).toLocaleString(locale, { month: "long" })}
          </strong>{" "}
          <span className="text-bookinglight">{new Date(new Date().setMonth(month)).getFullYear()}</span>
        </span>
        <button
          onClick={() => setMonth(month - 1)}
          className={classNames(
            "group p-1 ltr:mr-2 rtl:ml-2",
            month > new Date().getMonth() && "text-bookinglighter dark:text-gray-600"
          )}
          disabled={month <= new Date().getMonth()}
          data-testid="decrementMonth">
          <ChevronLeftIcon className="h-5 w-5 group-hover:text-black dark:group-hover:text-white" />
        </button>
        <button className="group p-1" onClick={() => setMonth(month + 1)} data-testid="incrementMonth">
          <ChevronRightIcon className="h-5 w-5 group-hover:text-black dark:group-hover:text-white" />
        </button>
      </div>
      <div className="border-bookinglightest grid grid-cols-7 gap-4 border-t border-b text-center dark:border-gray-800 sm:border-0">
        {weekdayNames(locale, weekStart, "short").map((weekDay) => (
          <div key={weekDay} className="text-bookinglight my-4 text-xs uppercase tracking-widest">
            {weekDay}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 text-center">
        <Days
          browsingDate={new Date(new Date().setMonth(month))}
          weekStart={weekStart}
          {...passThroughProps}
        />
      </div>
    </div>
  );
};

export default DatePicker;
