import type { Prisma } from "@prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";
/**
 * Supposed to do whatever is needed when a booking is requested.
 */
export declare function handleBookingRequested(args: {
    evt: CalendarEvent;
    booking: {
        eventType: {
            team?: {
                parentId: number | null;
            } | null;
            currency: string;
            description: string | null;
            id: number;
            length: number;
            price: number;
            requiresConfirmation: boolean;
            title: string;
            teamId?: number | null;
            metadata: Prisma.JsonValue;
        } | null;
        eventTypeId: number | null;
        userId: number | null;
        id: number;
    };
}): Promise<void>;
//# sourceMappingURL=handleBookingRequested.d.ts.map