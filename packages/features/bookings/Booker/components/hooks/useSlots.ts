import { useEffect, useRef } from "react";
import { shallow } from "zustand/shallow";

import dayjs from "@calcom/dayjs";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { useSlotReservationId } from "@calcom/features/bookings/Booker/useSlotReservationId";
import { isBookingDryRun } from "@calcom/features/bookings/Booker/utils/isBookingDryRun";
import {
  MINUTES_TO_BOOK,
  PUBLIC_QUERY_RESERVATION_INTERVAL_SECONDS,
  PUBLIC_QUERY_RESERVATION_STALE_TIME_SECONDS,
} from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { trpc } from "@calcom/trpc";
import type { TIsAvailableOutputSchema } from "@calcom/trpc/server/routers/viewer/slots/isAvailable.schema";

import { useIsQuickAvailabilityCheckFeatureEnabled } from "./useIsQuickAvailabilityCheckFeatureEnabled";

export type QuickAvailabilityCheck = TIsAvailableOutputSchema["slots"][number];

const useQuickAvailabilityChecks = ({
  eventTypeId,
  eventDuration,
  timeslotsAsISOString,
  slotReservationId,
}: {
  eventTypeId: number | undefined;
  eventDuration: number;
  timeslotsAsISOString: string[];
  slotReservationId: string | undefined | null;
}) => {
  // Maintain a cache to ensure previous state is maintained as the request is fetched
  // It is important because tentatively selecting a new timeslot will cause a new request which is uncached.
  const cachedQuickAvailabilityChecksRef = useRef<QuickAvailabilityCheck[]>([]);
  const isQuickAvailabilityCheckFeatureEnabled = useIsQuickAvailabilityCheckFeatureEnabled();

  if (!isQuickAvailabilityCheckFeatureEnabled) {
    return cachedQuickAvailabilityChecksRef.current;
  }

  // Create array of slots with their UTC start and end dates
  const slotsToCheck = timeslotsAsISOString.map((slot) => {
    const slotDayjs = dayjs(slot);
    return {
      utcStartIso: slotDayjs.utc().toISOString(),
      utcEndIso: slotDayjs.add(eventDuration, "minutes").utc().toISOString(),
    };
  });

  const isAvailableQuery = trpc.viewer.slots.isAvailable.useQuery(
    {
      slots: slotsToCheck,
      // enabled flag can't be true if eventTypeId is nullish
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      eventTypeId: eventTypeId!,
    },
    {
      refetchInterval: PUBLIC_QUERY_RESERVATION_INTERVAL_SECONDS * 1000,
      refetchOnWindowFocus: true,
      // We must have slotReservationId because it is possible that slotReservationId is set right after isAvailable request is made and we accidentally could consider the slot as unavailable.
      // isAvailable request also prevents querying reserved slots if uid is not set. We are safe from both sides.
      // TODO: We should move to creating uuid client side for reservation and not waiting for server to set uid cookie.
      enabled: !!(eventTypeId && timeslotsAsISOString.length > 0 && slotReservationId),
      staleTime: PUBLIC_QUERY_RESERVATION_STALE_TIME_SECONDS * 1000,
    }
  );

  const quickAvailabilityChecks = isAvailableQuery.data?.slots;

  // Only valid slots response should override the cache. In worst case, we let the actual booking flow(book/event call) decide whether to go ahead with the booking or not.
  if (quickAvailabilityChecks && quickAvailabilityChecks.length > 0) {
    cachedQuickAvailabilityChecksRef.current = quickAvailabilityChecks;
  }

  return quickAvailabilityChecks || cachedQuickAvailabilityChecksRef.current;
};

export type UseSlotsReturnType = ReturnType<typeof useSlots>;

export const useSlots = (event: { id: number; length: number } | null) => {
  const selectedDuration = useBookerStoreContext((state) => state.selectedDuration);
  const searchParams = useCompatSearchParams();
  const [selectedTimeslot, setSelectedTimeslot, tentativeSelectedTimeslots, setTentativeSelectedTimeslots] =
    useBookerStoreContext(
      (state) => [
        state.selectedTimeslot,
        state.setSelectedTimeslot,
        state.tentativeSelectedTimeslots,
        state.setTentativeSelectedTimeslots,
      ],
      shallow
    );
  const [slotReservationId, setSlotReservationId] = useSlotReservationId();
  const reserveSlotMutation = trpc.viewer.slots.reserveSlot.useMutation({
    trpc: {
      context: {
        skipBatch: true,
      },
    },
    onSuccess: (data) => {
      setSlotReservationId(data.uid);
    },
  });
  const removeSelectedSlot = trpc.viewer.slots.removeSelectedSlotMark.useMutation({
    trpc: { context: { skipBatch: true } },
  });

  const handleRemoveSlot = () => {
    if (event?.id && slotReservationId) {
      removeSelectedSlot.mutate({ uid: slotReservationId });
    }
  };

  const eventTypeId = event?.id;
  const eventDuration = selectedDuration || event?.length || 0;
  const allSelectedTimeslots = [...tentativeSelectedTimeslots, selectedTimeslot].filter(
    (slot): slot is string => slot !== null
  );

  const allUniqueSelectedTimeslots = Array.from(new Set(allSelectedTimeslots));

  const quickAvailabilityChecks = useQuickAvailabilityChecks({
    eventTypeId,
    eventDuration,
    timeslotsAsISOString: allUniqueSelectedTimeslots,
    slotReservationId,
  });

  // In case of skipConfirm flow selectedTimeslot would never be set and instead we could have multiple tentatively selected timeslots, so we pick the latest one from it.
  const timeSlotToBeBooked = selectedTimeslot ?? allSelectedTimeslots.at(-1);

  const handleReserveSlot = () => {
    if (eventTypeId && timeSlotToBeBooked && eventDuration) {
      reserveSlotMutation.mutate({
        slotUtcStartDate: dayjs(timeSlotToBeBooked).utc().toISOString(),
        eventTypeId,
        slotUtcEndDate: dayjs(timeSlotToBeBooked).utc().add(eventDuration, "minutes").toISOString(),
        _isDryRun: isBookingDryRun(searchParams),
      });
    }
  };

  useEffect(() => {
    handleReserveSlot();

    const interval = setInterval(() => {
      handleReserveSlot();
    }, parseInt(MINUTES_TO_BOOK) * 60 * 1000 - 2000);

    return () => {
      handleRemoveSlot();
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id, timeSlotToBeBooked]);

  return {
    setSelectedTimeslot,
    setTentativeSelectedTimeslots,
    selectedTimeslot,
    tentativeSelectedTimeslots,
    slotReservationId,
    allSelectedTimeslots,
    /**
     * Faster but not that accurate as getSchedule, but doesn't give false positive, so it is usable
     */
    quickAvailabilityChecks,
  };
};
