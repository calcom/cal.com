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
    metadata: Record<string, string>;
    timeZone: string;
    eventTypeId: number;
    start: string;
    language: string;
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
    user?: string | string[] | undefined;
    hashedLink?: string | null | undefined;
    end: string;
    eventTypeSlug?: string | undefined;
    rescheduleUid?: string | undefined;
    recurringEventId?: string | undefined;
    rescheduledBy?: string | undefined;
    bookingUid?: string | undefined;
    hasHashedBookingLink?: boolean | undefined;
    seatReferenceUid?: string | undefined;
    orgSlug?: string | undefined;
    teamMemberEmail?: string | null | undefined;
    noEmail?: boolean | undefined;
    recurringCount?: number | undefined;
    allRecurringDates?: {
        end: string;
        start: string;
    }[] | undefined;
    currentRecurringIndex?: number | undefined;
    appsStatus?: {
        type: string;
        appName: string;
        success: number;
        failures: number;
        errors: string[];
        warnings?: string[] | undefined;
    }[] | undefined;
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
    metadata: Record<string, string>;
    timeZone: string;
    eventTypeId: number;
    start: string;
    language: string;
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
    user?: string | string[] | undefined;
    hashedLink?: string | null | undefined;
    end: string;
    eventTypeSlug?: string | undefined;
    rescheduleUid?: string | undefined;
    recurringEventId?: string | undefined;
    rescheduledBy?: string | undefined;
    bookingUid?: string | undefined;
    hasHashedBookingLink?: boolean | undefined;
    seatReferenceUid?: string | undefined;
    orgSlug?: string | undefined;
    teamMemberEmail?: string | null | undefined;
    noEmail?: boolean | undefined;
    recurringCount?: number | undefined;
    allRecurringDates?: {
        end: string;
        start: string;
    }[] | undefined;
    currentRecurringIndex?: number | undefined;
    appsStatus?: {
        type: string;
        appName: string;
        success: number;
        failures: number;
        errors: string[];
        warnings?: string[] | undefined;
    }[] | undefined;
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