import { z } from "zod";
export declare const ZCreateInputSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    subscriberUrl: z.ZodString;
    eventTriggers: z.ZodArray<z.ZodEnum<["BOOKING_CANCELLED", "BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_PAID", "BOOKING_PAYMENT_INITIATED", "MEETING_ENDED", "MEETING_STARTED", "BOOKING_REQUESTED", "BOOKING_REJECTED", "RECORDING_READY", "INSTANT_MEETING", "RECORDING_TRANSCRIPTION_GENERATED", "BOOKING_NO_SHOW_UPDATED", "OOO_CREATED", "FORM_SUBMITTED"]>, "many">;
    active: z.ZodBoolean;
    payloadTemplate: z.ZodNullable<z.ZodString>;
    eventTypeId: z.ZodOptional<z.ZodNumber>;
    appId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    secret: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    teamId: z.ZodOptional<z.ZodNumber>;
    platform: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    subscriberUrl: string;
    payloadTemplate: string | null;
    active: boolean;
    eventTriggers: ("BOOKING_CREATED" | "BOOKING_PAYMENT_INITIATED" | "BOOKING_PAID" | "BOOKING_RESCHEDULED" | "BOOKING_REQUESTED" | "BOOKING_CANCELLED" | "BOOKING_REJECTED" | "BOOKING_NO_SHOW_UPDATED" | "FORM_SUBMITTED" | "MEETING_ENDED" | "MEETING_STARTED" | "RECORDING_READY" | "INSTANT_MEETING" | "RECORDING_TRANSCRIPTION_GENERATED" | "OOO_CREATED")[];
    id?: string | undefined;
    eventTypeId?: number | undefined;
    appId?: string | null | undefined;
    secret?: string | null | undefined;
    teamId?: number | undefined;
    platform?: boolean | undefined;
}, {
    subscriberUrl: string;
    payloadTemplate: string | null;
    active: boolean;
    eventTriggers: ("BOOKING_CREATED" | "BOOKING_PAYMENT_INITIATED" | "BOOKING_PAID" | "BOOKING_RESCHEDULED" | "BOOKING_REQUESTED" | "BOOKING_CANCELLED" | "BOOKING_REJECTED" | "BOOKING_NO_SHOW_UPDATED" | "FORM_SUBMITTED" | "MEETING_ENDED" | "MEETING_STARTED" | "RECORDING_READY" | "INSTANT_MEETING" | "RECORDING_TRANSCRIPTION_GENERATED" | "OOO_CREATED")[];
    id?: string | undefined;
    eventTypeId?: number | undefined;
    appId?: string | null | undefined;
    secret?: string | null | undefined;
    teamId?: number | undefined;
    platform?: boolean | undefined;
}>;
export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
