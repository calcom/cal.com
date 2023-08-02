import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { Calendar } from "@calcom/features/calendars/weeklyview";

import { useTimePreferences } from "../../lib/timePreferences";
import { useBookerStore } from "../store";
import { useEvent, useScheduleForEvent } from "../utils/event";

export type availableTimeslotsType = {
  // Key is the date in YYYY-MM-DD format
  // start and end are ISOstring
  [key: string]: { start: string; end: string }[];
};

export const LargeCalendar = ({ extraDays }: { extraDays: number }) => {
  const selectedDate = useBookerStore((state) => state.selectedDate);
  const date = selectedDate || dayjs().format("YYYY-MM-DD");
  const setSelectedTimeslot = useBookerStore((state) => state.setSelectedTimeslot);
  const selectedEventDuration = useBookerStore((state) => state.selectedDuration);
  const schedule = useScheduleForEvent({
    prefetchNextMonth: !!extraDays && dayjs(date).month() !== dayjs(date).add(extraDays, "day").month(),
  });
  const { timezone } = useTimePreferences();

  const event = useEvent();
  const eventDuration = selectedEventDuration || event?.data?.length || 30;

  const availableSlots = useMemo(() => {
    const availableTimeslots: availableTimeslotsType = {};
    if (!schedule.data) return availableTimeslots;
    if (!schedule.data.slots) return availableTimeslots;

    for (const day in schedule.data.slots) {
      availableTimeslots[day] = schedule.data.slots[day].map((slot) => ({
        start: dayjs(slot.time).toISOString(),
        end: dayjs(slot.time).add(eventDuration, "minutes").toISOString(),
      }));
    }

    return availableTimeslots;
  }, [schedule, eventDuration]);

  const startDate = selectedDate ? dayjs(selectedDate).tz(timezone).toDate() : dayjs().toDate();
  const endDate = dayjs(startDate)
    .tz(timezone)
    .add(extraDays - 1, "day")
    .toDate();

  return (
    <div className="h-full [--calendar-dates-sticky-offset:66px]">
      <Calendar
        isLoading={schedule.isLoading}
        availableTimeslots={availableSlots}
        startHour={0}
        endHour={23}
        events={[]}
        startDate={startDate}
        endDate={endDate}
        onEmptyCellClick={(date) => setSelectedTimeslot(date.toISOString())}
        gridCellsPerHour={60 / eventDuration}
        hoverEventDuration={eventDuration}
        hideHeader
      />
    </div>
  );
};
