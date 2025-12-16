"use client";

import { useMemo, useEffect } from "react";

import dayjs from "@calcom/dayjs";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import type { CalendarEvent } from "@calcom/features/calendars/weeklyview/types/events";
import { useBanners } from "@calcom/features/shell/banners/useBanners";
import { useGetTheme } from "@calcom/lib/hooks/useTheme";

import { useBookingDetailsSheetStore } from "../store/bookingDetailsSheetStore";
import type { BookingOutput } from "../types";

type BookingCalendarViewProps = {
  bookings: BookingOutput[];
  currentWeekStart: dayjs.Dayjs;
  onWeekStartChange: (weekStart: dayjs.Dayjs) => void;
};

export function BookingCalendarView({
  bookings,
  currentWeekStart,
  onWeekStartChange,
}: BookingCalendarViewProps) {
  const setSelectedBookingUid = useBookingDetailsSheetStore((state) => state.setSelectedBookingUid);
  const selectedBookingUid = useBookingDetailsSheetStore((state) => state.selectedBookingUid);
  const { timezone } = useTimePreferences();
  const { resolvedTheme, forcedTheme } = useGetTheme();
  const { bannersHeight } = useBanners();

  const startDate = useMemo(() => currentWeekStart.toDate(), [currentWeekStart]);
  const endDate = useMemo(() => currentWeekStart.add(6, "day").toDate(), [currentWeekStart]);

  // Intentionally only runs on mount to trigger the initial currentWeekStart
  useEffect(() => {
    onWeekStartChange(currentWeekStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const events = useMemo<CalendarEvent[]>(() => {
    const hasDarkTheme = !forcedTheme && resolvedTheme === "dark";

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
        // Parse eventTypeColor and extract the appropriate color based on theme
        const eventTypeColor =
          booking.eventType?.eventTypeColor &&
          booking.eventType.eventTypeColor[hasDarkTheme ? "darkEventTypeColor" : "lightEventTypeColor"];

        return {
          id: idx,
          title: booking.title,
          start: new Date(booking.startTime),
          end: new Date(booking.endTime),
          options: {
            status: booking.status,
            ...(eventTypeColor && { color: eventTypeColor }),
            bookingUid: booking.uid,
          },
        };
      });
  }, [bookings, currentWeekStart, resolvedTheme, forcedTheme]);

  return (
    <>
      <div
        className="border-subtle flex flex-1 flex-col overflow-y-auto overflow-x-hidden rounded-2xl border"
        style={{ height: `calc(100vh - 6rem - ${bannersHeight}px)` }}>
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
          selectedBookingUid={selectedBookingUid}
          onEventClick={(event) => {
            const bookingUid = event.options?.bookingUid;
            if (bookingUid) {
              setSelectedBookingUid(bookingUid);
            }
          }}
          showTimezone
          hideHeader
        />
      </div>
    </>
  );
}
