/// <reference types="react" />
import type { LocationObject } from "@calcom/app-store/locations";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import type { RouterOutputs } from "@calcom/trpc/react";
export declare const BookingFields: ({ fields, locations, rescheduleUid, isDynamicGroupBooking, bookingData, }: {
    fields: NonNullable<RouterOutputs["viewer"]["public"]["event"]>["bookingFields"];
    locations: LocationObject[];
    rescheduleUid?: string | undefined;
    bookingData?: (Omit<{
        id: number;
        description: string | null;
        user: {
            id: number;
        } | null;
        startTime: Date;
        endTime: Date;
        attendees: {
            name: string;
            email: string;
            bookingSeat: {
                data: import(".prisma/client").Prisma.JsonValue;
                id: number;
                bookingId: number;
                referenceUid: string;
                attendeeId: number;
            } | null;
        }[];
        uid: string;
        eventTypeId: number | null;
        customInputs: import(".prisma/client").Prisma.JsonValue;
        responses: import(".prisma/client").Prisma.JsonValue;
        location: string | null;
        smsReminderNumber: string | null;
    }, "responses"> & {
        responses: Record<string, string | boolean | string[] | {
            value: string;
            optionValue: string;
        } | Record<string, string>>;
    }) | null | undefined;
    isDynamicGroupBooking: boolean;
}) => JSX.Element;
//# sourceMappingURL=BookingFields.d.ts.map