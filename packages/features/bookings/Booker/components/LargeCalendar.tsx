import { useMemo, useEffect } from "react";
import dayjs from "@calcom/dayjs";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { useAvailableTimeSlots } from "@calcom/features/bookings/Booker/components/hooks/useAvailableTimeSlots";
import { useBookerTime } from "@calcom/features/bookings/Booker/components/hooks/useBookerTime";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import type { CalendarEvent } from "@calcom/features/calendars/weeklyview/types/events";
import { localStorage } from "@calcom/lib/webstorage";

import type { useScheduleForEventReturnType } from "../utils/event";
import { getQueryParam } from "../utils/query-param";
import { useOverlayCalendarStore } from "./OverlayCalendar/store";
import { useLocale } from "@calcom/lib/hooks/useLocale"; 

export const LargeCalendar = ({
  extraDays,
  schedule,
  isLoading,
  event,
}: {
  extraDays: number;
  schedule?: useScheduleForEventReturnType["data"];
  isLoading: boolean;
  event: { data?: Pick<BookerEvent, "length"> | null };
}) => {
  const selectedDate = useBookerStoreContext((state) => state.selectedDate);
  const setSelectedTimeslot = useBookerStoreContext((state) => state.setSelectedTimeslot);
  const selectedEventDuration = useBookerStoreContext((state) => state.selectedDuration);
  const overlayEvents = useOverlayCalendarStore((state) => state.overlayBusyDates);
  const displayOverlay =
    getQueryParam("overlayCalendar") === "true" || localStorage?.getItem("overlayCalendarSwitchDefault");
  const { timezone } = useBookerTime();
  const { t } = useLocale(); 

  const eventDuration = selectedEventDuration || event?.data?.length || 30;

  // Normalize spacing so calendar works for durations like 25m
  const normalizeGridCells = () => {
    const baseInterval = 5; // best universal anchor
    return 60 / baseInterval; // always integer (12)
  };

  const availableSlots = useAvailableTimeSlots({ schedule, eventDuration });

  const startDate = selectedDate ? dayjs(selectedDate).toDate() : dayjs().toDate();
  const endDate = dayjs(startDate).add(extraDays - 1, "day").toDate();

  useEffect(() => {}, [displayOverlay]);

  const overlayEventsForDate = useMemo(() => {
    if (!overlayEvents || !displayOverlay) return [];
    return overlayEvents.map((event, id) => ({
      id,
      start: dayjs(event.start).toDate(),
      end: dayjs(event.end).toDate(),
      title: t("availability_busy"), 
      options: { status: "ACCEPTED" },
    })) as CalendarEvent[];
  }, [overlayEvents, displayOverlay, t]);

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
        gridCellsPerHour={normalizeGridCells()}
        hoverEventDuration={eventDuration}
        hideHeader
        timezone={timezone}
      />
    </div>
  );
};
