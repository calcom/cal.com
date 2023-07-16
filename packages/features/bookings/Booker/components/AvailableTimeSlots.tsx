import { useMemo, useRef, useEffect } from "react";
import { shallow } from "zustand/shallow";

import dayjs from "@calcom/dayjs";
import { AvailableTimes, AvailableTimesSkeleton } from "@calcom/features/bookings";
import { useSlotsForMultipleDates } from "@calcom/features/schedules/lib/use-schedule/useSlotsForDate";
import { classNames } from "@calcom/lib";

import { useBookerStore } from "../store";
import { useEvent, useScheduleForEvent } from "../utils/event";

type AvailableTimeSlotsProps = {
  extraDays?: number;
  limitHeight?: boolean;
  seatsPerTimeslot?: number | null;
  eventSlug?: string;
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
  limitHeight,
  seatsPerTimeslot,
  eventSlug,
}: AvailableTimeSlotsProps) => {
  const event = useEvent();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [
    selectedDate,
    selectedDatesAndTimes,
    setSelectedDatesAndTimes,
    setSelectedTimeslot,
    setSeatedEventData,
  ] = useBookerStore(
    (state) => [
      state.selectedDate,
      state.selectedDatesAndTimes,
      state.setSelectedDatesAndTimes,
      state.setSelectedTimeslot,
      state.setSeatedEventData,
    ],
    shallow
  );

  const date = selectedDate || dayjs().format("YYYY-MM-DD");

  const onTimeSelect = (
    time: string,
    attendees: number,
    seatsPerTimeSlot?: number | null,
    bookingUid?: string
  ) => {
    // Used for selecting multiple time slots and assigning the selected values to a date
    if (eventSlug) {
      if (selectedDatesAndTimes && selectedDatesAndTimes[eventSlug]) {
        const selectedDatesAndTimesForEvent = selectedDatesAndTimes[eventSlug];
        const selectedSlots = selectedDatesAndTimesForEvent[selectedDate as string] ?? [];
        if (selectedSlots?.includes(time)) {
          // Checks whether a user has removed all their timeSlots and thus removes it from the selectedDatesAndTimesForEvent state
          if (selectedSlots?.length > 1) {
            const updatedDatesAndTimes = {
              ...selectedDatesAndTimes,
              [eventSlug]: {
                ...selectedDatesAndTimesForEvent,
                [selectedDate as string]: selectedSlots?.filter((slot: string) => slot !== time),
              },
            };

            setSelectedDatesAndTimes(updatedDatesAndTimes);
          } else {
            const updatedDatesAndTimesForEvent = { ...selectedDatesAndTimesForEvent };
            delete updatedDatesAndTimesForEvent[selectedDate as string];
            setSelectedTimeslot(null);
            setSelectedDatesAndTimes({ ...selectedDatesAndTimes, [eventSlug]: updatedDatesAndTimesForEvent });
          }
          return;
        }

        const updatedDatesAndTimes = {
          ...selectedDatesAndTimes,
          [eventSlug]: {
            ...selectedDatesAndTimesForEvent,
            [selectedDate as string]: [...selectedSlots, time],
          },
        };

        setSelectedDatesAndTimes(updatedDatesAndTimes);
      } else if (!selectedDatesAndTimes) {
        setSelectedDatesAndTimes({ [eventSlug]: { [selectedDate as string]: [time] } });
      } else {
        setSelectedDatesAndTimes({
          ...selectedDatesAndTimes,
          [eventSlug]: { [selectedDate as string]: [time] },
        });
      }
    }

    setSelectedTimeslot(time);

    if (seatsPerTimeSlot) {
      setSeatedEventData({
        seatsPerTimeSlot,
        attendees,
        bookingUid,
      });

      if (seatsPerTimeSlot && seatsPerTimeSlot - attendees > 1) {
        return;
      }
    }

    if (!event.data) return;
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

  useEffect(() => {
    if (containerRef.current && !schedule.isLoading) {
      containerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [containerRef, schedule.isLoading]);

  return (
    <div
      ref={containerRef}
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
              date={dayjs(slots.date)}
              slots={slots.slots}
              seatsPerTimeSlot={seatsPerTimeslot}
              selectedSlots={
                eventSlug &&
                selectedDatesAndTimes &&
                selectedDatesAndTimes[eventSlug] &&
                selectedDatesAndTimes[eventSlug][selectedDate as string]
                  ? selectedDatesAndTimes[eventSlug][selectedDate as string]
                  : undefined
              }
              onTimeSelect={onTimeSelect}
              showTimeFormatToggle={!isMultipleDates}
            />
          ))}
    </div>
  );
};
