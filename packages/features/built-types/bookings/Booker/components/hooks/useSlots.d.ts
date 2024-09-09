import type { BookerEvent } from "@calcom/features/bookings/types";
export type UseSlotsReturnType = ReturnType<typeof useSlots>;
export declare const useSlots: (event: {
    data?: Pick<BookerEvent, "id" | "length"> | null;
}) => {
    selectedTimeslot: string | null;
    setSelectedTimeslot: (timeslot: string | null) => void;
    setSlotReservationId: (uid: string) => void;
    slotReservationId: string | null;
    handleReserveSlot: () => void;
    handleRemoveSlot: () => void;
};
//# sourceMappingURL=useSlots.d.ts.map