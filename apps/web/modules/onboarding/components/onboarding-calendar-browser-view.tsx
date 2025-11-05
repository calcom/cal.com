"use client";

import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import { weekdayDates } from "@calcom/features/calendars/weeklyview/utils";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";

type OnboardingCalendarBrowserViewProps = {
  username?: string | null;
};

export const OnboardingCalendarBrowserView = () => {
  const { startDate, endDate } = useMemo(() => {
    return weekdayDates(0, new Date(), 6);
  }, []);

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
        <Calendar
          timezone={CURRENT_TIMEZONE}
          startDate={startDate}
          endDate={endDate}
          events={[]}
          startHour={0}
          endHour={23}
          gridCellsPerHour={4}
          hoverEventDuration={0}
          showBackgroundPattern={false}
          showBorder={false}
          borderColor="subtle"
          hideHeader={true}
          eventsDisabled={true}
          onEventClick={() => {}}
          onEmptyCellClick={() => {}}
          onDateChange={() => {}}
          showTimezone={true}
        />
      </div>
    </div>
  );
};
