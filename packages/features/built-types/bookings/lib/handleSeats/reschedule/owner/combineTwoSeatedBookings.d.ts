import type EventManager from "@calcom/core/EventManager";
import type { createLoggerWithEventDetails } from "../../../handleNewBooking";
import type { SeatedBooking, RescheduleSeatedBookingObject, NewTimeSlotBooking } from "../../types";
declare const combineTwoSeatedBookings: (rescheduleSeatedBookingObject: RescheduleSeatedBookingObject, seatedBooking: SeatedBooking, newTimeSlotBooking: NewTimeSlotBooking, eventManager: EventManager, loggerWithEventDetails: ReturnType<typeof createLoggerWithEventDetails>) => Promise<{
    status: import(".prisma/client").$Enums.BookingStatus;
    description: string | null;
    user: {
        name: string | null;
        email: string;
        username: string | null;
        timeZone: string;
    } | null;
    startTime: Date;
    endTime: Date;
    metadata: import(".prisma/client").Prisma.JsonValue;
    eventType: {
        length: number;
        description: string | null;
        title: string;
        lockTimeZoneToggleOnBookingPage: boolean;
        requiresConfirmation: boolean;
        requiresBookerEmailVerification: boolean;
        price: number;
        currency: string;
    } | null;
    uid: string;
    title: string;
    responses: import(".prisma/client").Prisma.JsonValue;
    location: string | null;
}>;
export default combineTwoSeatedBookings;
//# sourceMappingURL=combineTwoSeatedBookings.d.ts.map