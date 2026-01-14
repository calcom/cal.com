import { useEffect } from "react";

import dayjs from "@calcom/dayjs";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { useSlotsViewOnSmallScreen } from "@calcom/features/bookings/Booker/components/hooks/useSlotsViewOnSmallScreen";

export const useInitializeWeekStart = (
  isPlatform: boolean,
  isCalendarView: boolean
) => {
  const enableTwoStepSlotSelection = useSlotsViewOnSmallScreen();
  const today = dayjs();
  const weekStart = today.startOf("week").format("YYYY-MM-DD");
  const setSelectedDate = useBookerStoreContext(
    (state) => state.setSelectedDate
  );

  useEffect(() => {
    // don't auto-select date if two step slot selection is enabled
    // auto-selecting would open the slots modal in that case which the user would most probably have to close
    if (enableTwoStepSlotSelection) return;

    if (isPlatform && isCalendarView) {
      setSelectedDate({ date: weekStart, omitUpdatingParams: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
