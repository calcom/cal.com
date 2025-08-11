import { z } from "zod";

/**
 * Booking Audit Action Types
 */
export enum BookingAuditAction {
  CREATED = "CREATED",
  RESCHEDULED = "RESCHEDULED",
  CANCELLED = "CANCELLED",
  CONFIRMED = "CONFIRMED",
  REJECTED = "REJECTED",
  PAYMENT_INITIATED = "PAYMENT_INITIATED",
  PAYMENT_COMPLETED = "PAYMENT_COMPLETED",
  ATTENDEE_ADDED = "ATTENDEE_ADDED",
  ATTENDEE_REMOVED = "ATTENDEE_REMOVED",
}

/**
 * Base audit data schema
 */
const baseAuditDataSchema = z.object({
  eventTypeId: z.number(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  location: z.string().optional(),
  attendeeCount: z.number().default(1),
});

/**
 * Created booking audit data schema
 */
export const createdBookingAuditDataSchema = baseAuditDataSchema.extend({
  eventTypeName: z.string(),
  organizerId: z.number(),
  isConfirmed: z.boolean(),
  paymentRequired: z.boolean().optional(),
  seatsPerTimeSlot: z.number().optional(),
  recurringEventId: z.string().optional(),
});

/**
 * Rescheduled booking audit data schema
 */
export const rescheduledBookingAuditDataSchema = baseAuditDataSchema.extend({
  oldStartTime: z.string().datetime(),
  oldEndTime: z.string().datetime(),
  rescheduleReason: z.string().optional(),
  rescheduledBy: z.string().optional(),
  organizerChanged: z.boolean().optional(),
});

/**
 * Cancelled booking audit data schema
 */
export const cancelledBookingAuditDataSchema = baseAuditDataSchema.extend({
  cancellationReason: z.string().optional(),
  cancelledBy: z.string().optional(),
  noShow: z.boolean().optional(),
});

/**
 * Confirmed booking audit data schema
 */
export const confirmedBookingAuditDataSchema = baseAuditDataSchema.extend({
  confirmedBy: z.string().email().optional(),
  autoConfirmed: z.boolean().default(false),
});

/**
 * Rejected booking audit data schema
 */
export const rejectedBookingAuditDataSchema = baseAuditDataSchema.extend({
  rejectionReason: z.string().optional(),
  rejectedBy: z.string().email().optional(),
});

/**
 * Payment related audit data schema
 */
export const paymentAuditDataSchema = baseAuditDataSchema.extend({
  paymentId: z.number().optional(),
  paymentUid: z.string().optional(),
  amount: z.number(),
  currency: z.string(),
  paymentMethod: z.string().optional(),
  status: z.enum(["initiated", "succeeded", "failed", "refunded"]),
});

/**
 * Attendee management audit data schema
 */
export const attendeeAuditDataSchema = baseAuditDataSchema.extend({
  attendeeEmail: z.string().email(),
  attendeeName: z.string(),
  action: z.enum(["added", "removed"]),
  seatReferenceUid: z.string().optional(),
});

/**
 * Actor metadata schema
 */
export const actorMetadataSchema = z.object({
  userId: z.number().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  role: z.enum(["organizer", "attendee", "admin", "system"]).optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  platformClientId: z.string().optional(),
});

/**
 * Main booking audit schema factory
 */
export function getBookingAuditSchema(action: BookingAuditAction) {
  const baseSchema = z.object({
    bookingId: z.number(),
    action: z.literal(action),
    actor: z.string().optional(),
    version: z.number().default(1),
    createdAt: z.date().default(() => new Date()),
  });

  switch (action) {
    case BookingAuditAction.CREATED:
      return baseSchema.extend({
        data: createdBookingAuditDataSchema,
      });
    case BookingAuditAction.RESCHEDULED:
      return baseSchema.extend({
        data: rescheduledBookingAuditDataSchema,
      });
    case BookingAuditAction.CANCELLED:
      return baseSchema.extend({
        data: cancelledBookingAuditDataSchema,
      });
    case BookingAuditAction.CONFIRMED:
      return baseSchema.extend({
        data: confirmedBookingAuditDataSchema,
      });
    case BookingAuditAction.REJECTED:
      return baseSchema.extend({
        data: rejectedBookingAuditDataSchema,
      });
    case BookingAuditAction.PAYMENT_INITIATED:
    case BookingAuditAction.PAYMENT_COMPLETED:
      return baseSchema.extend({
        data: paymentAuditDataSchema,
      });
    case BookingAuditAction.ATTENDEE_ADDED:
    case BookingAuditAction.ATTENDEE_REMOVED:
      return baseSchema.extend({
        data: attendeeAuditDataSchema,
      });
    default:
      return baseSchema.extend({
        data: z.object({}).passthrough(),
      });
  }
}

/**
 * Booking audit input schema (for creating audit logs)
 */
export const bookingAuditInputSchema = z.object({
  bookingId: z.number(),
  action: z.nativeEnum(BookingAuditAction),
  actor: z.string().optional(),
  version: z.number().optional(),
  data: z.object({}).passthrough(),
});

export type BookingAuditInput = z.infer<typeof bookingAuditInputSchema>;
export type ActorMetadata = z.infer<typeof actorMetadataSchema>;
export type CreatedBookingAuditData = z.infer<typeof createdBookingAuditDataSchema>;
export type RescheduledBookingAuditData = z.infer<typeof rescheduledBookingAuditDataSchema>;
export type CancelledBookingAuditData = z.infer<typeof cancelledBookingAuditDataSchema>;
export type ConfirmedBookingAuditData = z.infer<typeof confirmedBookingAuditDataSchema>;
export type RejectedBookingAuditData = z.infer<typeof rejectedBookingAuditDataSchema>;
export type PaymentAuditData = z.infer<typeof paymentAuditDataSchema>;
export type AttendeeAuditData = z.infer<typeof attendeeAuditDataSchema>;
