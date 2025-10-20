"use client";

import { useMemo, useState } from "react";

import dayjs from "@calcom/dayjs";
import { Button } from "@calcom/ui";
import { Icon } from "@calcom/ui/components/icon/Icon";

import type { BookingOutput } from "../types";

type WeekCalendarViewProps = {
  bookings: BookingOutput[];
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS_IN_WEEK = 7;

export function WeekCalendarView({ bookings }: WeekCalendarViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => dayjs().startOf("week"));

  const weekDays = useMemo(() => {
    return Array.from({ length: DAYS_IN_WEEK }, (_, i) => currentWeekStart.add(i, "day"));
  }, [currentWeekStart]);

  const goToPreviousWeek = () => {
    setCurrentWeekStart((prev) => prev.subtract(1, "week"));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart((prev) => prev.add(1, "week"));
  };

  const goToToday = () => {
    setCurrentWeekStart(dayjs().startOf("week"));
  };

  const bookingsByDay = useMemo(() => {
    const grouped: Record<string, BookingOutput[]> = {};

    bookings.forEach((booking) => {
      const bookingStart = dayjs(booking.startTime);
      const dayKey = bookingStart.format("YYYY-MM-DD");

      if (
        bookingStart.isSameOrAfter(currentWeekStart) &&
        bookingStart.isBefore(currentWeekStart.add(7, "day"))
      ) {
        if (!grouped[dayKey]) {
          grouped[dayKey] = [];
        }
        grouped[dayKey].push(booking);
      }
    });

    return grouped;
  }, [bookings, currentWeekStart]);

  const getBookingStyle = (booking: BookingOutput) => {
    const start = dayjs(booking.startTime);
    const end = dayjs(booking.endTime);
    const startMinutes = start.hour() * 60 + start.minute();
    const durationMinutes = end.diff(start, "minute");

    const top = (startMinutes / (24 * 60)) * 100;
    const height = (durationMinutes / (24 * 60)) * 100;

    return {
      top: `${top}%`,
      height: `${Math.max(height, 2)}%`, // Minimum 2% height for visibility
    };
  };

  const getBookingColor = (booking: BookingOutput) => {
    const eventTypeColor = booking.eventType?.eventTypeColor;
    if (eventTypeColor) {
      return eventTypeColor;
    }

    switch (booking.status) {
      case "ACCEPTED":
        return "bg-blue-500";
      case "PENDING":
        return "bg-yellow-500";
      case "CANCELLED":
        return "bg-gray-400";
      case "REJECTED":
        return "bg-red-500";
      default:
        return "bg-blue-500";
    }
  };

  const formatBookingTime = (booking: BookingOutput) => {
    const start = dayjs(booking.startTime);
    const end = dayjs(booking.endTime);
    return `${start.format("h:mm A")} - ${end.format("h:mm A")}`;
  };

  const isToday = (day: dayjs.Dayjs) => {
    return day.isSame(dayjs(), "day");
  };

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

      <div className="bg-default border-subtle flex-1 overflow-auto rounded-md border">
        <div className="flex h-full min-w-[800px]">
          <div className="border-subtle w-16 flex-shrink-0 border-r">
            <div className="h-12" />
            {HOURS.map((hour) => (
              <div key={hour} className="relative h-16">
                <div className="text-subtle absolute -top-2 right-2 text-xs">
                  {hour === 0
                    ? "12 AM"
                    : hour < 12
                    ? `${hour} AM`
                    : hour === 12
                    ? "12 PM"
                    : `${hour - 12} PM`}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-1">
            {weekDays.map((day) => {
              const dayKey = day.format("YYYY-MM-DD");
              const dayBookings = bookingsByDay[dayKey] || [];

              return (
                <div
                  key={dayKey}
                  className={`border-subtle flex-1 border-r last:border-r-0 ${
                    isToday(day) ? "bg-subtle" : ""
                  }`}>
                  <div className="border-subtle flex h-12 flex-col items-center justify-center border-b">
                    <div className="text-subtle text-xs font-medium uppercase">{day.format("ddd")}</div>
                    <div
                      className={`text-emphasis flex h-6 w-6 items-center justify-center rounded-full text-sm ${
                        isToday(day) ? "bg-brand-default text-brand" : ""
                      }`}>
                      {day.format("D")}
                    </div>
                  </div>

                  <div className="relative">
                    {HOURS.map((hour) => (
                      <div key={hour} className="border-subtle h-16 border-b last:border-b-0" />
                    ))}

                    <div className="absolute inset-0">
                      {dayBookings.map((booking) => {
                        const style = getBookingStyle(booking);
                        const colorClass = getBookingColor(booking);

                        return (
                          <div
                            key={booking.id}
                            className={`absolute left-0.5 right-0.5 overflow-hidden rounded px-1 py-0.5 text-xs ${colorClass} text-white`}
                            style={style}
                            title={`${booking.title}\n${formatBookingTime(booking)}\n${booking.attendees
                              ?.map((a) => a.name)
                              .join(", ")}`}>
                            <div className="truncate font-medium">{booking.title}</div>
                            <div className="truncate text-[10px] opacity-90">
                              {dayjs(booking.startTime).format("h:mm A")}
                            </div>
                            {booking.attendees && booking.attendees.length > 0 && (
                              <div className="truncate text-[10px] opacity-75">
                                {booking.attendees[0].name}
                                {booking.attendees.length > 1 && ` +${booking.attendees.length - 1}`}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
