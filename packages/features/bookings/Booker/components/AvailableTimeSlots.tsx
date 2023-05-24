import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { AvailableTimes, AvailableTimesSkeleton } from "@calcom/features/bookings";
import { useSlotsForMultipleDates } from "@calcom/features/schedules/lib/use-schedule/useSlotsForDate";
import { classNames } from "@calcom/lib";
import { trpc } from "@calcom/trpc";

import { useBookerStore } from "../store";
import { useEvent, useScheduleForEvent } from "../utils/event";

type AvailableTimeSlotsProps = {
  extraDays?: number;
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
export const AvailableTimeSlots = ({ extraDays, limitHeight, seatsPerTimeslot }: AvailableTimeSlotsProps) => {
  const reserveSlotMutation = trpc.viewer.public.slots.reserveSlot.useMutation();
  const selectedDate = useBookerStore((state) => state.selectedDate);
  const duration = useBookerStore((state) => state.selectedDuration);
  const setSelectedTimeslot = useBookerStore((state) => state.setSelectedTimeslot);
  const event = useEvent();
  const date = selectedDate || dayjs().format("YYYY-MM-DD");

  const onTimeSelect = (time: string) => {
    setSelectedTimeslot(time);

    if (!event.data) return;
    reserveSlotMutation.mutate({
      slotUtcStartDate: time,
      eventTypeId: event.data.id,
      slotUtcEndDate: dayjs(time)
        .utc()
        .add(duration || event.data.length, "minutes")
        .format(),
    });
  };

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

  const isMultipleDates = dates.length > 1;
  const slotsPerDay = useSlotsForMultipleDates(dates, schedule?.data?.slots);

  return (
    <div
      className={classNames(
        limitHeight && "flex-grow md:h-[400px]",
        !limitHeight && "flex w-full flex-row gap-4"
      )}>
      {schedule.isLoading
        ? // Shows exact amount of days as skeleton.
          Array.from({ length: 1 + (extraDays ?? 0) }).map((_, i) => <AvailableTimesSkeleton key={i} />)
        : slotsPerDay.length > 0 &&
          slotsPerDay.map((slots) => (
            <AvailableTimes
              className="w-full"
              key={slots.date}
              showTimeformatToggle={!isMultipleDates}
              onTimeSelect={onTimeSelect}
              date={dayjs(slots.date)}
              slots={slots.slots}
              seatsPerTimeslot={seatsPerTimeslot}
            />
          ))}
    </div>
  );
};
