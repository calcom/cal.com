import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";

import { useOverlayCalendarStore } from "../Booker/components/OverlayCalendar/store";

function getCurrentTime(date: Date) {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function useCheckOverlapWithOverlay(start: Dayjs) {
  const overlayBusyDates = useOverlayCalendarStore((state) => state.overlayBusyDates);
  let overlappingTimeStart: string | null = null;
  let overlappingTimeEnd: string | null = null;

  const isOverlapping =
    overlayBusyDates &&
    overlayBusyDates
      .filter((value) => dayjs(value.start).isSame(start, "day"))
      .some((busyDate) => {
        const busyDateStart = new Date(busyDate.start);
        const busyDateEnd = new Date(busyDate.end);
        const startDate = start.toDate();

        const overlap =
          startDate >= busyDateStart &&
          startDate <= busyDateEnd &&
          dayjs(startDate).format("HH:mm") !== dayjs(busyDateEnd).format("HH:mm");

        if (overlap) {
          overlappingTimeStart = getCurrentTime(busyDateStart);
          overlappingTimeEnd = getCurrentTime(busyDateEnd);
        }

        return overlap;
      });

  return { isOverlapping, overlappingTimeStart, overlappingTimeEnd } as {
    isOverlapping: boolean;
    overlappingTimeStart: string | null;
    overlappingTimeEnd: string | null;
  };
}
