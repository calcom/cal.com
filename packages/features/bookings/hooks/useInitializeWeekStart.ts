import { useEffect } from "react";

import dayjs from "@calcom/dayjs";
import { useSlotsViewOnSmallScreen } from "@calcom/embed-core/embed-iframe";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";

export const useInitializeWeekStart = (isPlatform: boolean, isCalendarView: boolean) => {
  const slotsViewOnSmallScreen = useSlotsViewOnSmallScreen();
  const today = dayjs();
  const weekStart = today.startOf("week").format("YYYY-MM-DD");
  const setSelectedDate = useBookerStoreContext((state) => state.setSelectedDate);

  useEffect(() => {
    // don't auto-select date if slots view on small screen is enabled
    // auto-selecting would open the slots modal in that case which the user would most probably have to close
    if (slotsViewOnSmallScreen) return;

    if (isPlatform && isCalendarView) {
      setSelectedDate({ date: weekStart, omitUpdatingParams: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
