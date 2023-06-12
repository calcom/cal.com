import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import type { CalendarAvailableTimeslots } from "@calcom/features/calendars/weeklyview/types/state";

import { useBookerStore } from "../store";
import { useScheduleForEvent } from "../utils/event";

export const LargeCalendar = ({ extraDays }: { extraDays: number }) => {
  const selectedDate = useBookerStore((state) => state.selectedDate);
  const date = selectedDate || dayjs().format("YYYY-MM-DD");
  const setSelectedTimeslot = useBookerStore((state) => state.setSelectedTimeslot);
  const schedule = useScheduleForEvent({
    prefetchNextMonth: !!extraDays && dayjs(date).month() !== dayjs(date).add(extraDays, "day").month(),
  });

  const availableSlots = useMemo(() => {
    const availableTimeslots: CalendarAvailableTimeslots = {};
    if (!schedule.data) return availableTimeslots;
    if (!schedule.data.slots) return availableTimeslots;
    for (const day in schedule.data.slots) {
      availableTimeslots[day] = schedule.data.slots[day].map((slot) => ({
        start: dayjs(slot.time).toDate(),
        end: dayjs(slot.time).add(30, "minutes").toDate(),
      }));
    }

    return availableTimeslots;
  }, [schedule]);

  return (
    <div className="h-full">
      <Calendar
        availableTimeslots={availableSlots}
        startHour={8}
        endHour={18}
        events={[]}
        startDate={selectedDate ? new Date(selectedDate) : new Date()}
        endDate={dayjs(selectedDate).add(extraDays, "day").toDate()}
        onEmptyCellClick={(date) => setSelectedTimeslot(date.toString())}
        gridCellsPerHour={2}
        hoverEventDuration={30}
        hideHeader
      />
    </div>
  );
};
