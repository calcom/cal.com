import { z } from "zod";
import type { getBookingFieldsWithSystemFields } from "./getBookingFields";
declare const getBookingDataSchemaForApi: ({ view, bookingFields, }: {
    view: "booking" | "reschedule";
    bookingFields: Awaited<ReturnType<typeof getBookingFieldsWithSystemFields>>;
}) => z.ZodEffects<z.ZodObject<{
    metadata: z.ZodRecord<z.ZodString, z.ZodString>;
    guests: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    location: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    user: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    timeZone: z.ZodEffects<z.ZodString, string, string>;
    hashedLink: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    customInputs: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodUnion<[z.ZodString, z.ZodBoolean]>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: string | boolean;
    }, {
        label: string;
        value: string | boolean;
    }>, "many">>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    smsReminderNumber: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    rescheduleReason: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    end: z.ZodOptional<z.ZodString>;
    eventTypeId: z.ZodNumber;
    eventTypeSlug: z.ZodOptional<z.ZodString>;
    rescheduleUid: z.ZodOptional<z.ZodString>;
    recurringEventId: z.ZodOptional<z.ZodString>;
    rescheduledBy: z.ZodOptional<z.ZodString>;
    start: z.ZodString;
    language: z.ZodString;
    bookingUid: z.ZodOptional<z.ZodString>;
    hasHashedBookingLink: z.ZodOptional<z.ZodBoolean>;
    seatReferenceUid: z.ZodOptional<z.ZodString>;
    orgSlug: z.ZodOptional<z.ZodString>;
    teamMemberEmail: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    noEmail: z.ZodOptional<z.ZodBoolean>;
    recurringCount: z.ZodOptional<z.ZodNumber>;
    allRecurringDates: z.ZodOptional<z.ZodArray<z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        end: string;
        start: string;
    }, {
        end: string;
        start: string;
    }>, "many">>;
    currentRecurringIndex: z.ZodOptional<z.ZodNumber>;
    appsStatus: z.ZodOptional<z.ZodArray<z.ZodObject<{
        appName: z.ZodString;
        success: z.ZodNumber;
        failures: z.ZodNumber;
        type: z.ZodString;
        errors: z.ZodArray<z.ZodString, "many">;
        warnings: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        appName: string;
        success: number;
        failures: number;
        errors: string[];
        warnings?: string[] | undefined;
    }, {
        type: string;
        appName: string;
        success: number;
        failures: number;
        errors: string[];
        warnings?: string[] | undefined;
    }>, "many">>;
    luckyUsers: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    responses: z.ZodOptional<z.ZodType<{
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
    } & Record<string, any>, {
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
    } & Record<string, any>, {
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
    } & Record<string, any>>>;
}, "strip", z.ZodTypeAny, {
    metadata: Record<string, string>;
    timeZone: string;
    eventTypeId: number;
    start: string;
    language: string;
    guests?: string[] | undefined;
    location?: string | undefined;
    name?: string | undefined;
    email?: string | undefined;
    user?: string | string[] | undefined;
    hashedLink?: string | null | undefined;
    customInputs?: {
        label: string;
        value: string | boolean;
    }[] | undefined;
    notes?: string | undefined;
    smsReminderNumber?: string | null | undefined;
    rescheduleReason?: string | undefined;
    end?: string | undefined;
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
    responses?: ({
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
    } & Record<string, any>) | undefined;
}, {
    metadata: Record<string, string>;
    timeZone: string;
    eventTypeId: number;
    start: string;
    language: string;
    guests?: string[] | undefined;
    location?: string | undefined;
    name?: string | undefined;
    email?: string | undefined;
    user?: string | string[] | undefined;
    hashedLink?: string | null | undefined;
    customInputs?: {
        label: string;
        value: string | boolean;
    }[] | undefined;
    notes?: string | undefined;
    smsReminderNumber?: string | null | undefined;
    rescheduleReason?: string | undefined;
    end?: string | undefined;
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
    responses?: ({
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
    } & Record<string, any>) | undefined;
}>, {
    metadata: Record<string, string>;
    timeZone: string;
    eventTypeId: number;
    start: string;
    language: string;
    guests?: string[] | undefined;
    location?: string | undefined;
    name?: string | undefined;
    email?: string | undefined;
    user?: string | string[] | undefined;
    hashedLink?: string | null | undefined;
    customInputs?: {
        label: string;
        value: string | boolean;
    }[] | undefined;
    notes?: string | undefined;
    smsReminderNumber?: string | null | undefined;
    rescheduleReason?: string | undefined;
    end?: string | undefined;
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
    responses?: ({
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
    } & Record<string, any>) | undefined;
}, {
    metadata: Record<string, string>;
    timeZone: string;
    eventTypeId: number;
    start: string;
    language: string;
    guests?: string[] | undefined;
    location?: string | undefined;
    name?: string | undefined;
    email?: string | undefined;
    user?: string | string[] | undefined;
    hashedLink?: string | null | undefined;
    customInputs?: {
        label: string;
        value: string | boolean;
    }[] | undefined;
    notes?: string | undefined;
    smsReminderNumber?: string | null | undefined;
    rescheduleReason?: string | undefined;
    end?: string | undefined;
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
    responses?: ({
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
    } & Record<string, any>) | undefined;
}>;
export default getBookingDataSchemaForApi;
//# sourceMappingURL=getBookingDataSchemaForApi.d.ts.map