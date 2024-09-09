import z from "zod";
import type { ALL_VIEWS } from "@calcom/features/form-builder/schema";
import type { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
type View = ALL_VIEWS | (string & {});
type BookingFields = (z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">) | null;
type CommonParams = {
    bookingFields: BookingFields;
    view: View;
};
export declare const bookingResponse: z.ZodUnion<[z.ZodString, z.ZodBoolean, z.ZodArray<z.ZodString, "many">, z.ZodObject<{
    optionValue: z.ZodString;
    value: z.ZodString;
}, "strip", z.ZodTypeAny, {
    value: string;
    optionValue: string;
}, {
    value: string;
    optionValue: string;
}>, z.ZodRecord<z.ZodString, z.ZodString>]>;
export declare const bookingResponsesDbSchema: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodBoolean, z.ZodArray<z.ZodString, "many">, z.ZodObject<{
    optionValue: z.ZodString;
    value: z.ZodString;
}, "strip", z.ZodTypeAny, {
    value: string;
    optionValue: string;
}, {
    value: string;
    optionValue: string;
}>, z.ZodRecord<z.ZodString, z.ZodString>]>>;
export declare const getBookingResponsesPartialSchema: ({ bookingFields, view }: CommonParams) => z.ZodType<{
    email?: string | undefined;
    name?: string | {
        firstName: string;
        lastName?: string | undefined;
    } | undefined;
    guests?: string[] | undefined;
    notes?: string | undefined;
    location?: {
        value: string;
        optionValue: string;
    } | undefined;
    smsReminderNumber?: string | undefined;
    rescheduleReason?: string | undefined;
} & Record<string, string | boolean | string[] | Record<string, string> | {
    value: string;
    optionValue: string;
}>, {
    email?: string | undefined;
    name?: string | {
        firstName: string;
        lastName?: string | undefined;
    } | undefined;
    guests?: string[] | undefined;
    notes?: string | undefined;
    location?: {
        value: string;
        optionValue: string;
    } | undefined;
    smsReminderNumber?: string | undefined;
    rescheduleReason?: string | undefined;
} & Record<string, string | boolean | string[] | Record<string, string> | {
    value: string;
    optionValue: string;
}>, {
    email?: string | undefined;
    name?: string | {
        firstName: string;
        lastName?: string | undefined;
    } | undefined;
    guests?: string[] | undefined;
    notes?: string | undefined;
    location?: {
        value: string;
        optionValue: string;
    } | undefined;
    smsReminderNumber?: string | undefined;
    rescheduleReason?: string | undefined;
} & Record<string, string | boolean | string[] | Record<string, string> | {
    value: string;
    optionValue: string;
}>>;
export default function getBookingResponsesSchema({ bookingFields, view }: CommonParams): z.ZodType<{
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
} & Record<string, any>>;
export {};
//# sourceMappingURL=getBookingResponsesSchema.d.ts.map