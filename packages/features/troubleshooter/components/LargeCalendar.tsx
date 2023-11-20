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
  const calendarToColorMap = useTroubleshooterStore((state) => state.calendarToColorMap);
  const { data: session } = useSession();
  const startDate = selectedDate ? dayjs(selectedDate) : dayjs();

  const { data: busyEvents } = trpc.viewer.availability.user.useQuery(
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

    // TODO: Add buffer times in here as well just requires a bit of logic for fetching event type and then adding buffer time
    //   start: dayjs(startTime)
    //   .subtract((eventType?.beforeEventBuffer || 0) + (afterEventBuffer || 0), "minute")
    //   .toDate(),
    // end: dayjs(endTime)
    //   .add((eventType?.afterEventBuffer || 0) + (beforeEventBuffer || 0), "minute")
    //   .toDate(),

    const calendarEvents = busyEvents?.busy.map((event, idx) => {
      return {
        id: idx,
        title: event.title ?? `Busy`,
        start: new Date(event.start),
        end: new Date(event.end),
        options: {
          borderColor:
            event.source && calendarToColorMap[event.source] ? calendarToColorMap[event.source] : "black",
          status: BookingStatus.ACCEPTED,
          "data-test-id": "troubleshooter-busy-event",
        },
      };
    });

    if (busyEvents.dateOverrides) {
      busyEvents.dateOverrides.forEach((dateOverride) => {
        const dateOverrideStart = dayjs(dateOverride.start);
        const dateOverrideEnd = dayjs(dateOverride.end);

        if (!dateOverrideStart.isSame(dateOverrideEnd)) {
          return;
        }

        const dayOfWeekNum = dateOverrideStart.day();

        const workingHoursForDay = busyEvents.workingHours.find((workingHours) =>
          workingHours.days.includes(dayOfWeekNum)
        );

        if (!workingHoursForDay) return;

        calendarEvents.push({
          id: calendarEvents.length,
          title: "Date Override",
          start: dateOverrideStart.add(workingHoursForDay.startTime, "minutes").toDate(),
          end: dateOverrideEnd.add(workingHoursForDay.endTime, "minutes").toDate(),
          options: {
            borderColor: "black",
            status: BookingStatus.ACCEPTED,
            "data-test-id": "troubleshooter-busy-time",
          },
        });
      });
    }
    return calendarEvents;
  }, [busyEvents, calendarToColorMap]);

  return (
    <div className="h-full [--calendar-dates-sticky-offset:66px]">
      <Calendar
        sortEvents
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
