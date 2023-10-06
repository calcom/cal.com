import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";

import { useOverlayCalendarStore } from "../Booker/components/OverlayCalendar/store";

function getCurrentTime(date: Date) {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function useCheckOverlapWithOverlay(start: Dayjs, selectedDuration: number | null) {
  const overlayBusyDates = useOverlayCalendarStore((state) => state.overlayBusyDates);

  const overlappingTimeStart: string | null = null;
  const overlappingTimeEnd: string | null = null;

  const isOverlapping =
    overlayBusyDates &&
    overlayBusyDates.some((busyDate) => {
      const busyDateStart = dayjs(busyDate.start);
      const busyDateEnd = dayjs(busyDate.end);
      const selectedEndTime = dayjs(start).add(selectedDuration ?? 0, "minute");

      const isOverlapping = selectedEndTime.isAfter(busyDateStart) && start < busyDateEnd;

      return isOverlapping;
    });

  return { isOverlapping, overlappingTimeStart, overlappingTimeEnd } as {
    isOverlapping: boolean;
    overlappingTimeStart: string | null;
    overlappingTimeEnd: string | null;
  };
}
