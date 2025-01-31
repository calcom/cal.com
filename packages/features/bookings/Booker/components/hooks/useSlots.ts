import { useEffect, useRef } from "react";
import { shallow } from "zustand/shallow";

import dayjs from "@calcom/dayjs";
import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import { useSlotReservationId } from "@calcom/features/bookings/Booker/useSlotReservationId";
import type { BookerEvent } from "@calcom/features/bookings/types";
import {
  MINUTES_TO_BOOK,
  PUBLIC_QUERY_RESERVATION_INTERVAL_SECONDS,
  PUBLIC_QUERY_RESERVATION_STALE_TIME_SECONDS,
} from "@calcom/lib/constants";
import { trpc } from "@calcom/trpc";

export type SlotQuickCheckStatus = "available" | "reserved";

export type QuickAvailabilityCheck = {
  utcStartIso: string;
  utcEndIso: string;
  status: SlotQuickCheckStatus;
};

const useQuickAvailabilityChecks = ({
  eventTypeId,
  eventDuration,
  timeslotsAsISOString,
}: {
  eventTypeId: number | undefined;
  eventDuration: number;
  timeslotsAsISOString: string[];
}) => {
  // Maintain a cache to ensure previous state is maintained as the request is fetched
  // It is important because tentatively selecting a new timeslot will cause a new request which is uncached.
  const cachedQuickAvailabilityChecksRef = useRef<QuickAvailabilityCheck[]>([]);

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
      enabled: !!(eventTypeId && timeslotsAsISOString.length > 0),
      staleTime: PUBLIC_QUERY_RESERVATION_STALE_TIME_SECONDS * 1000,
    }
  );

  const quickAvailabilityChecks = isAvailableQuery.data?.slots;
  if (quickAvailabilityChecks && quickAvailabilityChecks.length > 0) {
    cachedQuickAvailabilityChecksRef.current = quickAvailabilityChecks;
  }

  return quickAvailabilityChecks || cachedQuickAvailabilityChecksRef.current;
};

export type UseSlotsReturnType = ReturnType<typeof useSlots>;

export const useSlots = (event: { data?: Pick<BookerEvent, "id" | "length"> | null }) => {
  const selectedDuration = useBookerStore((state) => state.selectedDuration);

  const [selectedTimeslot, setSelectedTimeslot, tentativeSelectedTimeslots, setTentativeSelectedTimeslots] =
    useBookerStore(
      (state) => [
        state.selectedTimeslot,
        state.setSelectedTimeslot,
        state.tentativeSelectedTimeslots,
        state.setTentativeSelectedTimeslots,
      ],
      shallow
    );
  const [slotReservationId, setSlotReservationId] = useSlotReservationId();
  const reserveSlotMutation = trpc.viewer.public.slots.reserveSlot.useMutation({
    trpc: {
      context: {
        skipBatch: true,
      },
    },
    onSuccess: (data) => {
      setSlotReservationId(data.uid);
    },
  });
  const removeSelectedSlot = trpc.viewer.public.slots.removeSelectedSlotMark.useMutation({
    trpc: { context: { skipBatch: true } },
  });

  const handleRemoveSlot = () => {
    if (event?.data) {
      removeSelectedSlot.mutate({ uid: slotReservationId });
    }
  };

  const eventTypeId = event.data?.id;
  const eventDuration = selectedDuration || event.data?.length || 0;
  const allSelectedTimeslots = [...tentativeSelectedTimeslots, selectedTimeslot].filter(
    (slot): slot is string => slot !== null
  );

  const allUniqueSelectedTimeslots = Array.from(new Set(allSelectedTimeslots));

  const quickAvailabilityChecks = useQuickAvailabilityChecks({
    eventTypeId,
    eventDuration,
    timeslotsAsISOString: allUniqueSelectedTimeslots,
  });

  // In case of skipConfirm flow selectedTimeslot would never be set and instead we could have multiple tentatively selected timeslots, so we pick the latest one from it.
  const timeSlotToBeBooked = selectedTimeslot ?? allSelectedTimeslots.at(-1);

  const handleReserveSlot = () => {
    if (eventTypeId && timeSlotToBeBooked && eventDuration) {
      reserveSlotMutation.mutate({
        slotUtcStartDate: dayjs(timeSlotToBeBooked).utc().toISOString(),
        eventTypeId,
        slotUtcEndDate: dayjs(timeSlotToBeBooked).utc().add(eventDuration, "minutes").toISOString(),
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
  }, [event?.data?.id, timeSlotToBeBooked]);

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
