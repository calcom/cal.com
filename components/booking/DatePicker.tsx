import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/outline";
import { useEffect, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import getSlots from "@lib/slots";
import dayjsBusinessDays from "dayjs-business-days";

dayjs.extend(dayjsBusinessDays);
dayjs.extend(utc);
dayjs.extend(timezone);

const DatePicker = ({
  weekStart,
  onDatePicked,
  workingHours,
  organizerTimeZone,
  inviteeTimeZone,
  eventLength,
  date,
  periodType = "unlimited",
  periodStartDate,
  periodEndDate,
  periodDays,
  periodCountCalendarDays,
  minimumBookingNotice,
  setHeight,
}) => {
  const [calendar, setCalendar] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState<number>();
  const [selectedDate, setSelectedDate] = useState<Dayjs>();

  useEffect(() => {
    if (date) {
      setSelectedDate(dayjs(date).tz(inviteeTimeZone));
      setSelectedMonth(dayjs(date).tz(inviteeTimeZone).month());
      return;
    }

    if (periodType === "range") {
      setSelectedMonth(dayjs(periodStartDate).tz(inviteeTimeZone).month());
    } else {
      setSelectedMonth(dayjs().tz(inviteeTimeZone).month());
    }
  }, []);

  useEffect(() => {
    if (selectedDate) onDatePicked(selectedDate);
  }, [selectedDate]);

  // Handle month changes
  const incrementMonth = () => {
    setSelectedMonth(selectedMonth + 1);
  };

  const decrementMonth = () => {
    setSelectedMonth(selectedMonth - 1);
  };

  useEffect(() => {
    if (!selectedMonth) {
      // wish next had a way of dealing with this magically;
      return;
    }

    const inviteeDate = dayjs().tz(inviteeTimeZone).month(selectedMonth);

    const isDisabled = (day: number) => {
      const date: Dayjs = inviteeDate.date(day);

      switch (periodType) {
        case "rolling": {
          const periodRollingEndDay = periodCountCalendarDays
            ? dayjs().tz(organizerTimeZone).add(periodDays, "days").endOf("day")
            : dayjs().tz(organizerTimeZone).businessDaysAdd(periodDays, "days").endOf("day");
          return (
            date.endOf("day").isBefore(dayjs().tz(inviteeTimeZone)) ||
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
            date.endOf("day").isBefore(dayjs().tz(inviteeTimeZone)) ||
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
            date.endOf("day").isBefore(dayjs().tz(inviteeTimeZone)) ||
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

    // Set up calendar
    const daysInMonth = inviteeDate.daysInMonth();
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    // Create placeholder elements for empty days in first week
    let weekdayOfFirst = inviteeDate.date(1).day();
    if (weekStart === "Monday") {
      weekdayOfFirst -= 1;
      if (weekdayOfFirst < 0) weekdayOfFirst = 6;
    }
    const emptyDays = Array(weekdayOfFirst)
      .fill(null)
      .map((day, i) => (
        <div key={`e-${i}`} className={"text-center w-10 h-10 rounded-full mx-auto"}>
          {null}
        </div>
      ));

    // Combine placeholder days with actual days
    setCalendar([
      ...emptyDays,
      ...days.map((day) => (
        <button
          key={day}
          onClick={() => setSelectedDate(inviteeDate.date(day))}
          disabled={isDisabled(day)}
          className={
            "w-36 mx-auto h-28 mx-auto p-3 text-left flex self-start" +
            (isDisabled(day)
              ? " text-neutral-400 font-light"
              : " text-neutral-900 dark:text-neutral-200 font-medium") +
            (selectedDate && selectedDate.isSame(inviteeDate.date(day), "day")
              ? " bg-neutral-100 dark:bg-neutral-700 border border-neutral-900 dark:border-neutral-600 dark:text-white"
              : !isDisabled(day)
              ? " bg-neutral-100 dark:bg-neutral-700 dark:bg-opacity-30"
              : "")
          }>
          {day}
        </button>
      )),
    ]);
  }, [selectedMonth, inviteeTimeZone, selectedDate]);

  return selectedMonth ? (
    <div className="mt-8 sm:mt-0">
      <div className="flex text-gray-600 text-xl mb-8">
        <div className="w-1/2 text-2xl">
          <span className="font-semibold text-neutral-900 dark:text-white">
            {dayjs().month(selectedMonth).format("MMMM")}
          </span>
          &nbsp;
          <span className="text-neutral-400">{dayjs().month(selectedMonth).format("YYYY")}</span>
        </div>
        <div className="w-1/2 text-right text-gray-600 dark:text-gray-400">
          <button
            onClick={decrementMonth}
            className={
              "p-1 bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-white rounded-sm border border-neutral-300 text-black mr-4 " +
              (selectedMonth <= dayjs().tz(inviteeTimeZone).month() && "opacity-50")
            }
            disabled={selectedMonth <= dayjs().tz(inviteeTimeZone).month()}>
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <button
            className="p-1 bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-white rounded-sm border border-neutral-300"
            onClick={incrementMonth}>
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div
        className="bg-white dark:bg-neutral-800 p-6 rounded-l-sm border border-neutral-300 dark:border-neutral-700 grid grid-cols-7 gap-y-4"
        ref={(el) => {
          if (!el) return;
          setHeight(el.getBoundingClientRect().height);
        }}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
          .sort((a, b) => (weekStart.startsWith(a) ? -1 : weekStart.startsWith(b) ? 1 : 0))
          .map((weekDay) => (
            <div
              key={weekDay}
              className="uppercase text-neutral-600 text-xs tracking-widest border-b border-neutral-200 dark:border-neutral-700 pb-4">
              {weekDay}
            </div>
          ))}
        {calendar}
      </div>
    </div>
  ) : null;
};

export default DatePicker;
