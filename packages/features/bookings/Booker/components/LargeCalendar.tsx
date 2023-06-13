import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import type { CalendarAvailableTimeslots, Hours } from "@calcom/features/calendars/weeklyview/types/state";

import { useBookerStore } from "../store";
import { useEvent, useScheduleForEvent } from "../utils/event";

export const LargeCalendar = ({ extraDays }: { extraDays: number }) => {
  const selectedDate = useBookerStore((state) => state.selectedDate);
  const date = selectedDate || dayjs().format("YYYY-MM-DD");
  const setSelectedTimeslot = useBookerStore((state) => state.setSelectedTimeslot);
  const schedule = useScheduleForEvent({
    prefetchNextMonth: !!extraDays && dayjs(date).month() !== dayjs(date).add(extraDays, "day").month(),
  });
  const event = useEvent();
  const [startHour, endHour] = useMemo(() => {
    const startHour = event.data?.schedule?.availability
      .map((slot) => dayjs(slot.startTime).hour())
      // Sort by earliest first.
      .sort((a, b) => a - b)[0] as Hours;

    const endHour = event.data?.schedule?.availability
      .map((slot) => dayjs(slot.endTime).hour())
      // Sort by latest first.
      .sort((a, b) => b - a)[0] as Hours;

    // Defaults to 9am and 6pm if no availability is found. As far as I know this should
    // never happen, but IF it still does, at least we have a start and end time.
    // Use nullish coaliscing so 0 is a valid value and won't get overridden by the default.
    return [startHour ?? 9, endHour ?? 18];
  }, [event]);

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
  const eventDuration = event?.data?.length || 30;

  return (
    <div className="h-full">
      <Calendar
        availableTimeslots={availableSlots}
        startHour={startHour}
        endHour={endHour}
        events={[]}
        startDate={selectedDate ? new Date(selectedDate) : new Date()}
        endDate={dayjs(selectedDate).add(extraDays, "day").toDate()}
        onEmptyCellClick={(date) => setSelectedTimeslot(date.toString())}
        gridCellsPerHour={60 / eventDuration}
        hoverEventDuration={eventDuration}
        hideHeader
      />
    </div>
  );
};
