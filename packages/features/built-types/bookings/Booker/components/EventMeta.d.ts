/// <reference types="react" />
import type { BookerEvent } from "@calcom/features/bookings/types";
export declare const EventMeta: ({ event, isPending, isPlatform, classNames, }: {
    event?: Pick<BookerEvent, "length" | "description" | "metadata" | "profile" | "schedule" | "title" | "users" | "locations" | "lockTimeZoneToggleOnBookingPage" | "requiresConfirmation" | "recurringEvent" | "seatsPerTimeSlot" | "schedulingType" | "price" | "currency" | "entity" | "isDynamic"> | null | undefined;
    isPending: boolean;
    isPlatform?: boolean | undefined;
    classNames?: {
        eventMetaContainer?: string | undefined;
        eventMetaTitle?: string | undefined;
        eventMetaTimezoneSelect?: string | undefined;
    } | undefined;
}) => JSX.Element | null;
//# sourceMappingURL=EventMeta.d.ts.map