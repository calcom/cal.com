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
  platformClientId: z.string().nullable().optional(),
  platformRescheduleUrl: z.string().nullable().optional(),
  platformCancelUrl: z.string().nullable().optional(),
  platformBookingUrl: z.string().nullable().optional(),
  /** Non-PII seat reference UUID; lets the consumer resolve the correct seat without email-matching */
  attendeeSeatId: z.string().optional(),
  /** The specific hashed-link UUID used when booking via a private link */
  hashedLink: z.string().nullable().optional(),
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
  teamIds: z.array(z.number()).optional(),
  orgId: z.number().nullable().optional(),
  oAuthClientId: z.string().nullable().optional(),
});

/**
 * Routing Form Fallback Hit webhook task payload
 * Used for: ROUTING_FORM_FALLBACK_HIT
 */
export const routingFormFallbackHitWebhookTaskPayloadSchema = baseWebhookTaskSchema.extend({
  triggerEvent: z.literal(WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT),
  formId: z.string(),
  responseId: z.number(),
  teamId: z.number().nullable().optional(),
  userId: z.number().optional(),
  orgId: z.number().optional(),
  oAuthClientId: z.string().nullable().optional(),
});

/**
 * Wrong Assignment Report webhook task payload
 * Used for: WRONG_ASSIGNMENT_REPORT
 *
 * Queue metadata is PII-free; the fetcher resolves emails/names from DB.
 */
export const wrongAssignmentWebhookTaskPayloadSchema = baseWebhookTaskSchema.extend({
  triggerEvent: z.literal(WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT),
  bookingUid: z.string(),
  wrongAssignmentReportId: z.string(),
  userId: z.number().nullable().optional(),
  teamId: z.number().nullable().optional(),
  orgId: z.number().nullable().optional(),
});

/**
 * Resolved schemas — full shapes used by the consumer to validate fetcher output.
 */
export const wrongAssignmentBookingSchema = z.object({
  uid: z.string(),
  id: z.number(),
  title: z.string(),
  startTime: z.string().or(z.date()),
  endTime: z.string().or(z.date()),
  status: z.string(),
  eventType: z
    .object({
      id: z.number(),
      title: z.string(),
      slug: z.string(),
      teamId: z.number().nullable(),
    })
    .nullable(),
});

export const wrongAssignmentReportSchema = z.object({
  reportedBy: z.object({
    id: z.number(),
    email: z.string(),
    name: z.string().nullable(),
  }),
  firstAssignmentReason: z.string().nullable(),
  guest: z.string().nullable(),
  host: z.object({
    email: z.string().nullable(),
    name: z.string().nullable(),
  }),
  correctAssignee: z.string().nullable(),
  additionalNotes: z.string().nullable(),
});

export const wrongAssignmentMetadataSchema = z.object({
  booking: wrongAssignmentBookingSchema,
  report: wrongAssignmentReportSchema,
});

export type WrongAssignmentMetadata = z.infer<typeof wrongAssignmentMetadataSchema>;

/**
 * Discriminated union of all webhook task payload schemas
 */
export const webhookTaskPayloadSchema = z.discriminatedUnion("triggerEvent", [
  bookingWebhookTaskPayloadSchema,
  paymentWebhookTaskPayloadSchema,
  formWebhookTaskPayloadSchema,
  recordingWebhookTaskPayloadSchema,
  oooWebhookTaskPayloadSchema,
  routingFormFallbackHitWebhookTaskPayloadSchema,
  wrongAssignmentWebhookTaskPayloadSchema,
]);

/**
 * Metadata schema for BOOKING_NO_SHOW_UPDATED webhooks.
 * Only non-PII identifiers are queued; the fetcher resolves emails from DB.
 */
export const noShowMetadataSchema = z.object({
  attendeeIds: z.array(z.number()),
  bookingId: z.number().optional(),
  locale: z.string().optional(),
});

export type NoShowMetadata = {
  attendeeIds: number[];
  bookingId?: number;
  locale?: string;
};

/**
 * Shape returned by BookingWebhookDataFetcher.fetchNoShowData().
 * Used by the consumer to avoid `as` casts on the generic eventData bag.
 */
export const noShowEventDataSchema = z.object({
  noShowMessage: z.string(),
  noShowAttendees: z.array(z.object({ email: z.string(), noShow: z.boolean() })),
  bookingId: z.number().optional(),
  bookingUid: z.string(),
});

/**
 * OOO entry shape returned by the data fetcher after DB lookup.
 * Used by the consumer to validate the fetcher output before building the DTO.
 */
export const oooEntrySchema = z.object({
  id: z.number(),
  start: z.string(),
  end: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  notes: z.string().nullable(),
  reason: z.object({
    emoji: z.string().optional(),
    reason: z.string().optional(),
  }),
  reasonId: z.number(),
  user: z.object({
    id: z.number(),
    name: z.string().nullable(),
    username: z.string().nullable(),
    timeZone: z.string(),
    email: z.string(),
  }),
  toUser: z
    .object({
      id: z.number(),
      name: z.string().nullable().optional(),
      username: z.string().nullable().optional(),
      timeZone: z.string().optional(),
      email: z.string().optional(),
    })
    .nullable(),
  uuid: z.string(),
});

/**
 * Routing Form Fallback Hit metadata — PII-free; only non-sensitive action context.
 * The consumer fetches response and form name from DB via responseId.
 */
export const routingFormFallbackHitMetadataSchema = z.object({
  fallbackAction: z
    .object({
      type: z.string(),
      value: z.string(),
      eventTypeId: z.number().optional(),
    })
    .optional(),
});

export type RoutingFormFallbackHitMetadata = z.infer<typeof routingFormFallbackHitMetadataSchema>;

/**
 * Shape returned by FormWebhookDataFetcher for ROUTING_FORM_FALLBACK_HIT.
 * Used by the consumer to validate fetcher output before building the DTO.
 */
export const routingFormFallbackHitEventDataSchema = z.object({
  formId: z.string(),
  formName: z.string(),
  responseId: z.number(),
  fallbackAction: z
    .object({
      type: z.string(),
      value: z.string(),
      eventTypeId: z.number().optional(),
    })
    .optional(),
  responses: z.record(z.unknown()).nullable(),
});

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
export type RoutingFormFallbackHitWebhookTaskPayload = z.infer<
  typeof routingFormFallbackHitWebhookTaskPayloadSchema
>;
export type WrongAssignmentWebhookTaskPayload = z.infer<typeof wrongAssignmentWebhookTaskPayloadSchema>;

/**
 * Union type of all webhook task payloads
 */
export type WebhookTaskPayload = z.infer<typeof webhookTaskPayloadSchema>;
