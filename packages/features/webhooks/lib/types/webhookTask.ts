import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { z } from "zod";

/**
 * Base fields common to all webhook task payloads
 */
const baseWebhookTaskSchema = z.object({
  operationId: z.string(),
  timestamp: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Booking-related webhook task payload
 * Used for: BOOKING_CREATED, BOOKING_CANCELLED, BOOKING_RESCHEDULED,
 *           BOOKING_REQUESTED, BOOKING_REJECTED, BOOKING_NO_SHOW_UPDATED
 */
export const bookingWebhookTaskPayloadSchema = baseWebhookTaskSchema.extend({
  triggerEvent: z.enum([
    WebhookTriggerEvents.BOOKING_CREATED,
    WebhookTriggerEvents.BOOKING_CANCELLED,
    WebhookTriggerEvents.BOOKING_RESCHEDULED,
    WebhookTriggerEvents.BOOKING_REQUESTED,
    WebhookTriggerEvents.BOOKING_REJECTED,
    WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
  ]),
  bookingUid: z.string(),
  eventTypeId: z.number().optional(),
  teamId: z.number().nullable().optional(),
  userId: z.number().optional(),
  orgId: z.number().optional(),
  oAuthClientId: z.string().nullable().optional(),
});

/**
 * Payment-related webhook task payload
 * Used for: BOOKING_PAYMENT_INITIATED, BOOKING_PAID
 */
export const paymentWebhookTaskPayloadSchema = baseWebhookTaskSchema.extend({
  triggerEvent: z.enum([WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED, WebhookTriggerEvents.BOOKING_PAID]),
  bookingUid: z.string(),
  eventTypeId: z.number().optional(),
  teamId: z.number().nullable().optional(),
  userId: z.number().optional(),
  orgId: z.number().optional(),
  oAuthClientId: z.string().nullable().optional(),
});

/**
 * Form-related webhook task payload
 * Used for: FORM_SUBMITTED
 */
export const formWebhookTaskPayloadSchema = baseWebhookTaskSchema.extend({
  triggerEvent: z.literal(WebhookTriggerEvents.FORM_SUBMITTED),
  formId: z.string(),
  teamId: z.number().nullable().optional(),
  userId: z.number().optional(),
  oAuthClientId: z.string().nullable().optional(),
});

/**
 * Recording-related webhook task payload
 * Used for: RECORDING_READY, RECORDING_TRANSCRIPTION_GENERATED
 */
export const recordingWebhookTaskPayloadSchema = baseWebhookTaskSchema.extend({
  triggerEvent: z.enum([
    WebhookTriggerEvents.RECORDING_READY,
    WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED,
  ]),
  recordingId: z.string(),
  bookingUid: z.string(),
  eventTypeId: z.number().optional(),
  teamId: z.number().nullable().optional(),
  userId: z.number().optional(),
  oAuthClientId: z.string().nullable().optional(),
});

/**
 * OOO (Out of Office) webhook task payload
 * Used for: OOO_CREATED
 */
export const oooWebhookTaskPayloadSchema = baseWebhookTaskSchema.extend({
  triggerEvent: z.literal(WebhookTriggerEvents.OOO_CREATED),
  oooEntryId: z.number(),
  userId: z.number(),
  teamId: z.number().nullable().optional(),
  oAuthClientId: z.string().nullable().optional(),
});

/**
 * Discriminated union of all webhook task payload schemas
 */
export const webhookTaskPayloadSchema = z.discriminatedUnion("triggerEvent", [
  bookingWebhookTaskPayloadSchema,
  paymentWebhookTaskPayloadSchema,
  formWebhookTaskPayloadSchema,
  recordingWebhookTaskPayloadSchema,
  oooWebhookTaskPayloadSchema,
]);

/**
 * Webhook Task Payload Types
 *
 * These are the minimal payload structures queued by WebhookTaskerProducerService
 * and processed by WebhookTaskConsumer.
 *
 * Each type contains only the IDs/references needed - the Consumer fetches full data from DB.
 */
export type BookingWebhookTaskPayload = z.infer<typeof bookingWebhookTaskPayloadSchema>;
export type PaymentWebhookTaskPayload = z.infer<typeof paymentWebhookTaskPayloadSchema>;
export type FormWebhookTaskPayload = z.infer<typeof formWebhookTaskPayloadSchema>;
export type RecordingWebhookTaskPayload = z.infer<typeof recordingWebhookTaskPayloadSchema>;
export type OOOWebhookTaskPayload = z.infer<typeof oooWebhookTaskPayloadSchema>;

/**
 * Union type of all webhook task payloads
 */
export type WebhookTaskPayload = z.infer<typeof webhookTaskPayloadSchema>;
