"use client";

import { useMemo, useState } from "react";

import dayjs from "@calcom/dayjs";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import type { CalendarEvent } from "@calcom/features/calendars/weeklyview/types/events";
import { parseEventTypeColor } from "@calcom/lib/isEventTypeColor";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";

import type { BookingOutput } from "../types";

type WeekCalendarViewProps = {
  bookings: BookingOutput[];
};

export function WeekCalendarView({ bookings }: WeekCalendarViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => dayjs().startOf("week"));

  const goToPreviousWeek = () => {
    setCurrentWeekStart((prev) => prev.subtract(1, "week"));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart((prev) => prev.add(1, "week"));
  };

  const goToToday = () => {
    setCurrentWeekStart(dayjs().startOf("week"));
  };

  const startDate = currentWeekStart.toDate();
  const endDate = currentWeekStart.add(6, "day").toDate();

  const events = useMemo<CalendarEvent[]>(() => {
    return bookings
      .filter((booking) => {
        const bookingStart = dayjs(booking.startTime);
        return (
          bookingStart.isSameOrAfter(currentWeekStart) &&
          bookingStart.isBefore(currentWeekStart.add(7, "day"))
        );
      })
      .map((booking, idx) => {
        const eventTypeColor = booking.eventType?.eventTypeColor;
        let borderColor = "#3b82f6";

        if (eventTypeColor) {
          const parsedColor = parseEventTypeColor(eventTypeColor);
          if (parsedColor) {
            borderColor = parsedColor.lightThemeHex;
          }
        }

        return {
          id: idx,
          title: booking.title || "Booking",
          start: new Date(booking.startTime),
          end: new Date(booking.endTime),
          options: {
            status: booking.status,
            borderColor,
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

      <div className="flex-1 overflow-hidden [--calendar-dates-sticky-offset:0px]">
        <Calendar
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
