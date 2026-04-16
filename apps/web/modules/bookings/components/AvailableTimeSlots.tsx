import { useCallback, useMemo, useRef } from "react";

import dayjs from "@calcom/dayjs";
import {
  AvailableTimes,
  AvailableTimesSkeleton,
} from "@calcom/web/modules/bookings/components/AvailableTimes";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import type { IUseBookingLoadingStates } from "../hooks/useBookings";
import type { BookerEvent } from "@calcom/features/bookings/types";
import type { Slot } from "~/schedules/lib/types";
import { useNonEmptyScheduleDays } from "@calcom/web/modules/schedules/hooks/useNonEmptyScheduleDays";
import { useSlotsForAvailableDates } from "@calcom/web/modules/schedules/hooks/useSlotsForDate";
import { PUBLIC_INVALIDATE_AVAILABLE_SLOTS_ON_BOOKING_FORM } from "@calcom/lib/constants";
import { localStorage } from "@calcom/lib/webstorage";
import { BookerLayouts } from "@calcom/prisma/zod-utils";
import classNames from "@calcom/ui/classNames";

import { AvailableTimesHeader } from "@calcom/web/modules/bookings/components/AvailableTimesHeader";
import type { useScheduleForEventReturnType } from "@calcom/web/modules/schedules/hooks/useEvent";
import { getQueryParam } from "@calcom/features/bookings/Booker/utils/query-param";
import { getGuestAvailability } from "@calcom/features/bookings/lib/getHostsAndGuests";

type AvailableTimeSlotsProps = {
  extraDays?: number;
  limitHeight?: boolean;
  schedule?: useScheduleForEventReturnType;
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
  confirmStepClassNames?: {
    confirmButton?: string;
  };
  loadingStates: IUseBookingLoadingStates;
  isVerificationCodeSending: boolean;
  renderConfirmNotVerifyEmailButtonCond: boolean;
  onSubmit: (timeSlot?: string) => void;
  skipConfirmStep: boolean;
  shouldRenderCaptcha?: boolean;
  watchedCfToken?: string;
  /**
   * This is the list of time slots that are unavailable to book
   */
  unavailableTimeSlots: string[];
  confirmButtonDisabled?: boolean;
  onAvailableTimeSlotSelect: (time: string) => void;
  hideAvailableTimesHeader?: boolean;
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
  unavailableTimeSlots,
  confirmButtonDisabled,
  confirmStepClassNames,
  onAvailableTimeSlotSelect,
  hideAvailableTimesHeader = false,
  ...props
}: AvailableTimeSlotsProps) => {
  const selectedDate = useBookerStoreContext((state) => state.selectedDate);

  const setSeatedEventData = useBookerStoreContext((state) => state.setSeatedEventData);
  const date = selectedDate || dayjs().format("YYYY-MM-DD");
  const [layout] = useBookerStoreContext((state) => [state.layout]);
  const isColumnView = layout === BookerLayouts.COLUMN_VIEW;
  const containerRef = useRef<HTMLDivElement | null>( null);
  const { setTentativeSelectedTimeslots, tentativeSelectedTimeslots } = useBookerStoreContext((state) => ({
    setTentativeSelectedTimeslots: state.setTentativeSelectedTimeslots,
    tentativeSelectedTimeslots: state.tentativeSelectedTimeslots,
  }));

  const onTentativeTimeSelect = ({
    time,
    attendees: _attendees,
    seatsPerTimeSlot: _seatsPerTimeSlot,
    bookingUid: _bookingUid,
  }: {
    time: string;
    attendees: number;
    seatsPerTimeSlot?: number | null;
    bookingUid?: string;
  }) => {
    // We don't intentionally invalidate schedule here because that could remove the slot itself that was clicked, causing a bad UX.
    // We could start doing that after we fix this behaviour.
    // schedule?.invalidate();

    // Earlier we had multiple tentative slots, but now we can only have one tentative slot.
    setTentativeSelectedTimeslots([time]);
  };

  const scheduleData = schedule?.data;

  const nonEmptyScheduleDays = useNonEmptyScheduleDays(scheduleData?.slots);
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

  const { slotsPerDay, toggleConfirmButton } = useSlotsForAvailableDates(dates, scheduleData?.slots);

  const overlayCalendarToggled =
    getQueryParam("overlayCalendar") === "true" || localStorage.getItem("overlayCalendarSwitchDefault");

  const onTimeSelect = useCallback(
    (time: string, attendees: number, seatsPerTimeSlot?: number | null, bookingUid?: string) => {
      // Temporarily allow disabling it, till we are sure that it doesn't cause any significant load on the system
      if (PUBLIC_INVALIDATE_AVAILABLE_SLOTS_ON_BOOKING_FORM) {
        // Ensures that user has latest available slots when they are about to confirm the booking by filling up the details
        schedule?.invalidate();
      }
      setTentativeSelectedTimeslots([]);
      // note(Lauris): setting setSeatedEventData before setSelectedTimeslot so that in useSlots we have seated event data available
      // and only then we invoke handleReserveSlot that is triggered by the changes in setSelectedTimeslot.
      setSeatedEventData({
        time,
        attendees,
        seatsPerTimeSlot,
        bookingUid,
      });
    },
    [schedule, setSeatedEventData, setTentativeSelectedTimeslots]
  );

  // Get unavailable time slots from guests' availability
  const guestUnavailableSlots = useMemo(async () => {
    const guests = useBookerStoreContext.getState().bookingData?.attendees || [];
    const guestAvailability = await getGuestAvailability(
      guests.map((attendee) => ({
        email: attendee.email,
        name: attendee.name,
        id: undefined, // Will be populated in the actual implementation
      }))
    );
    return Array.from(guestAvailability);
  }, []);

  const combinedUnavailableSlots = useMemo(() => {
    return [...unavailableTimeSlots, ...guestUnavailableSlots];
  }, [unavailableTimeSlots, guestUnavailableSlots]);

  return (
    <div
      className={classNames(
        "flex flex-col gap-2",
        limitHeight ? "max-h-[500px] overflow-y-auto" : "",
        customClassNames?.availableTimeSlotsContainer
      )}
      ref={containerRef}>
      {!hideAvailableTimesHeader && (
        <AvailableTimesHeader
          date={dayjs(date)}
          showTimeFormatToggle={!isColumnView}
          customClassNames={customClassNames}
        />
      )}
      <AvailableTimes
        slots={slotsPerDay}
        showTimeFormatToggle={!isColumnView}
        onTentativeTimeSelect={onTentativeTimeSelect}
        unavailableTimeSlots={combinedUnavailableSlots}
        event={props.event}
        customClassNames={customClassNames?.availableTimes}
        confirmStepClassNames={confirmStepClassNames}
        loadingStates={props.loadingStates}
        isVerificationCodeSending={props.isVerificationCodeSending}
        renderConfirmNotVerifyEmailButtonCond={props.renderConfirmNotVerifyEmailButtonCond}
        skipConfirmStep={props.skipConfirmStep}
        shouldRenderCaptcha={props.shouldRenderCaptcha}
        watchedCfToken={props.watchedCfToken}
        confirmButtonDisabled={confirmButtonDisabled}
      />
    </div>
  );
};