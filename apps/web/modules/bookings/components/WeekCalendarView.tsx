"use client";

import { useMemo, useState, useCallback, useEffect } from "react";

import dayjs from "@calcom/dayjs";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import type { CalendarEvent } from "@calcom/features/calendars/weeklyview/types/events";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";

import type { BookingOutput } from "../types";

type WeekCalendarViewProps = {
  bookings: BookingOutput[];
  onWeekChange?: (startDate: Date, endDate: Date) => void;
};

export function WeekCalendarView({ bookings, onWeekChange }: WeekCalendarViewProps) {
  const { timezone } = useTimePreferences();
  const [currentWeekStart, _setCurrentWeekStart] = useState(() => dayjs().startOf("week"));

  const setCurrentWeekStart = useCallback(
    (newWeekStart: dayjs.Dayjs) => {
      _setCurrentWeekStart(newWeekStart);
      const newStartDate = newWeekStart.toDate();
      const newEndDate = newWeekStart.add(6, "day").toDate();
      onWeekChange?.(newStartDate, newEndDate);
    },
    [onWeekChange]
  );

  const goToPreviousWeek = () => {
    setCurrentWeekStart(currentWeekStart.subtract(1, "week"));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(currentWeekStart.add(1, "week"));
  };

  const goToToday = () => {
    setCurrentWeekStart(dayjs().startOf("week"));
  };

  const startDate = useMemo(() => currentWeekStart.toDate(), [currentWeekStart]);
  const endDate = useMemo(() => currentWeekStart.add(6, "day").toDate(), [currentWeekStart]);

  useEffect(() => {
    onWeekChange?.(startDate, endDate);
  }, []);

  const events = useMemo<CalendarEvent[]>(() => {
    return bookings
      .filter((booking) => {
        const bookingStart = dayjs(booking.startTime);
        return (
          (bookingStart.isAfter(currentWeekStart) || bookingStart.isSame(currentWeekStart)) &&
          bookingStart.isBefore(currentWeekStart.add(7, "day"))
        );
      })
      .sort((a, b) => {
        const startDiff = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        if (startDiff !== 0) return startDiff;
        return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
      })
      .map((booking, idx) => {
        return {
          id: idx,
          title: booking.title,
          start: new Date(booking.startTime),
          end: new Date(booking.endTime),
          options: {
            status: booking.status,
          },
        };
      });
  }, [bookings, currentWeekStart]);

  const weekRange = `${currentWeekStart.format("MMM D")} - ${currentWeekStart
    .add(6, "day")
    .format("MMM D, YYYY")}`;

  return (
    <div className="flex h-[calc(100vh-280px)] min-h-[600px] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-emphasis text-lg font-semibold">{weekRange}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button color="secondary" onClick={goToToday}>
            Today
          </Button>
          <Button color="secondary" variant="icon" onClick={goToPreviousWeek}>
            <Icon name="chevron-left" className="h-4 w-4" />
          </Button>
          <Button color="secondary" variant="icon" onClick={goToNextWeek}>
            <Icon name="chevron-right" className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Calendar
          timezone={timezone}
          sortEvents
          startHour={0}
          endHour={23}
          events={events}
          startDate={startDate}
          endDate={endDate}
          gridCellsPerHour={4}
          hoverEventDuration={0}
          hideHeader
        />
      </div>
    </div>
  );
}
