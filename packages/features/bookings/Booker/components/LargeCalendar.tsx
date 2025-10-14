import { useEffect, useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { useAvailableTimeSlots } from "@calcom/features/bookings/Booker/components/hooks/useAvailableTimeSlots";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import type { CalendarEvent } from "@calcom/features/calendars/weeklyview/types/events";
import { localStorage } from "@calcom/lib/webstorage";

import type { useScheduleForEventReturnType } from "../utils/event";
import { getQueryParam } from "../utils/query-param";
import { useOverlayCalendarStore } from "./OverlayCalendar/store";

export const LargeCalendar = ({
  extraDays,
  schedule,
  isLoading,
  event,
}: {
  extraDays: number;
  schedule?: useScheduleForEventReturnType["data"];
  isLoading: boolean;
  event: {
    data?: Pick<BookerEvent, "length"> | null;
  };
}) => {
  const selectedDate = useBookerStoreContext((state) => state.selectedDate);
  const setSelectedTimeslot = useBookerStoreContext((state) => state.setSelectedTimeslot);
  const selectedEventDuration = useBookerStoreContext((state) => state.selectedDuration);
  const overlayEvents = useOverlayCalendarStore((state) => state.overlayBusyDates);
  const displayOverlay =
    getQueryParam("overlayCalendar") === "true" || localStorage?.getItem("overlayCalendarSwitchDefault");

  const eventDuration = selectedEventDuration || event?.data?.length || 30;

  const availableSlots = useAvailableTimeSlots({ schedule, eventDuration });

  const startDate = selectedDate ? dayjs(selectedDate).toDate() : dayjs().toDate();
  const endDate = dayjs(startDate)
    .add(extraDays - 1, "day")
    .toDate();

  // HACK: force rerender when overlay events change
  // Sine we dont use react router here we need to force rerender (ATOM SUPPORT)
   
  useEffect(() => {}, [displayOverlay]);

  const overlayEventsForDate = useMemo(() => {
    // Use busyDetails from schedule if available (contains event titles)
    type BusyDetail = { start: string | Date; end: string | Date; title?: string };
    const busyDetails = (schedule as { busyDetails?: BusyDetail[] } | undefined)?.busyDetails;
    if (busyDetails && displayOverlay) {
      return busyDetails.map((event: BusyDetail, id: number) => {
        const start = dayjs(event.start);
        const end = dayjs(event.end);
        const isAllDayLike =
          !start.isValid() || !end.isValid()
            ? false
            : start.startOf("day").isSame(start) &&
              end.startOf("day").isSame(end) &&
              end.diff(start, "hour") >= 24;

        // Weekly view doesn't render options.allDay yet. Instead, render a compact banner at the top.
        const bannerStart = start.startOf("day");
        const bannerEnd = bannerStart.add(30, "minutes");

        return {
          id,
          start: (isAllDayLike ? bannerStart : start).toDate(),
          end: (isAllDayLike ? bannerEnd : end).toDate(),
          title: event.title || "Busy",
          options: {
            status: "ACCEPTED",
            hideTime: isAllDayLike,
            className: isAllDayLike
              ? "h-6 mt-1 rounded border border-border bg-muted text-foreground"
              : undefined,
          },
        } as CalendarEvent;
      });
    }
    // Fallback to overlayEvents (from old calendarOverlay API)
    if (!overlayEvents || !displayOverlay) return [];
    return overlayEvents.map((event, id) => {
      return {
        id,
        start: dayjs(event.start).toDate(),
        end: dayjs(event.end).toDate(),
        title: "Busy",
        options: {
          status: "ACCEPTED",
        },
      } as CalendarEvent;
    });
  }, [schedule, overlayEvents, displayOverlay]);

  return (
    <div className="h-full [--calendar-dates-sticky-offset:66px]">
      <Calendar
        isPending={isLoading}
        availableTimeslots={availableSlots}
        startHour={0}
        endHour={23}
        events={overlayEventsForDate}
        startDate={startDate}
        endDate={endDate}
        onEmptyCellClick={(date) => setSelectedTimeslot(date.toISOString())}
        gridCellsPerHour={60 / eventDuration}
        hoverEventDuration={eventDuration}
        hideHeader
      />
    </div>
  );
};
