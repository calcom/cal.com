import dayjs from "@calcom/dayjs";
import type { CalendarEvent } from "@calcom/features/calendars/weeklyview/types/events";

export type BusyDetail = { start: string | Date; end: string | Date; title?: string };

export function mapBusyDetailsToCalendarEvents(busyDetails: BusyDetail[]): CalendarEvent[] {
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

export function hasBusyDetails(value: unknown): value is { busyDetails: BusyDetail[] } {
  if (!value || typeof value !== "object") return false;
  const maybe = value as { busyDetails?: unknown };
  return Array.isArray(maybe.busyDetails);
}
