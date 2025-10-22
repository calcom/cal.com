"use client";

import { useMemo, useState, useCallback, useEffect } from "react";

import dayjs from "@calcom/dayjs";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import type { CalendarEvent } from "@calcom/features/calendars/weeklyview/types/events";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";
import { Icon } from "@calcom/ui/components/icon";

import type { BookingOutput } from "../types";

type WeekCalendarViewProps = {
  bookings: BookingOutput[];
  onWeekChange?: (startDate: Date, endDate: Date) => void;
};

export function WeekCalendarView({ bookings, onWeekChange }: WeekCalendarViewProps) {
  const { t } = useLocale();
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

  const weekStart = currentWeekStart;
  const weekEnd = currentWeekStart.add(6, "day");
  const startMonth = weekStart.format("MMM");
  const endMonth = weekEnd.format("MMM");
  const year = weekEnd.format("YYYY");

  const weekRange =
    startMonth === endMonth ? (
      <>
        <span className="text-emphasis">{`${startMonth} ${weekStart.format("D")} - ${weekEnd.format(
          "D"
        )}`}</span>
        <span className="text-muted">, {year}</span>
      </>
    ) : (
      <>
        <span className="text-emphasis">{`${weekStart.format("MMM D")} - ${weekEnd.format("MMM D")}`}</span>
        <span className="text-muted">, {year}</span>
      </>
    );

  return (
    <div className="border-subtle flex h-[calc(100vh-260px)] min-h-[600px] flex-col rounded-2xl border">
      <div className="mx-4 mt-4 flex items-center justify-between py-1.5">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">{weekRange}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button color="secondary" onClick={goToToday} className="capitalize leading-4">
            {t("today")}
          </Button>
          <ButtonGroup combined>
            <Button color="secondary" onClick={goToPreviousWeek}>
              <span className="sr-only">{t("view_previous_week")}</span>
              <Icon name="chevron-left" className="h-4 w-4" />
            </Button>
            <Button color="secondary" onClick={goToNextWeek}>
              <span className="sr-only">{t("view_next_week")}</span>
              <Icon name="chevron-right" className="h-4 w-4" />
            </Button>
          </ButtonGroup>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden rounded-2xl">
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
          showBackgroundPattern={false}
          showBorder={false}
          borderColor="subtle"
          onEventClick={(event) => {
            console.log("Event clicked:", event);
          }}
          hideHeader
        />
      </div>
    </div>
  );
}
