import type { NextApiRequest } from "next";
import type z from "zod";
import type { TgetBookingDataSchema } from "../getBookingDataSchema";
import type { getEventTypeResponse } from "./types";
type ReqBodyWithEnd = TgetBookingDataSchema & {
    end: string;
};
export declare function getBookingData<T extends z.ZodType>({ req, eventType, schema, }: {
    req: NextApiRequest;
    eventType: getEventTypeResponse;
    schema: T;
}): Promise<{
    name: string;
    email: string;
    guests: string[] | undefined;
    location: string;
    smsReminderNumber: string | null | undefined;
    notes: string | undefined;
    rescheduleReason: string | undefined;
    calEventUserFieldsResponses: undefined;
    calEventResponses: undefined;
    customInputs: undefined;
    timeZone: string;
    metadata: Record<string, string>;
    eventTypeId: number;
    responses: {
        name: (string | {
            firstName: string;
            lastName?: string | undefined;
        }) & (string | {
            firstName: string;
            lastName?: string | undefined;
        } | undefined);
        email: string;
        guests?: string[] | undefined;
        notes?: string | undefined;
        location?: {
            value: string;
            optionValue: string;
        } | undefined;
        smsReminderNumber?: string | undefined;
        rescheduleReason?: string | undefined;
    } & Record<string, any>;
    start: string;
    language: string;
    user?: string | string[] | undefined;
    hashedLink?: string | null | undefined;
    recurringEventId?: string | undefined;
    rescheduledBy?: string | undefined;
    end: string;
    rescheduleUid?: string | undefined;
    bookingUid?: string | undefined;
    eventTypeSlug?: string | undefined;
    orgSlug?: string | undefined;
    teamMemberEmail?: string | null | undefined;
    seatReferenceUid?: string | undefined;
    appsStatus?: {
        type: string;
        success: number;
        errors: string[];
        appName: string;
        failures: number;
        warnings?: string[] | undefined;
    }[] | undefined;
    recurringCount?: number | undefined;
    hasHashedBookingLink?: boolean | undefined;
    noEmail?: boolean | undefined;
    allRecurringDates?: {
        start: string;
        end: string;
    }[] | undefined;
    currentRecurringIndex?: number | undefined;
    luckyUsers?: number[] | undefined;
} | {
    name: (string | {
        firstName: string;
        lastName?: string | undefined;
    }) & (string | {
        firstName: string;
        lastName?: string | undefined;
    } | undefined);
    email: string;
    guests: string[];
    location: string;
    smsReminderNumber: string | undefined;
    notes: string;
    calEventUserFieldsResponses: import("@calcom/types/Calendar").CalEventResponses;
    rescheduleReason: string | undefined;
    calEventResponses: import("@calcom/types/Calendar").CalEventResponses;
    customInputs: undefined;
    timeZone: string;
    metadata: Record<string, string>;
    eventTypeId: number;
    responses: {
        name: (string | {
            firstName: string;
            lastName?: string | undefined;
        }) & (string | {
            firstName: string;
            lastName?: string | undefined;
        } | undefined);
        email: string;
        guests?: string[] | undefined;
        notes?: string | undefined;
        location?: {
            value: string;
            optionValue: string;
        } | undefined;
        smsReminderNumber?: string | undefined;
        rescheduleReason?: string | undefined;
    } & Record<string, any>;
    start: string;
    language: string;
    user?: string | string[] | undefined;
    hashedLink?: string | null | undefined;
    recurringEventId?: string | undefined;
    rescheduledBy?: string | undefined;
    end: string;
    rescheduleUid?: string | undefined;
    bookingUid?: string | undefined;
    eventTypeSlug?: string | undefined;
    orgSlug?: string | undefined;
    teamMemberEmail?: string | null | undefined;
    seatReferenceUid?: string | undefined;
    appsStatus?: {
        type: string;
        success: number;
        errors: string[];
        appName: string;
        failures: number;
        warnings?: string[] | undefined;
    }[] | undefined;
    recurringCount?: number | undefined;
    hasHashedBookingLink?: boolean | undefined;
    noEmail?: boolean | undefined;
    allRecurringDates?: {
        start: string;
        end: string;
    }[] | undefined;
    currentRecurringIndex?: number | undefined;
    luckyUsers?: number[] | undefined;
}>;
export type AwaitedBookingData = Awaited<ReturnType<typeof getBookingData>>;
export type RescheduleReason = AwaitedBookingData["rescheduleReason"];
export type NoEmail = AwaitedBookingData["noEmail"];
export type AdditionalNotes = AwaitedBookingData["notes"];
export type ReqAppsStatus = AwaitedBookingData["appsStatus"];
export type SmsReminderNumber = AwaitedBookingData["smsReminderNumber"];
export type EventTypeId = AwaitedBookingData["eventTypeId"];
export type ReqBodyMetadata = ReqBodyWithEnd["metadata"];
export {};
//# sourceMappingURL=getBookingData.d.ts.map