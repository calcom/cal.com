import { useEffect, useState, useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import type { CalendarAvailableTimeslots } from "@calcom/features/calendars/weeklyview/types/state";
import type { CalendarEvent } from "@calcom/types/Calendar";

export const LargeCalendar = ({
  extraDays,
  showFakeEvents,
  allRoundedCorners,
  startDate,
  endDate,
  availableTimeslots = {},
}: {
  extraDays: number;
  showFakeEvents: boolean;
  allRoundedCorners?: boolean;
  startDate: Date;
  endDate: Date;
  availableTimeslots: CalendarAvailableTimeslots;
}) => {
  const eventDuration = 30;
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const availableSlots = useMemo(() => {
    console.log("availableTimeslots in LargeCalendar", availableTimeslots);
    return availableTimeslots || {};
  }, [availableTimeslots]);

  // const availableSlots = useMemo(() => {
  //   let availableTimeslots: CalendarAvailableTimeslots = {};

  //   availableTimeslots = {
  //     "2024-01-01": [
  //       {
  //         start: dayjs("2024-01-01T04:00:00.000Z").toDate(),
  //         end: dayjs("2024-01-01T04:00:00.000Z").add(eventDuration, "minutes").toDate(),
  //       },
  //       {
  //         start: dayjs("2024-01-01T05:00:00.000Z").toDate(),
  //         end: dayjs("2024-01-01T05:00:00.000Z").add(eventDuration, "minutes").toDate(),
  //       },
  //     ],
  //   };

  //   return availableTimeslots;
  // }, [eventDuration, showFakeEvents]);

  // const overlayEventsForDate = useMemo(() => {
  //   if (!overlayEvents || !displayOverlay) return [];
  //   return overlayEvents.map((event, id) => {
  //     return {
  //       id,
  //       start: dayjs(event.start).toDate(),
  //       end: dayjs(event.end).toDate(),
  //       title: "Busy",
  //       options: {
  //         status: "ACCEPTED",
  //       },
  //     } as CalendarEvent;
  //   });
  // }, [overlayEvents, displayOverlay]);

  useEffect(() => {
    if (showFakeEvents) {
      setEvents([
        {
          start: dayjs("2024-01-01T14:00:00.000Z").toDate(),
          end: dayjs("2024-01-01T17:00:00.000Z").toDate(),
          title: "Busy",
          options: {
            status: "ACCEPTED",
          },
        },
      ]);
    } else {
    }
  }, [showFakeEvents]);

  return (
    <div
      className={`w-full overflow-auto ${allRoundedCorners ? "rounded-2xl" : "rounded-l-2xl"}`}
      style={{
        maxHeight: `calc(100vh - ${allRoundedCorners ? "26rem" : "6rem"})`,
      }}>
      <Calendar
        isLoading={false}
        availableTimeslots={availableSlots}
        startHour={0}
        endHour={23}
        events={events}
        startDate={startDate}
        endDate={endDate}
        gridCellsPerHour={60 / eventDuration}
        hoverEventDuration={eventDuration}
        hideHeader
      />
    </div>
  );
};
