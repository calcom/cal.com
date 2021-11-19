import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/solid";
import { PeriodType } from "@prisma/client";
import dayjs, { Dayjs } from "dayjs";
// Then, include dayjs-business-time
import dayjsBusinessTime from "dayjs-business-time";
import utc from "dayjs/plugin/utc";
import { useEffect, useState } from "react";

import classNames from "@lib/classNames";
import { useLocale } from "@lib/hooks/useLocale";
import getSlots from "@lib/slots";
import { WorkingHours } from "@lib/types/schedule";

dayjs.extend(dayjsBusinessTime);
dayjs.extend(utc);

type DatePickerProps = {
  weekStart: string;
  onDatePicked: (pickedDate: Dayjs) => void;
  workingHours: WorkingHours[];
  eventLength: number;
  date: Dayjs | null;
  periodType: string;
  periodStartDate: Date | null;
  periodEndDate: Date | null;
  periodDays: number | null;
  periodCountCalendarDays: boolean | null;
  minimumBookingNotice: number;
};

function DatePicker({
  weekStart,
  onDatePicked,
  workingHours,
  eventLength,
  date,
  periodType = PeriodType.UNLIMITED,
  periodStartDate,
  periodEndDate,
  periodDays,
  periodCountCalendarDays,
  minimumBookingNotice,
}: DatePickerProps): JSX.Element {
  const { t } = useLocale();
  const [days, setDays] = useState<({ disabled: boolean; date: number } | null)[]>([]);

  const [selectedMonth, setSelectedMonth] = useState<number>(
    date
      ? periodType === PeriodType.RANGE
        ? dayjs(periodStartDate).utcOffset(date.utcOffset()).month()
        : date.month()
      : dayjs().month() /* High chance server is going to have the same month */
  );

  useEffect(() => {
    if (dayjs().month() !== selectedMonth) {
      setSelectedMonth(dayjs().month());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle month changes
  const incrementMonth = () => {
    setSelectedMonth((selectedMonth ?? 0) + 1);
  };

  const decrementMonth = () => {
    setSelectedMonth((selectedMonth ?? 0) - 1);
  };

  const inviteeDate = (): Dayjs => (date || dayjs()).month(selectedMonth);

  useEffect(() => {
    // Create placeholder elements for empty days in first week
    let weekdayOfFirst = inviteeDate().date(1).day();
    if (weekStart === "Monday") {
      weekdayOfFirst -= 1;
      if (weekdayOfFirst < 0) weekdayOfFirst = 6;
    }

    const days = Array(weekdayOfFirst).fill(null);

    const isDisabled = (day: number) => {
      const date: Dayjs = inviteeDate().date(day);
      switch (periodType) {
        case PeriodType.ROLLING: {
          if (!periodDays) {
            throw new Error("PeriodType rolling requires periodDays");
          }
          const periodRollingEndDay = periodCountCalendarDays
            ? dayjs.utc().add(periodDays, "days").endOf("day")
            : (dayjs.utc() as Dayjs).addBusinessTime(periodDays, "days").endOf("day");
          return (
            date.endOf("day").isBefore(dayjs().utcOffset(date.utcOffset())) ||
            date.endOf("day").isAfter(periodRollingEndDay) ||
            !getSlots({
              inviteeDate: date,
              frequency: eventLength,
              minimumBookingNotice,
              workingHours,
            }).length
          );
        }

        case PeriodType.RANGE: {
          const periodRangeStartDay = dayjs(periodStartDate).utc().endOf("day");
          const periodRangeEndDay = dayjs(periodEndDate).utc().endOf("day");
          return (
            date.endOf("day").isBefore(dayjs().utcOffset(date.utcOffset())) ||
            date.endOf("day").isBefore(periodRangeStartDay) ||
            date.endOf("day").isAfter(periodRangeEndDay) ||
            !getSlots({
              inviteeDate: date,
              frequency: eventLength,
              minimumBookingNotice,
              workingHours,
            }).length
          );
        }

        case PeriodType.UNLIMITED:
        default:
          return (
            date.endOf("day").isBefore(dayjs().utcOffset(date.utcOffset())) ||
            !getSlots({
              inviteeDate: date,
              frequency: eventLength,
              minimumBookingNotice,
              workingHours,
            }).length
          );
      }
    };

    const daysInMonth = inviteeDate().daysInMonth();
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ disabled: isDisabled(i), date: i });
    }

    setDays(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  return (
    <div
      className={
        "mt-8 sm:mt-0 sm:min-w-[455px] " +
        (date
          ? "w-full sm:w-1/2 md:w-1/3 sm:border-r sm:dark:border-gray-800 sm:pl-4 sm:pr-6 "
          : "w-full sm:pl-4")
      }>
      <div className="flex mb-4 text-xl font-light text-gray-600">
        <span className="w-1/2 text-gray-600 dark:text-white">
          <strong className="text-gray-900 dark:text-white">
            {t(inviteeDate().format("MMMM").toLowerCase())}
          </strong>{" "}
          <span className="text-gray-500">{inviteeDate().format("YYYY")}</span>
        </span>
        <div className="w-1/2 text-right text-gray-600 dark:text-gray-400">
          <button
            onClick={decrementMonth}
            className={classNames(
              "group mr-2 p-1",
              typeof selectedMonth === "number" &&
                selectedMonth <= dayjs().month() &&
                "text-gray-400 dark:text-gray-600"
            )}
            disabled={typeof selectedMonth === "number" && selectedMonth <= dayjs().month()}
            data-testid="decrementMonth">
            <ChevronLeftIcon className="w-5 h-5 group-hover:text-black dark:group-hover:text-white" />
          </button>
          <button className="p-1 group" onClick={incrementMonth} data-testid="incrementMonth">
            <ChevronRightIcon className="w-5 h-5 group-hover:text-black dark:group-hover:text-white" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-4 text-center border-t border-b dark:border-gray-800 sm:border-0">
        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
          .sort((a, b) => (weekStart.startsWith(a) ? -1 : weekStart.startsWith(b) ? 1 : 0))
          .map((weekDay) => (
            <div key={weekDay} className="my-4 text-xs tracking-widest text-gray-500 uppercase">
              {t(weekDay.toLowerCase()).substring(0, 3)}
            </div>
          ))}
      </div>
      <div className="grid grid-cols-7 gap-2 text-center">
        {days.map((day, idx) => (
          <div
            key={day === null ? `e-${idx}` : `day-${day.date}`}
            style={{
              paddingTop: "100%",
            }}
            className="relative w-full">
            {day === null ? (
              <div key={`e-${idx}`} />
            ) : (
              <button
                onClick={() => onDatePicked(inviteeDate().date(day.date))}
                disabled={day.disabled}
                className={classNames(
                  "absolute w-full top-0 left-0 right-0 bottom-0 rounded-sm text-center mx-auto",
                  "hover:border hover:border-brand dark:hover:border-white",
                  day.disabled
                    ? "text-gray-400 font-light hover:border-0 cursor-default"
                    : "dark:text-white text-primary-500 font-medium",
                  date && date.isSame(inviteeDate().date(day.date), "day")
                    ? "bg-brand text-white-important"
                    : !day.disabled
                    ? " bg-gray-100 dark:bg-gray-600"
                    : ""
                )}
                data-testid="day"
                data-disabled={day.disabled}>
                {day.date}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default DatePicker;
