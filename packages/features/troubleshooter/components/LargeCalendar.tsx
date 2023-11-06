import { useSession } from "next-auth/react";
import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { Calendar } from "@calcom/features/calendars/weeklyview";
import type { CalendarAvailableTimeslots } from "@calcom/features/calendars/weeklyview/types/state";
import { BookingStatus } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";

import { useTimePreferences } from "../../bookings/lib/timePreferences";
import { useSchedule } from "../../schedules/lib/use-schedule";
import { useTroubleshooterStore } from "../store";

export const LargeCalendar = ({ extraDays }: { extraDays: number }) => {
  const { timezone } = useTimePreferences();
  const selectedDate = useTroubleshooterStore((state) => state.selectedDate);
  const event = useTroubleshooterStore((state) => state.event);
  const { data: session } = useSession();
  const startDate = selectedDate ? dayjs(selectedDate) : dayjs();

  const { data: busyEvents, isLoading } = trpc.viewer.availability.user.useQuery(
    {
      username: session?.user?.username || "",
      dateFrom: startDate.startOf("day").utc().format(),
      dateTo: startDate
        .endOf("day")
        .add(extraDays - 1, "day")
        .utc()
        .format(),
      withSource: true,
    },
    {
      enabled: !!session?.user?.username,
    }
  );

  const { data: schedule } = useSchedule({
    username: session?.user.username || "",
    eventSlug: event?.slug,
    eventId: event?.id,
    timezone,
    month: startDate.format("YYYY-MM"),
  });

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

  const events = useMemo(() => {
    if (!busyEvents?.busy) return [];

    const calendarEvents = busyEvents?.busy.map((event, idx) => {
      return {
        id: idx,
        title: event.title ?? `Busy`,
        start: new Date(event.start),
        end: new Date(event.end),
        options: {
          borderColor: "#F97417",
          status: BookingStatus.ACCEPTED,
        },
      };
    });

    if (busyEvents.dateOverrides) {
      for (const date in busyEvents.dateOverrides) {
        const dateOverride = busyEvents.dateOverrides[date];
        calendarEvents.push({
          id: calendarEvents.length,
          title: "Date Override",
          start: new Date(dateOverride.start),
          end: new Date(dateOverride.end),
          options: {
            borderColor: "black",
            status: BookingStatus.ACCEPTED,
          },
        });
      }
    }

    return calendarEvents;
  }, [busyEvents]);

  return (
    <div className="h-full [--calendar-dates-sticky-offset:66px]">
      <Calendar
        startHour={0}
        endHour={23}
        events={events}
        availableTimeslots={availableSlots}
        startDate={startDate.toDate()}
        endDate={endDate}
        gridCellsPerHour={60 / (event?.duration || 15)}
        hoverEventDuration={30}
        hideHeader
      />
    </div>
  );
};
