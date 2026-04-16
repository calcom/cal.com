"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { Calendar } from "@calcom/web/modules/calendars/weeklyview/components/Calendar";
import type { CalendarComponentProps, Hours } from "@calcom/features/calendars/weeklyview/types/state";
import { weekdayDates } from "@calcom/features/calendars/weeklyview/utils";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";

import { useOnboardingCalendarEvents } from "../hooks/useOnboardingCalendarEvents";

// Helper function to ensure a number is a valid Hours type
const toHours = (value: number): Hours => {
  const clamped = Math.max(0, Math.min(23, value));
  return clamped as Hours;
};

export const OnboardingCalendarBrowserView = () => {
  const pathname = usePathname();
  const { startDate, endDate } = useMemo(() => {
    return weekdayDates(0, new Date(), 6);
  }, []);

  const { events } = useOnboardingCalendarEvents({ startDate, endDate });

  // Calculate startHour and endHour based on current time
  const hours = useMemo((): { startHour: Hours; endHour: Hours } => {
    const currentHour = dayjs().tz(CURRENT_TIMEZONE).hour();
    return {
      startHour: toHours(Math.max(0, currentHour - 2)),
      endHour: toHours(Math.min(23, currentHour + 6)),
    };
  }, []);

  // Animation variants for entry and exit
  const containerVariants = {
    initial: {
      opacity: 0,
      y: -20,
    },
    animate: {
      opacity: 1,
      y: 0,
    },
    exit: {
      opacity: 0,
      y: 20,
    },
  };

  // Memoize calendar props to prevent unnecessary re-initializations
  const calendarProps = useMemo(
    () =>
      ({
        timezone: CURRENT_TIMEZONE,
        startDate,
        endDate,
        events: events || [],
        startHour: hours.startHour,
        endHour: hours.endHour,
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
      }) satisfies CalendarComponentProps,
    [startDate, endDate, events, hours]
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        className="bg-default border-muted flex h-full w-full flex-col overflow-hidden rounded-xl border"
        variants={containerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          duration: 0.5,
          ease: "backOut",
        }}>
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
      </motion.div>
    </AnimatePresence>
  );
};
