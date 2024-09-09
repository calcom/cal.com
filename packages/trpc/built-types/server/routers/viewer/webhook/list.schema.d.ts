import { z } from "zod";
export declare const ZListInputSchema: z.ZodOptional<z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    appId: z.ZodOptional<z.ZodString>;
    teamId: z.ZodOptional<z.ZodNumber>;
    eventTypeId: z.ZodOptional<z.ZodNumber>;
    eventTriggers: z.ZodOptional<z.ZodArray<z.ZodEnum<["BOOKING_CANCELLED", "BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_PAID", "BOOKING_PAYMENT_INITIATED", "MEETING_ENDED", "MEETING_STARTED", "BOOKING_REQUESTED", "BOOKING_REJECTED", "RECORDING_READY", "INSTANT_MEETING", "RECORDING_TRANSCRIPTION_GENERATED", "BOOKING_NO_SHOW_UPDATED", "OOO_CREATED", "FORM_SUBMITTED"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    id?: string | undefined;
    appId?: string | undefined;
    teamId?: number | undefined;
    eventTypeId?: number | undefined;
    eventTriggers?: ("BOOKING_CREATED" | "BOOKING_PAYMENT_INITIATED" | "BOOKING_PAID" | "BOOKING_RESCHEDULED" | "BOOKING_REQUESTED" | "BOOKING_CANCELLED" | "BOOKING_REJECTED" | "BOOKING_NO_SHOW_UPDATED" | "FORM_SUBMITTED" | "MEETING_ENDED" | "MEETING_STARTED" | "RECORDING_READY" | "INSTANT_MEETING" | "RECORDING_TRANSCRIPTION_GENERATED" | "OOO_CREATED")[] | undefined;
}, {
    id?: string | undefined;
    appId?: string | undefined;
    teamId?: number | undefined;
    eventTypeId?: number | undefined;
    eventTriggers?: ("BOOKING_CREATED" | "BOOKING_PAYMENT_INITIATED" | "BOOKING_PAID" | "BOOKING_RESCHEDULED" | "BOOKING_REQUESTED" | "BOOKING_CANCELLED" | "BOOKING_REJECTED" | "BOOKING_NO_SHOW_UPDATED" | "FORM_SUBMITTED" | "MEETING_ENDED" | "MEETING_STARTED" | "RECORDING_READY" | "INSTANT_MEETING" | "RECORDING_TRANSCRIPTION_GENERATED" | "OOO_CREATED")[] | undefined;
}>>;
export type TListInputSchema = z.infer<typeof ZListInputSchema>;
