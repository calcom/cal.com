import type EventManager from "@calcom/core/EventManager";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { RescheduleSeatedBookingObject, NewTimeSlotBooking } from "../../types";
declare const attendeeRescheduleSeatedBooking: (rescheduleSeatedBookingObject: RescheduleSeatedBookingObject, seatAttendee: Person, newTimeSlotBooking: NewTimeSlotBooking | null, originalBookingEvt: CalendarEvent, eventManager: EventManager) => Promise<{
    seatReferenceUid: string | undefined;
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
} | null>;
export default attendeeRescheduleSeatedBooking;
//# sourceMappingURL=attendeeRescheduleSeatedBooking.d.ts.map