"use client";

import type { BookingStatus } from "@calcom/prisma/enums";
import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { useMemo } from "react";

import { useBookingDetailsSheetStore } from "../store/bookingDetailsSheetStore";
import type { BookingOutput } from "../types";

type BookingMonthViewProps = {
  bookings: BookingOutput[];
  currentMonth: dayjs.Dayjs;
  userWeekStart: number;
};

// Matches the color scheme used in Event.tsx for consistency
const STATUS_COLOR_CLASSES: Record<BookingStatus, string> = {
  ACCEPTED: "bg-green-500",
  PENDING: "bg-orange-500",
  CANCELLED: "bg-red-400",
  REJECTED: "bg-red-400",
  AWAITING_HOST: "bg-blue-500",
};

const STATUS_CHIP_CLASSES: Record<BookingStatus, string> = {
  ACCEPTED: "text-emphasis hover:opacity-80",
  PENDING: "text-emphasis hover:opacity-80",
  CANCELLED: "text-subtle line-through hover:opacity-80",
  REJECTED: "text-subtle line-through hover:opacity-80",
  AWAITING_HOST: "text-emphasis hover:opacity-80",
};

const MAX_VISIBLE_CHIPS = 3;

// Sunday-indexed day names; sliced based on userWeekStart
const ALL_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function BookingMonthView({ bookings, currentMonth, userWeekStart }: BookingMonthViewProps) {
  const { t } = useLocale();
  const setSelectedBookingUid = useBookingDetailsSheetStore((state) => state.setSelectedBookingUid);
  const today = dayjs();

  // How many cells to prepend from the previous month
  const firstDayOfMonth = currentMonth.startOf("month");
  const prefixDays = (firstDayOfMonth.day() - userWeekStart + 7) % 7;
  const gridStart = firstDayOfMonth.subtract(prefixDays, "day");

  // Always render 6 rows × 7 cols = 42 cells so the grid has a stable height
  const cells = useMemo(
    () => Array.from({ length: 42 }, (_, i) => gridStart.add(i, "day")),
    [gridStart]
  );

  // Day header labels starting from userWeekStart
  const dayHeaders = useMemo(
    () => [...ALL_DAY_NAMES.slice(userWeekStart), ...ALL_DAY_NAMES.slice(0, userWeekStart)],
    [userWeekStart]
  );

  // Map bookings by local date key for O(1) lookup
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, BookingOutput[]>();
    for (const booking of bookings) {
      const key = dayjs(booking.startTime).format("YYYY-MM-DD");
      const existing = map.get(key) ?? [];
      map.set(key, [...existing, booking]);
    }
    return map;
  }, [bookings]);

  return (
    <div className="border-subtle overflow-hidden rounded-2xl border">
      {/* Day-of-week header row */}
      <div className="border-subtle grid grid-cols-7 border-b">
        {dayHeaders.map((label) => (
          <div key={label} className="text-subtle py-3 text-center text-xs font-semibold uppercase tracking-wide">
            {label}
          </div>
        ))}
      </div>

      {/* 6-row × 7-col date grid — gridAutoRows enforces a consistent row height */}
      <div className="grid grid-cols-7" style={{ gridAutoRows: "175px" }}>
        {cells.map((day, idx) => {
          const dateKey = day.format("YYYY-MM-DD");
          const dayBookings = bookingsByDate.get(dateKey) ?? [];
          const isCurrentMonth = day.month() === currentMonth.month();
          const isToday = day.isSame(today, "day");
          const isLastRow = idx >= 35;

          return (
            <div
              key={dateKey}
              className={classNames(
                "relative overflow-hidden p-2",
                !isLastRow && "border-subtle border-b",
                idx % 7 !== 6 && "border-subtle border-r",
                !isCurrentMonth && "bg-muted/30"
              )}>
              {/* Date number */}
              <div className="mb-1.5 flex items-center justify-between">
                <span
                  className={classNames(
                    "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                    isToday && "bg-brand-default text-brand",
                    !isToday && isCurrentMonth && "text-emphasis",
                    !isToday && !isCurrentMonth && "text-subtle"
                  )}>
                  {day.date()}
                </span>
              </div>

              {/* Booking chips */}
              <div className="flex flex-col gap-1">
                {dayBookings.slice(0, MAX_VISIBLE_CHIPS).map((booking) => {
                  const status = booking.status as BookingStatus;
                  const dotColor = STATUS_COLOR_CLASSES[status] ?? "bg-emphasis";
                  const chipClass = STATUS_CHIP_CLASSES[status] ?? "text-emphasis hover:opacity-80";

                  return (
                    <button
                      key={booking.uid}
                      type="button"
                      onClick={() => setSelectedBookingUid(booking.uid)}
                      className={classNames(
                        "border-subtle flex w-full items-center gap-1.5 truncate rounded border bg-subtle px-1.5 py-1 text-left text-xs font-medium",
                        "focus:outline-none focus:ring-1 focus:ring-brand-default focus:ring-offset-1",
                        chipClass
                      )}
                      title={`${dayjs(booking.startTime).format("h:mm a")} – ${booking.title}`}>
                      <span className={classNames("h-2 w-2 shrink-0 rounded-full", dotColor)} />
                      <span className="truncate">
                        {dayjs(booking.startTime).format("h:mm a")} {booking.title}
                      </span>
                    </button>
                  );
                })}

                {dayBookings.length > MAX_VISIBLE_CHIPS && (
                  <span className="text-subtle px-1 text-xs">
                    +{dayBookings.length - MAX_VISIBLE_CHIPS} {t("more")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
