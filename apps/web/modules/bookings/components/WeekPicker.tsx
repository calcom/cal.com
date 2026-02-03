import { useState, useEffect } from "react";

import dayjs from "@calcom/dayjs";
import { DatePicker } from "@calcom/ui/components/form";

import { getWeekStart } from "../lib/weekUtils";

interface WeekPickerProps {
  currentWeekStart: dayjs.Dayjs;
  userWeekStart: number;
  onDateChange: (date: dayjs.Dayjs) => void;
}

export function WeekPicker({ currentWeekStart, userWeekStart, onDateChange }: WeekPickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(currentWeekStart.toDate());
  useEffect(() => {
    setSelectedDate(currentWeekStart.toDate());
  }, [currentWeekStart]);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    const selectedDayjs = dayjs(date);
    const newWeekStart = getWeekStart(selectedDayjs, userWeekStart);
    onDateChange(newWeekStart);
  };

  const weekStart = currentWeekStart;
  const weekEnd = currentWeekStart.add(6, "day");
  const startMonth = weekStart.format("MMM");
  const endMonth = weekEnd.format("MMM");
  const year = weekEnd.format("YYYY");

  const weekRange =
    startMonth === endMonth
      ? `${startMonth} ${weekStart.format("D")} - ${weekEnd.format("D")}, ${year}`
      : `${weekStart.format("MMM D")} - ${weekEnd.format("MMM D")}, ${year}`;

  return <DatePicker date={selectedDate} onDatesChange={handleDateChange} minDate={null} label={weekRange} />;
}
