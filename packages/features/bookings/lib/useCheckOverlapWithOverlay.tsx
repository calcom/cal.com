import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";

import { useOverlayCalendarStore } from "../Booker/components/OverlayCalendar/store";

function getCurrentTime(date: Date) {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function useCheckOverlapWithOverlay(start: Dayjs, selectedDuration: number | null, offset: number) {
  const overlayBusyDates = useOverlayCalendarStore((state) => state.overlayBusyDates);

  let overlappingTimeStart: string | null = null;
  let overlappingTimeEnd: string | null = null;

  const isOverlapping =
    overlayBusyDates &&
    overlayBusyDates.some((busyDate) => {
      const busyDateStart = dayjs(busyDate.start);
      const busyDateEnd = dayjs(busyDate.end);
      const selectedEndTime = dayjs(start.add(offset, "hours")).add(selectedDuration ?? 0, "minute");

      const isOverlapping =
        (selectedEndTime.isSame(busyDateStart) || selectedEndTime.isAfter(busyDateStart)) &&
        start.add(offset, "hours") < busyDateEnd &&
        selectedEndTime > busyDateStart;

      if (isOverlapping) {
        console.log({
          isOverlapping,
          start: start.format("HH:mm"),
          selectedEndTime: selectedEndTime.format("HH:mm"),
          busyDateStart: busyDateStart.format("HH:mm"),
          busyDateEnd: busyDateEnd.format("HH:mm"),
        });
      }

      overlappingTimeStart = isOverlapping ? getCurrentTime(busyDateStart.toDate()) : null;
      overlappingTimeEnd = isOverlapping ? getCurrentTime(busyDateEnd.toDate()) : null;

      return isOverlapping;
    });

  return { isOverlapping, overlappingTimeStart, overlappingTimeEnd } as {
    isOverlapping: boolean;
    overlappingTimeStart: string | null;
    overlappingTimeEnd: string | null;
  };
}
