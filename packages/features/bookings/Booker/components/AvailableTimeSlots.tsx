import { useCallback, useMemo, useRef } from "react";

import dayjs from "@calcom/dayjs";
import { AvailableTimes, AvailableTimesSkeleton } from "@calcom/features/bookings";
import type { IUseBookingLoadingStates } from "@calcom/features/bookings/Booker/components/hooks/useBookings";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { useNonEmptyScheduleDays } from "@calcom/features/schedules";
import type { Slot } from "@calcom/features/schedules";
import { useSlotsForAvailableDates } from "@calcom/features/schedules/lib/use-schedule/useSlotsForDate";
import { classNames } from "@calcom/lib";
import { BookerLayouts } from "@calcom/prisma/zod-utils";

import { AvailableTimesHeader } from "../../components/AvailableTimesHeader";
import { useBookerStore } from "../store";
import type { useScheduleForEventReturnType } from "../utils/event";
import { getQueryParam } from "../utils/query-param";

type AvailableTimeSlotsProps = {
  extraDays?: number;
  limitHeight?: boolean;
  schedule?: useScheduleForEventReturnType["data"];
  isLoading: boolean;
  seatsPerTimeSlot?: number | null;
  showAvailableSeatsCount?: boolean | null;
  event: {
    data?: Pick<BookerEvent, "length" | "bookingFields" | "price" | "currency" | "metadata"> | null;
  };
  customClassNames?: {
    availableTimeSlotsContainer?: string;
    availableTimeSlotsTitle?: string;
    availableTimeSlotsHeaderContainer?: string;
    availableTimeSlotsTimeFormatToggle?: string;
    availableTimes?: string;
  };
  loadingStates: IUseBookingLoadingStates;
  isVerificationCodeSending: boolean;
  renderConfirmNotVerifyEmailButtonCond: boolean;
  onSubmit: (timeSlot?: string) => void;
  skipConfirmStep: boolean;
  shouldRenderCaptcha?: boolean;
  watchedCfToken?: string;
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
  showAvailableSeatsCount,
  schedule,
  isLoading,
  customClassNames,
  skipConfirmStep,
  seatsPerTimeSlot,
  onSubmit,
  ...props
}: AvailableTimeSlotsProps) => {
  const selectedDate = useBookerStore((state) => state.selectedDate);

  const setSelectedTimeslot = useBookerStore((state) => state.setSelectedTimeslot);
  const setSeatedEventData = useBookerStore((state) => state.setSeatedEventData);
  const date = selectedDate || dayjs().format("YYYY-MM-DD");
  const [layout] = useBookerStore((state) => [state.layout]);
  const isColumnView = layout === BookerLayouts.COLUMN_VIEW;
  const containerRef = useRef<HTMLDivElement | null>(null);

  const nonEmptyScheduleDays = useNonEmptyScheduleDays(schedule?.slots);
  const nonEmptyScheduleDaysFromSelectedDate = nonEmptyScheduleDays.filter(
    (slot) => dayjs(selectedDate).diff(slot, "day") <= 0
  );

  // Creates an array of dates to fetch slots for.
  // If `extraDays` is passed in, we will extend the array with the next `extraDays` days.
  const dates = useMemo(() => {
    if (!extraDays) return [date];
    if (nonEmptyScheduleDaysFromSelectedDate.length > 0) {
      return nonEmptyScheduleDaysFromSelectedDate.slice(0, extraDays);
    }
    return [];
  }, [date, extraDays, nonEmptyScheduleDaysFromSelectedDate]);

  const { slotsPerDay, toggleConfirmButton } = useSlotsForAvailableDates(dates, schedule?.slots);

  const overlayCalendarToggled =
    getQueryParam("overlayCalendar") === "true" || localStorage.getItem("overlayCalendarSwitchDefault");

  const onTimeSelect = useCallback(
    (time: string, attendees: number, seatsPerTimeSlot?: number | null, bookingUid?: string) => {
      setSelectedTimeslot(time);
      if (seatsPerTimeSlot) {
        setSeatedEventData({
          seatsPerTimeSlot,
          attendees,
          bookingUid,
          showAvailableSeatsCount,
        });
      }
      if (skipConfirmStep) {
        onSubmit(time);
      }
      return;
    },
    [onSubmit, setSeatedEventData, setSelectedTimeslot, skipConfirmStep, showAvailableSeatsCount]
  );

  const handleSlotClick = useCallback(
    (selectedSlot: Slot, isOverlapping: boolean) => {
      if ((overlayCalendarToggled && isOverlapping) || skipConfirmStep) {
        toggleConfirmButton(selectedSlot);
      } else {
        onTimeSelect(
          selectedSlot.time,
          selectedSlot?.attendees || 0,
          seatsPerTimeSlot,
          selectedSlot.bookingUid
        );
      }
    },
    [overlayCalendarToggled, onTimeSelect, seatsPerTimeSlot, skipConfirmStep, toggleConfirmButton]
  );

  return (
    <>
      <div className={classNames(`flex`, `${customClassNames?.availableTimeSlotsContainer}`)}>
        {isLoading ? (
          <div className="mb-3 h-8" />
        ) : (
          slotsPerDay.length > 0 &&
          slotsPerDay.map((slots) => (
            <AvailableTimesHeader
              customClassNames={{
                availableTimeSlotsHeaderContainer: customClassNames?.availableTimeSlotsHeaderContainer,
                availableTimeSlotsTitle: customClassNames?.availableTimeSlotsTitle,
                availableTimeSlotsTimeFormatToggle: customClassNames?.availableTimeSlotsTimeFormatToggle,
              }}
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
          !limitHeight && "flex h-full w-full flex-row gap-4",
          `${customClassNames?.availableTimeSlotsContainer}`
        )}>
        {isLoading && // Shows exact amount of days as skeleton.
          Array.from({ length: 1 + (extraDays ?? 0) }).map((_, i) => <AvailableTimesSkeleton key={i} />)}
        {!isLoading &&
          slotsPerDay.length > 0 &&
          slotsPerDay.map((slots) => (
            <div key={slots.date} className="scroll-bar h-full w-full overflow-y-auto overflow-x-hidden">
              <AvailableTimes
                className={customClassNames?.availableTimeSlotsContainer}
                customClassNames={customClassNames?.availableTimes}
                showTimeFormatToggle={!isColumnView}
                onTimeSelect={onTimeSelect}
                slots={slots.slots}
                showAvailableSeatsCount={showAvailableSeatsCount}
                skipConfirmStep={skipConfirmStep}
                seatsPerTimeSlot={seatsPerTimeSlot}
                handleSlotClick={handleSlotClick}
                {...props}
              />
            </div>
          ))}
      </div>
    </>
  );
};
