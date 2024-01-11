import { shallow } from "zustand/shallow";

import dayjs from "@calcom/dayjs";
import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import { useSlotReservationId } from "@calcom/features/bookings/Booker/useSlotReservationId";
import type { useEventReturnType } from "@calcom/features/bookings/Booker/utils/event";
import { trpc } from "@calcom/trpc";

export const useSlots = (event: useEventReturnType) => {
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
  const handleReserveSlot = () => {
    if (event?.data?.id && selectedTimeslot && (selectedDuration || event?.data?.length)) {
      reserveSlotMutation.mutate({
        slotUtcStartDate: dayjs(selectedTimeslot).utc().format(),
        eventTypeId: event.data.id,
        slotUtcEndDate: dayjs(selectedTimeslot)
          .utc()
          .add(selectedDuration || event.data.length, "minutes")
          .format(),
      });
    }
  };

  return {
    selectedTimeslot,
    setSelectedTimeslot,
    setSlotReservationId,
    slotReservationId,
    handleReserveSlot,
    handleRemoveSlot,
  };
};
