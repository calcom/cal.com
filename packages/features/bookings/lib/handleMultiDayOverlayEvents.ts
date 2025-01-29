import dayjs from "@calcom/dayjs";
import type { CalendarEvent } from "@calcom/features/calendars/weeklyview/types/events";
import { BookingStatus } from "@calcom/prisma/enums";

interface MultiDayEvent {
  start: string | Date;
  end: string | Date;
  title?: string;
  options?: {
    borderColor?: string;
    status?: BookingStatus;
    [key: string]: any;
  };
}

export const handleMultiDayOverlayEvents = (events: MultiDayEvent[]) => {
  return events.flatMap((event, idx) => {
    const daysDiff = dayjs(event.end).diff(event.start, "day");
    const multiDayEvents = [];

    for (let i = 0; i <= daysDiff; i++) {
      const currentDate = dayjs(event.start).startOf("day").add(i, "day");
      const eventItem = {
        ...event,
        id: idx,
        start: i === 0 ? dayjs(event.start).toDate() : dayjs(currentDate).toDate(),
        end: i === daysDiff ? dayjs(event.end).toDate() : dayjs(currentDate.endOf("day")).toDate(),
        title: event.title ?? "Busy",
        options: {
          ...event.options,
          status: BookingStatus.ACCEPTED,
          ...(daysDiff > 0 && {
            multiDayEvent: {
              start: dayjs(event.start).toDate(),
              end: dayjs(event.end).toDate(),
            },
          }),
        },
      } as CalendarEvent;
      multiDayEvents.push(eventItem);
    }
    return multiDayEvents;
  });
};
