import type { Prisma, User } from "@calcom/prisma/client";
type Booking = Prisma.BookingGetPayload<{
    include: {
        eventType: true;
        attendees: true;
    };
}>;
export declare function getiCalEventAsString(booking: Pick<Booking, "startTime" | "endTime" | "description" | "location" | "attendees"> & {
    eventType: {
        recurringEvent?: Prisma.JsonValue;
        title?: string;
    } | null;
    user: Partial<User> | null;
}): string | undefined;
export {};
//# sourceMappingURL=getiCalEventAsString.d.ts.map