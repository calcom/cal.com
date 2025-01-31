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

export type UseSlotsReturnType = ReturnType<typeof useSlots>;

export const useSlots = (event: { data?: Pick<BookerEvent, "id" | "length"> | null }) => {
  const selectedDuration = useBookerStore((state) => state.selectedDuration);
  const cachedAvailabilityStatusesRef = useRef<
    { slotUtcStartDate: string; slotUtcEndDate: string; status: "available" | "reserved" }[]
  >([]);
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
  const eventDuration = selectedDuration || event.data?.length;
  const allTimeslots = [...tentativeSelectedTimeslots, selectedTimeslot].filter(
    (slot): slot is string => slot !== null
  );
  const allUniqueTimeslots = Array.from(new Set(allTimeslots));

  // Create array of slots with their UTC start and end dates
  const slotsToCheck = allUniqueTimeslots.map((slot) => ({
    slotUtcStartDate: dayjs(slot).utc().toISOString(),
    slotUtcEndDate: dayjs(slot)
      .add(eventDuration || 0, "minutes")
      .utc()
      .toISOString(),
  }));

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
      enabled: !!(eventTypeId && allTimeslots.length > 0 && eventDuration),
      staleTime: PUBLIC_QUERY_RESERVATION_STALE_TIME_SECONDS * 1000,
    }
  );

  const availabilityStatuses = isAvailableQuery.data?.slots;
  if (availabilityStatuses && availabilityStatuses.length > 0) {
    cachedAvailabilityStatusesRef.current = availabilityStatuses;
  }

  const handleReserveSlot = () => {
    if (eventTypeId && selectedTimeslot && eventDuration) {
      reserveSlotMutation.mutate({
        slotUtcStartDate: dayjs(selectedTimeslot).utc().toISOString(),
        eventTypeId,
        slotUtcEndDate: dayjs(selectedTimeslot).utc().add(eventDuration, "minutes").toISOString(),
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
  }, [event?.data?.id, selectedTimeslot]);

  return {
    setSelectedTimeslot,
    setTentativeSelectedTimeslots,
    selectedTimeslot,
    tentativeSelectedTimeslots,
    slotReservationId,
    availabilityStatuses: availabilityStatuses || cachedAvailabilityStatusesRef.current,
  };
};
