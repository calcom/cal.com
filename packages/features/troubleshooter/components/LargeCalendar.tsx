import dayjs from "@calcom/dayjs";
import { Calendar } from "@calcom/features/calendars/weeklyview";

import { useTroubleshooterStore } from "../store";

export const LargeCalendar = ({ extraDays }: { extraDays: number }) => {
  const selectedDate = useTroubleshooterStore((state) => state.selectedDate);
  const date = selectedDate || dayjs().format("YYYY-MM-DD");
  const startDate = selectedDate ? dayjs(selectedDate).toDate() : dayjs().toDate();
  const endDate = dayjs(startDate)
    .add(extraDays - 1, "day")
    .toDate();

  return (
    <div className="h-full [--calendar-dates-sticky-offset:66px]">
      <Calendar
        startHour={0}
        endHour={23}
        events={[]}
        startDate={startDate}
        endDate={endDate}
        gridCellsPerHour={60 / 15}
        hoverEventDuration={30}
        hideHeader
      />
    </div>
  );
};
