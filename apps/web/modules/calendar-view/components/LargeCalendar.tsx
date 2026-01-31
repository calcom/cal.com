import { useEffect, useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { useBookerTime } from "@calcom/features/bookings/Booker/hooks/useBookerTime";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { Calendar } from "@calcom/web/modules/calendars/weeklyview/components/Calendar";
import type { CalendarAvailableTimeslots } from "@calcom/features/calendars/weeklyview/types/state";
import { localStorage } from "@calcom/lib/webstorage";
import type { BookingStatus } from "@calcom/prisma/enums";

import { useBookings } from "@calcom/atoms/hooks/bookings/useBookings";
import { useCalendarsBusyTimes } from "@calcom/atoms/hooks/useCalendarsBusyTimes";
import { useConnectedCalendars } from "@calcom/atoms/hooks/useConnectedCalendars";
import { getQueryParam } from "@calcom/features/bookings/Booker/utils/query-param";

export const LargeCalendar = ({
  extraDays,
  availableTimeslots,
  isLoading,
  event,
}: {
  extraDays: number;
  availableTimeslots?: CalendarAvailableTimeslots | undefined;
  isLoading: boolean;
  event?: {
    data?: Pick<BookerEvent, "length" | "id"> | null;
  };
}) => {
  const selectedDate = useBookerStoreContext((state) => state.selectedDate);
  const selectedEventDuration = useBookerStoreContext((state) => state.selectedDuration);
  const displayOverlay =
    getQueryParam("overlayCalendar") === "true" || localStorage?.getItem("overlayCalendarSwitchDefault");
  const { timezone } = useBookerTime();

  const eventDuration = selectedEventDuration || event?.data?.length || 30;

  const availableSlots = availableTimeslots !== undefined ? availableTimeslots : undefined;

  const startDate = selectedDate ? dayjs(selectedDate).toDate() : dayjs().toDate();
  const endDate = dayjs(startDate)
    .add(extraDays - 1, "day")
    .toDate();

  const { data: bookings, isPending: _isFetchingBookings } = useBookings({
    take: 150,
    skip: 0,
    eventTypeId: event?.data?.id,
    afterStart: startDate.toISOString(),
    beforeEnd: endDate.toISOString(),
    status: ["upcoming", "past", "recurring"],
  });

  const { data: connectedCalendars, isPending: isFetchingConnectedCalendars } = useConnectedCalendars({
    enabled: true,
  });

  const calendarsToLoad = connectedCalendars?.connectedCalendars.flatMap((connectedCalendar) => {
    return (
      connectedCalendar.calendars
        ?.filter((calendar) => calendar.isSelected === true)
        .map((cal) => ({
          credentialId: cal.credentialId,
          externalId: cal.externalId,
        })) ?? []
    );
  });

  const { data: overlayBusyDates } = useCalendarsBusyTimes({
    loggedInUsersTz: timezone,
    dateFrom: startDate.toISOString(),
    dateTo: endDate.toISOString(),
    calendarsToLoad: calendarsToLoad ?? [],
    enabled: Boolean(!isFetchingConnectedCalendars && !!calendarsToLoad?.length),
  });

  // HACK: force rerender when overlay events change
  // Sine we dont use react router here we need to force rerender (ATOM SUPPORT)

  useEffect(() => {}, [displayOverlay]);

  const sortedBookingRanges = useMemo(
    () =>
      (bookings ?? [])
        .map((booking) => ({
          booking,
          startTime: dayjs(booking.start).valueOf(),
          endTime: dayjs(booking.end).valueOf(),
        }))
        .sort((a, b) => a.startTime - b.startTime),
    [bookings]
  );

  const filteredBusyDates = useMemo(() => {
    const overlay = overlayBusyDates?.data ?? [];
    if (!sortedBookingRanges.length) return overlay;

    return overlay.filter((busy) => {
      const busyStart = dayjs(busy.start).valueOf();
      const busyEnd = dayjs(busy.end).valueOf();

      for (const { startTime, endTime } of sortedBookingRanges) {
        if (startTime >= busyEnd) break;
        if (endTime <= busyStart) continue;
        return false;
      }

      return true;
    });
  }, [overlayBusyDates?.data, sortedBookingRanges]);

  const overlayEventsForDate = useMemo(() => {
    const allBookings = bookings ?? [];
    // since busy dates comes straight from the calendar, it contains slots have bookings and also slots that are marked as busy by user but are not bookings
    // hence we filter overlayBusyDates to exclude anything that overlaps with bookings
    const busyEvents = filteredBusyDates.map((busyData, index) => ({
      id: index,
      title: `Busy`,
      start: new Date(busyData.start),
      end: new Date(busyData.end),
      options: {
        status: "ACCEPTED" as BookingStatus,
        "data-test-id": "troubleshooter-busy-event",
        className: "border-[1.5px]",
      },
    }));

    const bookingEvents = allBookings.map((booking) => ({
      id: booking.id,
      title: booking.title ?? `Busy`,
      start: new Date(booking.start),
      end: new Date(booking.end),
      options: {
        status: booking.status.toUpperCase() as BookingStatus,
        "data-test-id": "troubleshooter-busy-event",
        className: "border-[1.5px]",
      },
    }));

    return [...bookingEvents, ...busyEvents];
  }, [bookings, filteredBusyDates]);

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
        gridCellsPerHour={60 / eventDuration}
        hoverEventDuration={eventDuration}
        hideHeader
        timezone={timezone}
      />
    </div>
  );
};
