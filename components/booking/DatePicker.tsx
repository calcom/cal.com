import dayjs from "dayjs";
import {ChevronLeftIcon, ChevronRightIcon} from "@heroicons/react/solid";
import {useEffect, useState} from "react";

const DatePicker = ({ weekStart, onDatePicked }) => {

  const [selectedMonth, setSelectedMonth] = useState(dayjs().month());
  const [selectedDay, setSelectedDay] = useState(dayjs().date());
  const [hasPickedDate, setHasPickedDate] = useState(false);

  useEffect(() => {
    if (hasPickedDate) {
      onDatePicked(dayjs().month(selectedMonth).date(selectedDay));
    }
  }, [hasPickedDate, selectedDay]);

  // Handle month changes
  const incrementMonth = () => {
    setSelectedMonth(selectedMonth + 1);
  }

  const decrementMonth = () => {
    setSelectedMonth(selectedMonth - 1);
  }

  // Set up calendar
  var daysInMonth = dayjs().month(selectedMonth).daysInMonth();
  var days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Create placeholder elements for empty days in first week
  let weekdayOfFirst = dayjs().month(selectedMonth).date(1).day();
  if (weekStart === 'Monday') {
    weekdayOfFirst -= 1;
    if (weekdayOfFirst < 0)
      weekdayOfFirst = 6;
  }
  const emptyDays = Array(weekdayOfFirst).fill(null).map((day, i) =>
    <div key={`e-${i}`} className={"text-center w-10 h-10 rounded-full mx-auto"}>
      {null}
    </div>
  );

  // Combine placeholder days with actual days
  const calendar = [...emptyDays, ...days.map((day) =>
    <button key={day}
            onClick={() => { setHasPickedDate(true); setSelectedDay(day) }}
            disabled={
              selectedMonth < parseInt(dayjs().format('MM')) && dayjs().month(selectedMonth).format("D") > day
            }
            className={
              "text-center w-10 h-10 rounded-full mx-auto " + (
                dayjs().isSameOrBefore(dayjs().date(day).month(selectedMonth)
                ) ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-400 font-light'
              ) + (
                dayjs().date(selectedDay).month(selectedMonth).format("D") == day ? ' bg-blue-600 text-white-important' : ''
              )
            }>
      {day}
    </button>
  )];

  return (
    <div
      className={
        "mt-8 sm:mt-0 " +
        (hasPickedDate
          ? "sm:w-1/3 border-r sm:px-4"
          : "sm:w-1/2 sm:pl-4")
      }
    >
      <div className="flex text-gray-600 font-light text-xl mb-4 ml-2">
                  <span className="w-1/2">
                    {dayjs().month(selectedMonth).format("MMMM YYYY")}
                  </span>
        <div className="w-1/2 text-right">
          <button
            onClick={decrementMonth}
            className={
              "mr-4 " +
              (selectedMonth < parseInt(dayjs().format("MM")) &&
                "text-gray-400")
            }
            disabled={selectedMonth < parseInt(dayjs().format("MM"))}
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <button onClick={incrementMonth}>
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-4 text-center">
        {
          ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            .sort( (a, b) => weekStart.startsWith(a) ? -1 : weekStart.startsWith(b) ? 1 : 0 )
            .map( (weekDay) =>
              <div key={weekDay} className="uppercase text-gray-400 text-xs tracking-widest">{weekDay}</div>
            )
        }
        {calendar}
      </div>
    </div>
  );
}

export default DatePicker;