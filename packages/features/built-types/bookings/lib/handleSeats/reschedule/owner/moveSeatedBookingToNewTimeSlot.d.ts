import type EventManager from "@calcom/core/EventManager";
import type { AppsStatus } from "@calcom/types/Calendar";
import type { createLoggerWithEventDetails } from "../../../handleNewBooking";
import type { SeatedBooking, RescheduleSeatedBookingObject } from "../../types";
declare const moveSeatedBookingToNewTimeSlot: (rescheduleSeatedBookingObject: RescheduleSeatedBookingObject, seatedBooking: SeatedBooking, eventManager: EventManager, loggerWithEventDetails: ReturnType<typeof createLoggerWithEventDetails>) => Promise<{
    appsStatus: AppsStatus[] | undefined;
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
export default moveSeatedBookingToNewTimeSlot;
//# sourceMappingURL=moveSeatedBookingToNewTimeSlot.d.ts.map