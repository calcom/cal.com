import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { useOverlayCalendarStore } from "../Booker/components/OverlayCalendar/store";

export function getCurrentTime(date: Date, multiDayEvent?: boolean, i18n?: { language?: string }) {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const formattedMonth = new Intl.DateTimeFormat(i18n?.language ?? "en", { month: "short" });

  if (!!multiDayEvent) {
    const day = date.getDate();
    const monthStr = formattedMonth.format(date);
    return `${monthStr} ${day}, ${hours}:${minutes}`;
  }
  return `${hours}:${minutes}`;
}

export function useCheckOverlapWithOverlay({
  start,
  selectedDuration,
  offset,
}: {
  start: Dayjs;
  selectedDuration: number | null;
  offset: number;
}) {
  const overlayBusyDates = useOverlayCalendarStore((state) => state.overlayBusyDates);
  const { i18n } = useLocale();

  let overlappingTimeStart: string | null = null;
  let overlappingTimeEnd: string | null = null;
  let overlayEventTitle: string | null = null;

  const isOverlapping =
    overlayBusyDates &&
    overlayBusyDates.some((busyDate) => {
      // const busyDateStart = dayjs(busyDate.start);
      // const busyDateEnd = dayjs(busyDate.end);
      const busyDateStart = !busyDate.options?.multiDayEvent
        ? dayjs(busyDate.start)
        : dayjs(busyDate.options?.multiDayEvent?.start);
      const busyDateEnd = !busyDate.options?.multiDayEvent
        ? dayjs(busyDate.end)
        : dayjs(busyDate.options?.multiDayEvent?.end);
      const selectedEndTime = dayjs(start.add(offset, "hours")).add(selectedDuration ?? 0, "minute");

      const isOverlapping =
        (selectedEndTime.isSame(busyDateStart) || selectedEndTime.isAfter(busyDateStart)) &&
        start.add(offset, "hours") < busyDateEnd &&
        selectedEndTime > busyDateStart;

      overlappingTimeStart = isOverlapping
        ? getCurrentTime(busyDateStart.toDate(), !!busyDate.options?.multiDayEvent, i18n)
        : null;
      overlappingTimeEnd = isOverlapping
        ? getCurrentTime(busyDateEnd.toDate(), !!busyDate.options?.multiDayEvent, i18n)
        : null;
      overlayEventTitle = isOverlapping && busyDate.title ? busyDate.title : "Busy";

      return isOverlapping;
    });

  return { isOverlapping, overlappingTimeStart, overlappingTimeEnd, overlayEventTitle } as {
    isOverlapping: boolean;
    overlappingTimeStart: string | null;
    overlappingTimeEnd: string | null;
    overlayEventTitle: string | null;
  };
}
