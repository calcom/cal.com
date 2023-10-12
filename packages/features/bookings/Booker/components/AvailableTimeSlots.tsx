import { useRef, useEffect } from "react";

import dayjs from "@calcom/dayjs";
import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { AvailableTimes, AvailableTimesSkeleton } from "@calcom/features/bookings";
import { useNonEmptyScheduleDays } from "@calcom/features/schedules";
import { useSlotsForAvailableDates } from "@calcom/features/schedules/lib/use-schedule/useSlotsForDate";
import { classNames } from "@calcom/lib";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { BookerLayouts } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc";

import { AvailableTimesHeader } from "../../components/AvailableTimesHeader";
import { useBookerStore } from "../store";
import { useEvent, useScheduleForEvent } from "../utils/event";

type AvailableTimeSlotsProps = {
  extraDays?: number;
  limitHeight?: boolean;
  prefetchNextMonth: boolean;
  monthCount: number | undefined;
  seatsPerTimeSlot?: number | null;
  showAvailableSeatsCount?: boolean | null;
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
  seatsPerTimeSlot,
  showAvailableSeatsCount,
  prefetchNextMonth,
  monthCount,
}: AvailableTimeSlotsProps) => {
  const reserveSlotMutation = trpc.viewer.public.slots.reserveSlot.useMutation();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const selectedDate = useBookerStore((state) => state.selectedDate);
  const setSelectedTimeslot = useBookerStore((state) => state.setSelectedTimeslot);
  const setSeatedEventData = useBookerStore((state) => state.setSeatedEventData);
  const isEmbed = useIsEmbed();
  const event = useEvent();
  const date = selectedDate || dayjs().format("YYYY-MM-DD");
  const [layout] = useBookerStore((state) => [state.layout]);
  const isColumnView = layout === BookerLayouts.COLUMN_VIEW;
  const containerRef = useRef<HTMLDivElement | null>(null);

  const onTimeSelect = (
    time: string,
    attendees: number,
    seatsPerTimeSlot?: number | null,
    bookingUid?: string
  ) => {
    setSelectedTimeslot(time);

    if (seatsPerTimeSlot) {
      setSeatedEventData({
        seatsPerTimeSlot,
        attendees,
        bookingUid,
        showAvailableSeatsCount,
      });

      if (seatsPerTimeSlot && seatsPerTimeSlot - attendees > 1) {
        return;
      }
    }

    if (!event.data) return;
  };

  const schedule = useScheduleForEvent({
    prefetchNextMonth,
    monthCount,
  });
  const nonEmptyScheduleDays = useNonEmptyScheduleDays(schedule?.data?.slots);
  const nonEmptyScheduleDaysFromSelectedDate = nonEmptyScheduleDays.filter(
    (slot) => dayjs(selectedDate).diff(slot, "day") <= 0
  );

  // Creates an array of dates to fetch slots for.
  // If `extraDays` is passed in, we will extend the array with the next `extraDays` days.
  const dates = !extraDays
    ? [date]
    : nonEmptyScheduleDaysFromSelectedDate.length > 0
    ? nonEmptyScheduleDaysFromSelectedDate.slice(0, extraDays)
    : [];

  const slotsPerDay = useSlotsForAvailableDates(dates, schedule?.data?.slots);

  useEffect(() => {
    if (isEmbed) return;
    if (containerRef.current && !schedule.isLoading && isMobile) {
      containerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [containerRef, schedule.isLoading, isEmbed, isMobile]);

  return (
    <>
      <div className="flex">
        {schedule.isLoading ? (
          <div className="mb-3 h-8" />
        ) : (
          slotsPerDay.length > 0 &&
          slotsPerDay.map((slots) => (
            <AvailableTimesHeader
              key={slots.date}
              date={dayjs(slots.date)}
              showTimeFormatToggle={!isColumnView}
              availableMonth={
                dayjs(selectedDate).format("MM") !== dayjs(slots.date).format("MM")
                  ? dayjs(slots.date).format("MMM")
                  : undefined
              }
            />
          ))
        )}
      </div>
      <div
        ref={containerRef}
        className={classNames(
          limitHeight && "scroll-bar flex-grow overflow-auto md:h-[400px]",
          !limitHeight && "flex h-full w-full flex-row gap-4"
        )}>
        {schedule.isLoading
          ? // Shows exact amount of days as skeleton.
            Array.from({ length: 1 + (extraDays ?? 0) }).map((_, i) => <AvailableTimesSkeleton key={i} />)
          : slotsPerDay.length > 0 &&
            slotsPerDay.map((slots) => (
              <AvailableTimes
                className="scroll-bar w-full overflow-y-auto overflow-x-hidden"
                key={slots.date}
                showTimeFormatToggle={!isColumnView}
                onTimeSelect={onTimeSelect}
                slots={slots.slots}
                seatsPerTimeSlot={seatsPerTimeSlot}
                showAvailableSeatsCount={showAvailableSeatsCount}
              />
            ))}
      </div>
    </>
  );
};
