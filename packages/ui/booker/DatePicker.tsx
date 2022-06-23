import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/solid";
import dayjs from "dayjs";
import isToday from "dayjs/plugin/isToday";
import { useMemo, useState } from "react";

import classNames from "@calcom/lib/classNames";
import { daysInMonth, yyyymmdd } from "@calcom/lib/date-fns";
import { weekdayNames } from "@calcom/lib/weekday";
import { SkeletonContainer } from "@calcom/ui/skeleton";

dayjs.extend(isToday);

export type DatePickerProps = {
  /** which day of the week to render the calendar. Usually Sunday (=0) or Monday (=1) - default: Sunday */
  weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Fires whenever a selected date is changed. */
  onChange: (date: Date) => void;
  /** Fires when the month is changed. */
  onMonthChange?: (date: Date) => void;
  /** which date is currently selected (not tracked from here) */
  selected?: Date;
  /** defaults to current date. */
  minDate?: Date;
  /** Furthest date selectable in the future, default = UNLIMITED */
  maxDate?: Date;
  /** locale, any IETF language tag, e.g. "hu-HU" - defaults to Browser settings */
  locale: string;
  /** Defaults to [], which dates are not bookable. Array of valid dates like: ["2022-04-23", "2022-04-24"] */
  excludedDates?: string[];
  /** defaults to all, which dates are bookable (inverse of excludedDates) */
  includedDates?: string[];
  /** allows adding classes to the container */
  className?: string;
  /** Shows a small loading spinner next to the month name */
  isLoading?: boolean;
};

export const Day = ({
  date,
  active,
  ...props
}: JSX.IntrinsicElements["button"] & { active: boolean; date: Date }) => {
  return (
    <button
      className={classNames(
        "hover:border-brand disabled:text-bookinglighter absolute top-0 left-0 right-0 bottom-0 mx-auto rounded-sm border border-transparent text-center font-medium disabled:cursor-default disabled:border-transparent disabled:font-light dark:hover:border-white disabled:dark:border-transparent",
        active
          ? "bg-brand text-brandcontrast dark:bg-darkmodebrand dark:text-darkmodebrandcontrast"
          : !props.disabled
          ? " bg-gray-100 dark:bg-gray-600 dark:text-white"
          : ""
      )}
      data-testid="day"
      data-disabled={props.disabled}
      {...props}>
      {date.getDate()}
      {dayjs(date).isToday() && (
        <span className="absolute left-0 bottom-0 mx-auto -mb-px w-full text-4xl">.</span>
      )}
    </button>
  );
};

const Days = ({
  minDate,
  excludedDates = [],
  includedDates,
  browsingDate,
  weekStart,
  DayComponent = Day,
  selected,
  ...props
}: Omit<DatePickerProps, "locale" | "className" | "weekStart"> & {
  DayComponent?: React.FC<React.ComponentProps<typeof Day>>;
  browsingDate: Date;
  weekStart: number;
}) => {
  // Create placeholder elements for empty days in first week
  const weekdayOfFirst = new Date(new Date(browsingDate).setDate(1)).getDay();
  // memoize to prevent a flicker on redraw on the current day
  const minDateValueOf = useMemo(() => {
    return minDate?.valueOf() || new Date().valueOf();
  }, [minDate]);

  const days: (Date | null)[] = Array((weekdayOfFirst - weekStart + 7) % 7).fill(null);
  for (let day = 1, dayCount = daysInMonth(browsingDate); day <= dayCount; day++) {
    const date = new Date(new Date(browsingDate).setDate(day));
    days.push(date);
  }

  return (
    <>
      {days.map((day, idx) =>
        day === null ? (
          <div key={`e-${idx}`} />
        ) : (
          <div key={day === null ? `e-${idx}` : `day-${day}`} className="relative w-full pt-[100%]">
            {day === null ? (
              <div key={`e-${idx}`} />
            ) : props.isLoading ? (
              <SkeletonContainer>
                <button
                  className="absolute top-0 left-0 right-0 bottom-0 mx-auto w-full rounded-sm border-transparent bg-gray-50 text-gray-400 opacity-50 dark:bg-gray-900 dark:text-gray-200"
                  key={`e-${idx}`}>
                  {day.getDate()}
                </button>
              </SkeletonContainer>
            ) : (
              <DayComponent
                date={day}
                onClick={() => {
                  props.onChange(day);
                  window.scrollTo({
                    top: 360,
                    behavior: "smooth",
                  });
                }}
                disabled={
                  (includedDates && !includedDates.includes(yyyymmdd(day))) ||
                  excludedDates.includes(yyyymmdd(day)) ||
                  day.valueOf() < minDateValueOf
                }
                active={selected ? yyyymmdd(selected) === yyyymmdd(day) : false}
              />
            )}
          </div>
        )
      )}
    </>
  );
};

const DatePicker = ({
  weekStart = 0,
  className,
  locale,
  selected,
  onMonthChange,
  ...passThroughProps
}: DatePickerProps & Partial<React.ComponentProps<typeof Days>>) => {
  const [month, setMonth] = useState(selected ? selected.getMonth() : new Date().getMonth());

  const changeMonth = (newMonth: number) => {
    setMonth(newMonth);
    if (onMonthChange) {
      const d = new Date();
      d.setMonth(newMonth, 1);
      onMonthChange(d);
    }
  };

  return (
    <div className={className}>
      <div className="mb-4 flex justify-between text-xl font-light">
        <span className="w-1/2 dark:text-white">
          <strong className="text-bookingdarker dark:text-white">
            {new Date(new Date().setMonth(month)).toLocaleString(locale, { month: "long" })}
          </strong>{" "}
          <span className="text-bookinglight">{new Date(new Date().setMonth(month)).getFullYear()}</span>
        </span>
        <div className="text-black dark:text-white">
          <button
            onClick={() => changeMonth(month - 1)}
            className={classNames(
              "group p-1 opacity-50 hover:opacity-100 ltr:mr-2 rtl:ml-2",
              month <= new Date().getMonth() && "disabled:text-bookinglighter hover:opacity-50"
            )}
            disabled={month <= new Date().getMonth()}
            data-testid="decrementMonth">
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            className="group p-1 opacity-50 hover:opacity-100"
            onClick={() => changeMonth(month + 1)}
            data-testid="incrementMonth">
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="border-bookinglightest mb-2 grid grid-cols-7 gap-4 border-t border-b text-center dark:border-gray-800 sm:mb-0 sm:border-0">
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
          selected={selected}
          {...passThroughProps}
        />
      </div>
    </div>
  );
};

export default DatePicker;
