import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/solid";
import { useEffect, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import getSlots from "@lib/slots";
import dayjsBusinessDays from "dayjs-business-days";
import classNames from "@lib/classNames";

dayjs.extend(dayjsBusinessDays);
dayjs.extend(utc);
dayjs.extend(timezone);

const DatePicker = ({
  weekStart,
  onDatePicked,
  workingHours,
  organizerTimeZone,
  eventLength,
  date,
  periodType = "unlimited",
  periodStartDate,
  periodEndDate,
  periodDays,
  periodCountCalendarDays,
  minimumBookingNotice,
}) => {
  const [days, setDays] = useState<({ disabled: boolean; date: number } | null)[]>([]);

  const [selectedMonth, setSelectedMonth] = useState<number | null>(
    date
      ? periodType === "range"
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
    setSelectedMonth(selectedMonth + 1);
  };

  const decrementMonth = () => {
    setSelectedMonth(selectedMonth - 1);
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
        case "rolling": {
          const periodRollingEndDay = periodCountCalendarDays
            ? dayjs().tz(organizerTimeZone).add(periodDays, "days").endOf("day")
            : dayjs().tz(organizerTimeZone).businessDaysAdd(periodDays, "days").endOf("day");
          return (
            date.endOf("day").isBefore(dayjs().utcOffsett(date.utcOffset())) ||
            date.endOf("day").isAfter(periodRollingEndDay) ||
            !getSlots({
              inviteeDate: date,
              frequency: eventLength,
              minimumBookingNotice,
              workingHours,
              organizerTimeZone,
            }).length
          );
        }

        case "range": {
          const periodRangeStartDay = dayjs(periodStartDate).tz(organizerTimeZone).endOf("day");
          const periodRangeEndDay = dayjs(periodEndDate).tz(organizerTimeZone).endOf("day");
          return (
            date.endOf("day").isBefore(dayjs().utcOffset(date.utcOffset())) ||
            date.endOf("day").isBefore(periodRangeStartDay) ||
            date.endOf("day").isAfter(periodRangeEndDay) ||
            !getSlots({
              inviteeDate: date,
              frequency: eventLength,
              minimumBookingNotice,
              workingHours,
              organizerTimeZone,
            }).length
          );
        }

        case "unlimited":
        default:
          return (
            date.endOf("day").isBefore(dayjs().utcOffset(date.utcOffset())) ||
            !getSlots({
              inviteeDate: date,
              frequency: eventLength,
              minimumBookingNotice,
              workingHours,
              organizerTimeZone,
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
      <div className="flex text-gray-600 font-light text-xl mb-4">
        <span className="w-1/2 text-gray-600 dark:text-white">
          <strong className="text-gray-900 dark:text-white">{inviteeDate().format("MMMM")}</strong>
          <span className="text-gray-500"> {inviteeDate().format("YYYY")}</span>
        </span>
        <div className="w-1/2 text-right text-gray-600 dark:text-gray-400">
          <button
            onClick={decrementMonth}
            className={
              "group mr-2 p-1" + (selectedMonth <= dayjs().month() && "text-gray-400 dark:text-gray-600")
            }
            disabled={selectedMonth <= dayjs().month()}>
            <ChevronLeftIcon className="group-hover:text-black dark:group-hover:text-white w-5 h-5" />
          </button>
          <button className="group p-1" onClick={incrementMonth}>
            <ChevronRightIcon className="group-hover:text-black dark:group-hover:text-white w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-4 text-center border-b border-t dark:border-gray-800 sm:border-0">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
          .sort((a, b) => (weekStart.startsWith(a) ? -1 : weekStart.startsWith(b) ? 1 : 0))
          .map((weekDay) => (
            <div key={weekDay} className="uppercase text-gray-500 text-xs tracking-widest my-4">
              {weekDay}
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
            className="w-full relative">
            {day === null ? (
              <div key={`e-${idx}`} />
            ) : (
              <button
                onClick={() => onDatePicked(inviteeDate().date(day.date))}
                disabled={day.disabled}
                className={classNames(
                  "absolute w-full top-0 left-0 right-0 bottom-0 rounded-sm text-center mx-auto",
                  "hover:border hover:border-black dark:hover:border-white",
                  day.disabled
                    ? "text-gray-400 font-light hover:border-0 cursor-default"
                    : "dark:text-white text-primary-500 font-medium",
                  date && date.isSame(inviteeDate().date(day.date), "day")
                    ? "bg-black text-white-important"
                    : !day.disabled
                    ? " bg-gray-100 dark:bg-gray-600"
                    : ""
                )}>
                {day.date}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DatePicker;
