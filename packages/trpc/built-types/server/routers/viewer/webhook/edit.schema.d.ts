import { z } from "zod";
export declare const ZEditInputSchema: z.ZodObject<{
    teamId: z.ZodOptional<z.ZodNumber>;
    id: z.ZodString;
    subscriberUrl: z.ZodOptional<z.ZodString>;
    eventTriggers: z.ZodOptional<z.ZodArray<z.ZodEnum<["BOOKING_CANCELLED", "BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_PAID", "BOOKING_PAYMENT_INITIATED", "MEETING_ENDED", "MEETING_STARTED", "BOOKING_REQUESTED", "BOOKING_REJECTED", "RECORDING_READY", "INSTANT_MEETING", "RECORDING_TRANSCRIPTION_GENERATED", "BOOKING_NO_SHOW_UPDATED", "OOO_CREATED", "FORM_SUBMITTED"]>, "many">>;
    active: z.ZodOptional<z.ZodBoolean>;
    payloadTemplate: z.ZodNullable<z.ZodString>;
    eventTypeId: z.ZodOptional<z.ZodNumber>;
    appId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    secret: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    payloadTemplate: string | null;
    teamId?: number | undefined;
    subscriberUrl?: string | undefined;
    eventTriggers?: ("BOOKING_CREATED" | "BOOKING_PAYMENT_INITIATED" | "BOOKING_PAID" | "BOOKING_RESCHEDULED" | "BOOKING_REQUESTED" | "BOOKING_CANCELLED" | "BOOKING_REJECTED" | "BOOKING_NO_SHOW_UPDATED" | "FORM_SUBMITTED" | "MEETING_ENDED" | "MEETING_STARTED" | "RECORDING_READY" | "INSTANT_MEETING" | "RECORDING_TRANSCRIPTION_GENERATED" | "OOO_CREATED")[] | undefined;
    active?: boolean | undefined;
    eventTypeId?: number | undefined;
    appId?: string | null | undefined;
    secret?: string | null | undefined;
}, {
    id: string;
    payloadTemplate: string | null;
    teamId?: number | undefined;
    subscriberUrl?: string | undefined;
    eventTriggers?: ("BOOKING_CREATED" | "BOOKING_PAYMENT_INITIATED" | "BOOKING_PAID" | "BOOKING_RESCHEDULED" | "BOOKING_REQUESTED" | "BOOKING_CANCELLED" | "BOOKING_REJECTED" | "BOOKING_NO_SHOW_UPDATED" | "FORM_SUBMITTED" | "MEETING_ENDED" | "MEETING_STARTED" | "RECORDING_READY" | "INSTANT_MEETING" | "RECORDING_TRANSCRIPTION_GENERATED" | "OOO_CREATED")[] | undefined;
    active?: boolean | undefined;
    eventTypeId?: number | undefined;
    appId?: string | null | undefined;
    secret?: string | null | undefined;
}>;
export type TEditInputSchema = z.infer<typeof ZEditInputSchema>;
