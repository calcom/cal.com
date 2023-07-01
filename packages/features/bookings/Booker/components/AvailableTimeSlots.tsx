import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { AvailableTimes, AvailableTimesSkeleton } from "@calcom/features/bookings";
import { useSlotsForAvailableDates } from "@calcom/features/schedules/lib/use-schedule/useSlotsForDate";
import { classNames } from "@calcom/lib";
import { trpc } from "@calcom/trpc";

import { useBookerStore } from "../store";
import { useEvent, useScheduleForEvent } from "../utils/event";
import { useNonEmptyScheduleDays } from "@calcom/features/schedules";
import { BookerLayouts } from "@calcom/prisma/zod-utils";

type AvailableTimeSlotsProps = {
  extraDays?: number;
  limitHeight?: boolean;
  seatsPerTimeslot?: number | null;
  sliceFrom:number;
  sliceTo?:number;
  prefetchNextMonth: boolean;
  monthCount: number | undefined;
};

/**
 * Renders available time slots for a given date.
 * It will extract the date from the booker store.
 * Next to that you can also pass in the `extraDays` prop, this
 * will also fetch the next `extraDays` days and show multiple days
 * in columns next to each other.
 */
export const AvailableTimeSlots = ({ extraDays, limitHeight, seatsPerTimeslot, sliceFrom, sliceTo, prefetchNextMonth, monthCount}: AvailableTimeSlotsProps) => {
  const reserveSlotMutation = trpc.viewer.public.slots.reserveSlot.useMutation();
  const selectedDate = useBookerStore((state) => state.selectedDate);
  const setSelectedTimeslot = useBookerStore((state) => state.setSelectedTimeslot);
  const event = useEvent();
  const date = selectedDate || dayjs().format("YYYY-MM-DD");
  const [layout] = useBookerStore((state) => [state.layout]);
  const isColumnView = layout === BookerLayouts.COLUMN_VIEW;

  const onTimeSelect = (time: string) => {
    setSelectedTimeslot(time);

    if (!event.data) return;
  };

  const schedule = useScheduleForEvent({
    prefetchNextMonth,
    monthCount,
  });
  const nonEmptyScheduleDays = useNonEmptyScheduleDays(schedule?.data?.slots);

  // Creates an array of dates to fetch slots for.
  // If `extraDays` is passed in, we will extend the array with the next `extraDays` days.
  const dates = useMemo(
    () =>
      !extraDays
        ? [date]
        : nonEmptyScheduleDays.length > 0 
          ? nonEmptyScheduleDays.slice(sliceFrom, sliceTo)
          :[],
    [date, extraDays]
  );
  
  const monthViewSlots = schedule?.data?.slots  && nonEmptyScheduleDays.includes(date) ? Object.values(schedule.data.slots).slice(nonEmptyScheduleDays.indexOf(date), nonEmptyScheduleDays.indexOf(date) + 1) : [];
  const slotsPerDay = schedule?.data?.slots 
    ? useSlotsForAvailableDates(dates, isColumnView 
      ? Object.values(schedule.data.slots).slice(sliceFrom, sliceTo) 
      : monthViewSlots ) 
    : useSlotsForAvailableDates(dates, []);
  
  return (
    <div
      className={classNames(
        limitHeight && "flex-grow md:h-[400px]",
        !limitHeight && "flex h-full w-full flex-row gap-4"
      )}>
      {schedule.isLoading
        ? // Shows exact amount of days as skeleton.
          Array.from({ length: 1 + (extraDays ?? 0) }).map((_, i) => <AvailableTimesSkeleton key={i} />)
        : slotsPerDay.length > 0 &&
          slotsPerDay.map((slots) => (
            <AvailableTimes
              className="w-full"
              key={slots.date}
              showTimeformatToggle={!isColumnView}
              onTimeSelect={onTimeSelect}
              date={dayjs(slots.date)}
              slots={slots.slots}
              seatsPerTimeslot={seatsPerTimeslot}
              availableMonth={dayjs(selectedDate).format("MM")!==dayjs(slots.date).format("MM")?dayjs(slots.date).format("MMM"):undefined}
            />
          ))}
    </div>
  );
};

