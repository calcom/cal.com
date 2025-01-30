import { useEffect } from "react";
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
  const [selectedTimeslot, setSelectedTimeslot] = useBookerStore(
    (state) => [state.selectedTimeslot, state.setSelectedTimeslot],
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
  const slotUtcStartDate = selectedTimeslot ? dayjs(selectedTimeslot).utc().format() : null;
  const eventDuration = selectedDuration || event.data?.length;
  const slotUtcEndDate =
    selectedTimeslot && eventDuration
      ? dayjs(selectedTimeslot).utc().add(eventDuration, "minutes").format()
      : null;

  const isReservedBySomeoneElseQuery = trpc.viewer.slots.isReserved.useQuery(
    {
      slotUtcStartDate: slotUtcStartDate!,
      slotUtcEndDate: slotUtcEndDate!,
      eventTypeId: eventTypeId!,
    },
    {
      refetchInterval: PUBLIC_QUERY_RESERVATION_INTERVAL_SECONDS * 1000,
      refetchOnWindowFocus: true,
      enabled: !!(eventTypeId && slotUtcStartDate && slotUtcEndDate),
      staleTime: PUBLIC_QUERY_RESERVATION_STALE_TIME_SECONDS * 1000,
    }
  );

  const isReservedBySomeoneElse = !!isReservedBySomeoneElseQuery.data?.isReserved;

  const handleReserveSlot = () => {
    if (eventTypeId && slotUtcStartDate && slotUtcEndDate) {
      reserveSlotMutation.mutate({
        slotUtcStartDate,
        eventTypeId,
        slotUtcEndDate,
      });
    }
  };

  const timeslot = useBookerStore((state) => state.selectedTimeslot);

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
  }, [event?.data?.id, timeslot]);

  return {
    selectedTimeslot,
    setSelectedTimeslot,
    setSlotReservationId,
    slotReservationId,
    handleReserveSlot,
    handleRemoveSlot,
    isReservedBySomeoneElse,
  };
};
