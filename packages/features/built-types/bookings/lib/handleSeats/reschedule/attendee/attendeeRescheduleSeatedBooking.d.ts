import type EventManager from "@calcom/core/EventManager";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { RescheduleSeatedBookingObject, NewTimeSlotBooking } from "../../types";
declare const attendeeRescheduleSeatedBooking: (rescheduleSeatedBookingObject: RescheduleSeatedBookingObject, seatAttendee: Person, newTimeSlotBooking: NewTimeSlotBooking | null, originalBookingEvt: CalendarEvent, eventManager: EventManager) => Promise<{
    seatReferenceUid: string | undefined;
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
} | null>;
export default attendeeRescheduleSeatedBooking;
//# sourceMappingURL=attendeeRescheduleSeatedBooking.d.ts.map