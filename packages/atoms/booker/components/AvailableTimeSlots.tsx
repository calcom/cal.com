import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { AvailableTimes } from "@calcom/features/bookings";
import { useSchedule } from "@calcom/features/schedules";
import { useSlotsForMultipleDates } from "@calcom/features/schedules/lib/use-schedule/useSlotsForDate";
import { classNames } from "@calcom/lib";

import { useBookerStore } from "../store";
import { useTimePrerences } from "../utils/time";

type AvailableTimeSlotsProps = {
  extraDays?: number;
  onTimeSelect: (time: string) => void;
  limitHeight?: boolean;
};

export const AvailableTimeSlots = ({ extraDays, onTimeSelect, limitHeight }: AvailableTimeSlotsProps) => {
  const [selectedDate, username, eventSlug, eventId, month] = useBookerStore((state) => [
    state.selectedDate,
    state.username,
    state.eventSlug,
    state.eventId,
    state.month,
  ]);
  const { timezone } = useTimePrerences();
  const schedule = useSchedule({
    username,
    eventSlug,
    eventId,
    browsingMonth: month,
    timezone,
    // @TODO: Fix types
  } as { username: string; eventSlug: string; browsingMonth: Date; timezone: string });

  // Creates an array of dates to fetch slots for.
  // If `extraDays` is passed in, we will extend the array with the next `extraDays` days.
  const dates = useMemo(
    () =>
      !extraDays
        ? [selectedDate]
        : [
            // If NO date is selected yet, we show by default the upcomming `nextDays` days.
            selectedDate || dayjs().format("YYYY-MM-DD"),
            ...Array.from({ length: extraDays }).map((_, index) =>
              dayjs(selectedDate || new Date())
                .add(index + 1, "day")
                .format("YYYY-MM-DD")
            ),
          ],
    [selectedDate, extraDays]
  );

  const slotsPerDay = useSlotsForMultipleDates(dates, schedule?.data?.slots);

  /* @TODO: Weekstart day */
  /* @TODO: recurring event count */
  /* @TODO: eth signature */
  /* @TODO: seats per timeslot */
  return (
    <div
      className={classNames(
        limitHeight && "flex-grow md:h-[400px]",
        !limitHeight && "flex flex-row gap-4 [&_header]:top-8"
      )}>
      {slotsPerDay.length > 0 &&
        slotsPerDay.map((slots) => (
          <AvailableTimes
            key={slots.date}
            onTimeSelect={onTimeSelect}
            date={dayjs(slots.date)}
            slots={slots.slots}
            timezone={timezone}
          />
        ))}
    </div>
  );
};
