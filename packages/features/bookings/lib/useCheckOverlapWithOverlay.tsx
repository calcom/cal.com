import type { Dayjs } from "@calcom/dayjs";

import { useOverlayCalendarStore } from "../Booker/components/OverlayCalendar/store";

export function useCheckOverlapWithOverlay(start: Dayjs) {
  const overlayBusyDates = useOverlayCalendarStore((state) => state.overlayBusyDates);

  const isOverlapping =
    overlayBusyDates &&
    overlayBusyDates.some((busyDate) => {
      const busyDateStart = new Date(busyDate.start);
      const busyDateEnd = new Date(busyDate.end);
      const startDate = start.toDate();

      return startDate >= busyDateStart && startDate <= busyDateEnd;
    });

  return { isOverlapping };
}
