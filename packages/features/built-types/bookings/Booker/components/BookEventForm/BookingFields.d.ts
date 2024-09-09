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
        location: string | null;
        description: string | null;
        user: {
            id: number;
        } | null;
        customInputs: import(".prisma/client").Prisma.JsonValue;
        smsReminderNumber: string | null;
        eventTypeId: number | null;
        uid: string;
        responses: import(".prisma/client").Prisma.JsonValue;
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
        startTime: Date;
        endTime: Date;
    }, "responses"> & {
        responses: Record<string, string | boolean | string[] | Record<string, string> | {
            value: string;
            optionValue: string;
        }>;
    }) | null | undefined;
    isDynamicGroupBooking: boolean;
}) => JSX.Element;
//# sourceMappingURL=BookingFields.d.ts.map