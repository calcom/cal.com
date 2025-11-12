"use client";

import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import { weekdayDates } from "@calcom/features/calendars/weeklyview/utils";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";

import { useOnboardingCalendarEvents } from "../hooks/useOnboardingCalendarEvents";

export const OnboardingCalendarBrowserView = () => {
  const { startDate, endDate } = useMemo(() => {
    return weekdayDates(0, new Date(), 6);
  }, []);

  const { events } = useOnboardingCalendarEvents({ startDate, endDate });

  // Memoize calendar props to prevent unnecessary re-initializations
  const calendarProps = useMemo(
    () => ({
      timezone: CURRENT_TIMEZONE,
      startDate,
      endDate,
      events: events || [],
      gridCellsPerHour: 4,
      hoverEventDuration: 0,
      showBackgroundPattern: false,
      showBorder: false,
      borderColor: "subtle" as const,
      hideHeader: true,
      eventsDisabled: true,
      sortEvents: true,
      isPending: false, // Explicitly set to false to prevent loading spinner
      loading: false, // Also set loading to false just in case
      onEventClick: () => {},
      onEmptyCellClick: () => {},
      onDateChange: () => {},
      showTimezone: true,
    }),
    [startDate, endDate, events]
  );

  return (
    <div className="bg-default border-muted flex h-full w-full flex-col overflow-hidden rounded-xl border">
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="text-default text-sm font-semibold">
          {dayjs(startDate).format("MMM D")}
          <span className="mx-1">–</span>
          {dayjs(endDate).format("MMM D, YYYY")}
        </span>
      </div>
      {/* Calendar View */}
      <div className="flex h-full flex-col overflow-hidden">
        <Calendar {...calendarProps} />
      </div>
    </div>
  );
};
