import { useMemo } from "react";

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
import { hasBusyDetails, mapBusyDetailsToCalendarEvents } from "./mapBusyDetailsToCalendarEvents";

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

  const { startDate, endDate } = useMemo(() => {
    const start = selectedDate ? dayjs(selectedDate).toDate() : dayjs().toDate();
    const end = dayjs(start)
      .add(extraDays - 1, "day")
      .toDate();
    return { startDate: start, endDate: end };
  }, [selectedDate, extraDays]);

  // NOTE: Force remount of Calendar when overlay toggle changes to refresh internal layout state.
  const calendarRemountKey = displayOverlay ? "overlay-on" : "overlay-off";

  const overlayEventsForDate = useMemo(() => {
    // Use busyDetails from schedule if available (contains event titles)
    const busyDetails = hasBusyDetails(schedule) ? schedule.busyDetails : undefined;
    if (busyDetails && displayOverlay) {
      return mapBusyDetailsToCalendarEvents(busyDetails);
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
        key={calendarRemountKey}
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
