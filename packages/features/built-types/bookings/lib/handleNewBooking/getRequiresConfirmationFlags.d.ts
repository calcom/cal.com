import type { getEventTypeResponse } from "./getEventTypesFromDB";
type EventType = Pick<getEventTypeResponse, "metadata" | "requiresConfirmation">;
type PaymentAppData = {
    price: number;
};
export declare function getRequiresConfirmationFlags({ eventType, bookingStartTime, userId, paymentAppData, originalRescheduledBookingOrganizerId, }: {
    eventType: EventType;
    bookingStartTime: string;
    userId: number | undefined;
    paymentAppData: PaymentAppData;
    originalRescheduledBookingOrganizerId: number | undefined;
}): {
    /**
     * Organizer of the booking is rescheduling
     */
    userReschedulingIsOwner: boolean;
    /**
     * Booking won't need confirmation to be ACCEPTED
     */
    isConfirmedByDefault: boolean;
};
export type IsConfirmedByDefault = ReturnType<typeof getRequiresConfirmationFlags>["isConfirmedByDefault"];
export {};
//# sourceMappingURL=getRequiresConfirmationFlags.d.ts.map