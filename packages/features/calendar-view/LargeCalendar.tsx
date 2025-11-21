import { useEffect, useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { useAvailableTimeSlots } from "@calcom/features/bookings/Booker/components/hooks/useAvailableTimeSlots";
import { useBookerTime } from "@calcom/features/bookings/Booker/components/hooks/useBookerTime";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import { localStorage } from "@calcom/lib/webstorage";
import type { BookingStatus } from "@calcom/prisma/enums";

import { useBookings } from "../../platform/atoms/hooks/bookings/useBookings";
import type { useScheduleForEventReturnType } from "../bookings/Booker/utils/event";
import { getQueryParam } from "../bookings/Booker/utils/query-param";

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
    data?: Pick<BookerEvent, "length" | "id"> | null;
  };
}) => {
  const selectedDate = useBookerStoreContext((state) => state.selectedDate);
  const selectedEventDuration = useBookerStoreContext((state) => state.selectedDuration);
  const displayOverlay =
    getQueryParam("overlayCalendar") === "true" || localStorage?.getItem("overlayCalendarSwitchDefault");
  const { timezone } = useBookerTime();

  const eventDuration = selectedEventDuration || event?.data?.length || 30;

  const availableSlots = useAvailableTimeSlots({ schedule, eventDuration });

  const startDate = selectedDate ? dayjs(selectedDate).toDate() : dayjs().toDate();
  const endDate = dayjs(startDate)
    .add(extraDays - 1, "day")
    .toDate();

  const { data: upcomingBookings } = useBookings({
    take: 150,
    skip: 0,
    status: ["upcoming", "past", "recurring"],
    eventTypeId: event?.data?.id,
    afterStart: startDate.toISOString(),
    beforeEnd: endDate.toISOString(),
  });

  // HACK: force rerender when overlay events change
  // Sine we dont use react router here we need to force rerender (ATOM SUPPORT)

  useEffect(() => {}, [displayOverlay]);

  const overlayEventsForDate = useMemo(() => {
    if (!upcomingBookings) return [];

    return upcomingBookings?.map((booking) => {
      return {
        id: booking.id,
        title: booking.title ?? `Busy`,
        start: new Date(booking.start),
        end: new Date(booking.end),
        options: {
          status: booking.status.toUpperCase() as BookingStatus,
          "data-test-id": "troubleshooter-busy-event",
          className: "border-[1.5px]",
        },
      };
    });
  }, [upcomingBookings]);

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
