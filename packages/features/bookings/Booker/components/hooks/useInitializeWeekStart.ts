import { useEffect } from "react";

import dayjs from "@calcom/dayjs";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";

export const useInitializeWeekStart = (isPlatform: boolean, isCalendarView: boolean) => {
  const today = dayjs();
  const weekStart = today.startOf("week").format("YYYY-MM-DD");
  const setSelectedDate = useBookerStoreContext((state) => state.setSelectedDate);

  useEffect(() => {
    if (isPlatform && isCalendarView) {
      setSelectedDate({ date: weekStart, omitUpdatingParams: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
