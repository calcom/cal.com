import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { AvailableTimes, AvailableTimesSkeleton } from "@calcom/features/bookings";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { useSlotsForMultipleDates } from "@calcom/features/schedules/lib/use-schedule/useSlotsForDate";
import { classNames } from "@calcom/lib";

import { useBookerStore } from "../store";
import { useScheduleForEvent } from "../utils/event";

type AvailableTimeSlotsProps = {
  extraDays?: number;
  onTimeSelect: (time: string) => void;
  limitHeight?: boolean;
  seatsPerTimeslot?: number | null;
};

/**
 * Renders available time slots for a given date.
 * It will extract the date from the booker store.
 * Next to that you can also pass in the `extraDays` prop, this
 * will also fetch the next `extraDays` days and show multiple days
 * in columns next to each other.
 */
export const AvailableTimeSlots = ({
  extraDays,
  onTimeSelect,
  limitHeight,
  seatsPerTimeslot,
}: AvailableTimeSlotsProps) => {
  const selectedDate = useBookerStore((state) => state.selectedDate);
  const date = selectedDate || dayjs().format("YYYY-MM-DD");
  const { timezone } = useTimePreferences();

  const schedule = useScheduleForEvent({
    prefetchNextMonth: !!extraDays && dayjs(date).month() !== dayjs(date).add(extraDays, "day").month(),
  });

  // Creates an array of dates to fetch slots for.
  // If `extraDays` is passed in, we will extend the array with the next `extraDays` days.
  const dates = useMemo(
    () =>
      !extraDays
        ? [date]
        : [
            // If NO date is selected yet, we show by default the upcomming `nextDays` days.
            date,
            ...Array.from({ length: extraDays }).map((_, index) =>
              dayjs(date)
                .add(index + 1, "day")
                .format("YYYY-MM-DD")
            ),
          ],
    [date, extraDays]
  );

  const slotsPerDay = useSlotsForMultipleDates(dates, schedule?.data?.slots);

  return (
    <div
      className={classNames(
        limitHeight && "flex-grow md:h-[400px]",
        !limitHeight && "flex w-full flex-row gap-4 [&_header]:top-8"
      )}>
      {schedule.isLoading
        ? // Shows exact amount of days as skeleton.
          Array.from({ length: 1 + (extraDays ?? 0) }).map((_, i) => <AvailableTimesSkeleton key={i} />)
        : slotsPerDay.length > 0 &&
          slotsPerDay.map((slots) => (
            <AvailableTimes
              key={slots.date}
              onTimeSelect={onTimeSelect}
              date={dayjs(slots.date)}
              slots={slots.slots}
              timezone={timezone}
              seatsPerTimeslot={seatsPerTimeslot}
            />
          ))}
    </div>
  );
};
