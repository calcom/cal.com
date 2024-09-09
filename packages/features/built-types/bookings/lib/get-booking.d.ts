import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { bookingResponsesDbSchema } from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import type { PrismaClient } from "@calcom/prisma";
declare function getBooking(prisma: PrismaClient, uid: string, isSeatedEvent?: boolean): Promise<(Omit<{
    id: number;
    location: string | null;
    description: string | null;
    user: {
        id: number;
    } | null;
    customInputs: Prisma.JsonValue;
    smsReminderNumber: string | null;
    eventTypeId: number | null;
    uid: string;
    responses: Prisma.JsonValue;
    attendees: {
        name: string;
        email: string;
        bookingSeat: {
            data: Prisma.JsonValue;
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
}) | null>;
export type GetBookingType = Prisma.PromiseReturnType<typeof getBooking>;
export declare const getBookingWithResponses: <T extends {
    location: string | null;
    description: string | null;
    customInputs: Prisma.JsonValue;
    responses: Prisma.JsonValue;
    attendees: {
        name: string;
        email: string;
    }[];
}>(booking: T, isSeatedEvent?: boolean) => Omit<T, "responses"> & {
    responses: z.infer<typeof bookingResponsesDbSchema>;
};
export default getBooking;
export declare const getBookingForReschedule: (uid: string, userId?: number) => Promise<{
    attendees: {
        name: string;
        email: string;
        bookingSeat: {
            data: Prisma.JsonValue;
            id: number;
            bookingId: number;
            referenceUid: string;
            attendeeId: number;
        } | null;
    }[];
    id: number;
    location: string | null;
    description: string | null;
    user: {
        id: number;
    } | null;
    customInputs: Prisma.JsonValue;
    smsReminderNumber: string | null;
    eventTypeId: number | null;
    uid: string;
    startTime: Date;
    endTime: Date;
    responses: z.infer<typeof bookingResponsesDbSchema>;
} | null>;
/**
 * Should only get booking attendees length for seated events
 * @param uid
 * @returns booking with masked attendee emails
 */
export declare const getBookingForSeatedEvent: (uid: string) => Promise<(Omit<{
    id: number;
    location: string | null;
    description: string | null;
    user: {
        id: number;
    } | null;
    customInputs: Prisma.JsonValue;
    smsReminderNumber: string | null;
    eventTypeId: number | null;
    uid: string;
    responses: Prisma.JsonValue;
    attendees: {
        name: string;
        email: string;
        bookingSeat: {
            data: Prisma.JsonValue;
            id: number;
            bookingId: number;
            referenceUid: string;
            attendeeId: number;
        } | null;
    }[];
    startTime: Date;
    endTime: Date;
}, "responses"> & {
    responses: z.infer<typeof bookingResponsesDbSchema>;
}) | null>;
export declare const getMultipleDurationValue: (multipleDurationConfig: number[] | undefined, queryDuration: string | string[] | undefined, defaultValue: number) => number | null;
//# sourceMappingURL=get-booking.d.ts.map