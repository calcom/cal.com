import { useSession } from "next-auth/react";
import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import type { CalendarAvailableTimeslots } from "@calcom/features/calendars/weeklyview/types/state";

import { useTimePreferences } from "../../bookings/lib/timePreferences";
import { useSchedule } from "../../schedules/lib/use-schedule";
import { useTroubleshooterStore } from "../store";

export const LargeCalendar = ({ extraDays }: { extraDays: number }) => {
  const { timezone } = useTimePreferences();
  const selectedDate = useTroubleshooterStore((state) => state.selectedDate);
  const event = useTroubleshooterStore((state) => state.event);
  const { data: session } = useSession();
  const date = selectedDate ? dayjs(selectedDate) : dayjs();

  const { data: schedule } = useSchedule({
    username: session?.user.username || "",
    eventSlug: event?.slug,
    eventId: event?.id,
    timezone,
    month: date.format("YYYY-MM"),
  });

  const startDate = selectedDate ? dayjs(selectedDate).toDate() : dayjs().toDate();
  const endDate = dayjs(startDate)
    .add(extraDays - 1, "day")
    .toDate();

  const availableSlots = useMemo(() => {
    const availableTimeslots: CalendarAvailableTimeslots = {};
    if (!schedule) return availableTimeslots;
    if (!schedule?.slots) return availableTimeslots;

    for (const day in schedule.slots) {
      availableTimeslots[day] = schedule.slots[day].map((slot) => ({
        start: dayjs(slot.time).toDate(),
        end: dayjs(slot.time)
          .add(event?.duration ?? 30, "minutes")
          .toDate(),
      }));
    }

    return availableTimeslots;
  }, [schedule, event]);

  // const events = useMemo(() => {
  //   if (!data?.busy) return [];
  //   return data?.busy.map((event, idx) => {
  //     return {
  //       id: idx,
  //       title: event.title ?? "Busy",
  //       start: new Date(event.start),
  //       end: new Date(event.end),
  //       options: {
  //         borderColor: "#F97417",
  //         status: BookingStatus.ACCEPTED,
  //       },
  //     };
  //   });
  // }, [data]);

  return (
    <div className="h-full [--calendar-dates-sticky-offset:66px]">
      <Calendar
        startHour={0}
        endHour={23}
        events={[]}
        availableTimeslots={availableSlots}
        startDate={startDate}
        endDate={endDate}
        gridCellsPerHour={60 / 15}
        hoverEventDuration={30}
        hideHeader
      />
    </div>
  );
};
