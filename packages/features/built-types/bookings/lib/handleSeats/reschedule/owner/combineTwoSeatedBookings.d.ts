import type EventManager from "@calcom/core/EventManager";
import type { createLoggerWithEventDetails } from "../../../handleNewBooking";
import type { SeatedBooking, RescheduleSeatedBookingObject, NewTimeSlotBooking } from "../../types";
declare const combineTwoSeatedBookings: (rescheduleSeatedBookingObject: RescheduleSeatedBookingObject, seatedBooking: SeatedBooking, newTimeSlotBooking: NewTimeSlotBooking, eventManager: EventManager, loggerWithEventDetails: ReturnType<typeof createLoggerWithEventDetails>) => Promise<{
    title: string;
    metadata: import(".prisma/client").Prisma.JsonValue;
    eventType: {
        title: string;
        length: number;
        description: string | null;
        lockTimeZoneToggleOnBookingPage: boolean;
        requiresConfirmation: boolean;
        requiresBookerEmailVerification: boolean;
        price: number;
        currency: string;
    } | null;
    location: string | null;
    status: import(".prisma/client").$Enums.BookingStatus;
    description: string | null;
    user: {
        name: string | null;
        email: string;
        timeZone: string;
        username: string | null;
    } | null;
    uid: string;
    responses: import(".prisma/client").Prisma.JsonValue;
    startTime: Date;
    endTime: Date;
}>;
export default combineTwoSeatedBookings;
//# sourceMappingURL=combineTwoSeatedBookings.d.ts.map