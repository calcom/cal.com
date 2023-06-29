import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import type { CalendarAvailableTimeslots } from "@calcom/features/calendars/weeklyview/types/state";

import { useTimePreferences } from "../../lib/timePreferences";
import { useEvent, useScheduleForEvent } from "../utils/event";
import { useBookerNavigation } from "../utils/navigation";

export const LargeCalendar = ({ extraDays }: { extraDays: number }) => {
  const {
    date: selectedDate = dayjs().format("YYYY-MM-DD"),
    month,
    duration: selectedEventDuration,
    updateQuery,
  } = useBookerNavigation();
  const schedule = useScheduleForEvent({
    prefetchNextMonth:
      !!extraDays && dayjs(selectedDate).month() !== dayjs(selectedDate).add(extraDays, "day").month(),
  });
  const { timezone } = useTimePreferences();

  const event = useEvent();
  const eventDuration = selectedEventDuration || event?.data?.length || 30;

  const availableSlots = useMemo(() => {
    const availableTimeslots: CalendarAvailableTimeslots = {};
    if (!schedule.data) return availableTimeslots;
    if (!schedule.data.slots) return availableTimeslots;

    for (const day in schedule.data.slots) {
      availableTimeslots[day] = schedule.data.slots[day].map((slot) => ({
        // First formatting to LLL and then passing it to date prevents toDate()
        // from changing the timezone to users local machine (instead of itmezone selected in UI dropdown)
        start: new Date(dayjs(slot.time).utc().tz(timezone).format("LLL")),
        end: new Date(dayjs(slot.time).utc().tz(timezone).add(eventDuration, "minutes").format("LLL")),
      }));
    }

    return availableTimeslots;
  }, [schedule, timezone, eventDuration]);

  return (
    <div className="h-full [--calendar-dates-sticky-offset:66px]">
      <Calendar
        isLoading={schedule.isLoading}
        availableTimeslots={availableSlots}
        startHour={0}
        endHour={23}
        events={[]}
        startDate={selectedDate ? new Date(selectedDate) : new Date()}
        endDate={dayjs(selectedDate).add(extraDays, "day").toDate()}
        onEmptyCellClick={(date) => {
          updateQuery({
            month: month || dayjs(date).format("YYYY-MM"),
            date: selectedDate || dayjs(date).format("YYYY-MM-DD"),
            slot: dayjs(date).format(),
          });
        }}
        gridCellsPerHour={60 / eventDuration}
        hoverEventDuration={eventDuration}
        hideHeader
      />
    </div>
  );
};
