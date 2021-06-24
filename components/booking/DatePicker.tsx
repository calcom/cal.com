import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/solid";
import { useEffect, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import isToday from "dayjs/plugin/isToday";
dayjs.extend(isToday);

const DatePicker = ({ weekStart, onDatePicked, workingHours, disableToday }) => {
  const workingDays = workingHours.reduce((workingDays: number[], wh) => [...workingDays, ...wh.days], []);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month());
  const [selectedDate, setSelectedDate] = useState();

  useEffect(() => {
    if (selectedDate) onDatePicked(selectedDate);
  }, [selectedDate, onDatePicked]);

  // Handle month changes
  const incrementMonth = () => {
    setSelectedMonth(selectedMonth + 1);
  };

  const decrementMonth = () => {
    setSelectedMonth(selectedMonth - 1);
  };

  // Set up calendar
  const daysInMonth = dayjs().month(selectedMonth).daysInMonth();
  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Create placeholder elements for empty days in first week
  let weekdayOfFirst = dayjs().month(selectedMonth).date(1).day();
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

  const isDisabled = (day: number) => {
    const date: Dayjs = dayjs().month(selectedMonth).date(day);
    return (
      date.isBefore(dayjs()) || !workingDays.includes(+date.format("d")) || (date.isToday() && disableToday)
    );
  };

  // Combine placeholder days with actual days
  const calendar = [
    ...emptyDays,
    ...days.map((day) => (
      <button
        key={day}
        onClick={() => setSelectedDate(dayjs().month(selectedMonth).date(day))}
        disabled={
          (selectedMonth < parseInt(dayjs().format("MM")) &&
            dayjs().month(selectedMonth).format("D") > day) ||
          isDisabled(day)
        }
        className={
          "text-center w-10 h-10 rounded-full mx-auto" +
          (isDisabled(day) ? " text-gray-400 font-light" : " text-blue-600 font-medium") +
          (selectedDate && selectedDate.isSame(dayjs().month(selectedMonth).date(day), "day")
            ? " bg-blue-600 text-white-important"
            : !isDisabled(day)
            ? " bg-blue-50"
            : "")
        }>
        {day}
      </button>
    )),
  ];

  return (
    <div className={"mt-8 sm:mt-0 " + (selectedDate ? "sm:w-1/3 border-r sm:px-4" : "sm:w-1/2 sm:pl-4")}>
      <div className="flex text-gray-600 font-light text-xl mb-4 ml-2">
        <span className="w-1/2">{dayjs().month(selectedMonth).format("MMMM YYYY")}</span>
        <div className="w-1/2 text-right">
          <button
            onClick={decrementMonth}
            className={"mr-4 " + (selectedMonth < parseInt(dayjs().format("MM")) && "text-gray-400")}
            disabled={selectedMonth < parseInt(dayjs().format("MM"))}>
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <button onClick={incrementMonth}>
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-4 text-center">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
          .sort((a, b) => (weekStart.startsWith(a) ? -1 : weekStart.startsWith(b) ? 1 : 0))
          .map((weekDay) => (
            <div key={weekDay} className="uppercase text-gray-400 text-xs tracking-widest">
              {weekDay}
            </div>
          ))}
        {calendar}
      </div>
    </div>
  );
};

export default DatePicker;
