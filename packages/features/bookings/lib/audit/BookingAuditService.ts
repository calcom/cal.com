import type { Prisma } from "@prisma/client";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";

import {
  BookingAuditAction,
  type BookingAuditInput,
  getBookingAuditSchema,
  type ActorMetadata,
} from "./bookingAudit.schemas";

const log = logger.getSubLogger({ prefix: ["BookingAuditService"] });

export class BookingAuditService {
  /**
   * Creates a booking audit log entry
   */
  static async create(input: BookingAuditInput): Promise<void> {
    try {
      // Validate input using the appropriate schema
      const schema = getBookingAuditSchema(input.action);
      const validatedInput = schema.parse({
        ...input,
        createdAt: new Date(),
      });

      // Create the audit log entry
      await prisma.bookingAudit.create({
        data: {
          bookingId: validatedInput.bookingId,
          action: validatedInput.action,
          actor: validatedInput.actor,
          version: validatedInput.version,
          data: validatedInput.data as Prisma.InputJsonValue,
          createdAt: validatedInput.createdAt,
        },
      });

      log.info(
        `Booking audit logged: ${input.action} for booking ${input.bookingId}`,
        safeStringify({
          bookingId: input.bookingId,
          action: input.action,
          actor: input.actor,
          dataKeys: Object.keys(input.data || {}),
        })
      );
    } catch (error) {
      // Log the error but don't throw to avoid breaking the main booking flow
      log.error(
        `Failed to create booking audit log for action ${input.action} on booking ${input.bookingId}`,
        safeStringify({
          error: error instanceof Error ? error.message : "Unknown error",
          input: {
            bookingId: input.bookingId,
            action: input.action,
            actor: input.actor,
          },
        })
      );
    }
  }

  /**
   * Creates a booking audit log for booking creation
   */
  static async logBookingCreated(params: {
    bookingId: number;
    eventTypeId: number;
    eventTypeName: string;
    organizerId: number;
    startTime: string | Date;
    endTime: string | Date;
    location?: string;
    attendeeCount?: number;
    isConfirmed: boolean;
    paymentRequired?: boolean;
    seatsPerTimeSlot?: number;
    recurringEventId?: string;
    actor?: ActorMetadata;
  }): Promise<void> {
    const startTimeISO =
      typeof params.startTime === "string" ? params.startTime : params.startTime.toISOString();
    const endTimeISO = typeof params.endTime === "string" ? params.endTime : params.endTime.toISOString();

    await this.create({
      bookingId: params.bookingId,
      action: BookingAuditAction.CREATED,
      actor: params.actor ? this.serializeActor(params.actor) : undefined,
      data: {
        eventTypeId: params.eventTypeId,
        eventTypeName: params.eventTypeName,
        organizerId: params.organizerId,
        startTime: startTimeISO,
        endTime: endTimeISO,
        location: params.location,
        attendeeCount: params.attendeeCount ?? 1,
        isConfirmed: params.isConfirmed,
        paymentRequired: params.paymentRequired,
        seatsPerTimeSlot: params.seatsPerTimeSlot,
        recurringEventId: params.recurringEventId,
      },
    });
  }

  /**
   * Creates a booking audit log for booking rescheduling
   */
  static async logBookingRescheduled(params: {
    bookingId: number;
    eventTypeId: number;
    originalStartTime: Date;
    originalEndTime: Date;
    newStartTime: Date;
    newEndTime: Date;
    location?: string;
    attendeeCount?: number;
    rescheduleReason?: string;
    rescheduledBy?: string;
    organizerChanged?: boolean;
    actor?: ActorMetadata;
  }): Promise<void> {
    await this.create({
      bookingId: params.bookingId,
      action: BookingAuditAction.RESCHEDULED,
      actor: params.actor ? this.serializeActor(params.actor) : undefined,
      data: {
        eventTypeId: params.eventTypeId,
        startTime: params.newStartTime.toISOString(),
        endTime: params.newEndTime.toISOString(),
        oldStartTime: params.originalStartTime.toISOString(),
        oldEndTime: params.originalEndTime.toISOString(),
        location: params.location,
        attendeeCount: params.attendeeCount ?? 1,
        rescheduleReason: params.rescheduleReason,
        rescheduledBy: params.rescheduledBy,
        organizerChanged: params.organizerChanged,
      },
    });
  }

  /**
   * Creates a booking audit log for booking cancellation
   */
  static async logBookingCancelled(params: {
    bookingId: number;
    eventTypeId?: number;
    startTime?: Date;
    endTime?: Date;
    cancellationReason?: string;
    cancelledBy?: string;
    noShow?: boolean;
    actor?: ActorMetadata;
  }): Promise<void> {
    await this.create({
      bookingId: params.bookingId,
      action: BookingAuditAction.CANCELLED,
      actor: params.actor ? this.serializeActor(params.actor) : undefined,
      data: {
        eventTypeId: params.eventTypeId,
        startTime: params.startTime?.toISOString(),
        endTime: params.endTime?.toISOString(),
        cancellationReason: params.cancellationReason,
        cancelledBy: params.cancelledBy,
        noShow: params.noShow,
      },
    });
  }

  /**
   * Creates a booking audit log for booking confirmation
   */
  static async logBookingConfirmed(params: {
    bookingId: number;
    eventTypeId: number;
    startTime: Date;
    endTime: Date;
    location?: string;
    attendeeCount?: number;
    confirmedBy?: string;
    autoConfirmed?: boolean;
    actor?: ActorMetadata;
  }): Promise<void> {
    await this.create({
      bookingId: params.bookingId,
      action: BookingAuditAction.CONFIRMED,
      actor: params.actor ? this.serializeActor(params.actor) : undefined,
      data: {
        eventTypeId: params.eventTypeId,
        startTime: params.startTime.toISOString(),
        endTime: params.endTime.toISOString(),
        location: params.location,
        attendeeCount: params.attendeeCount ?? 1,
        confirmedBy: params.confirmedBy,
        autoConfirmed: params.autoConfirmed ?? false,
      },
    });
  }

  /**
   * Creates a booking audit log for booking rejection
   */
  static async logBookingRejected(params: {
    bookingId: number;
    eventTypeId: number;
    startTime: Date;
    endTime: Date;
    location?: string;
    attendeeCount?: number;
    rejectionReason?: string;
    rejectedBy?: string;
    actor?: ActorMetadata;
  }): Promise<void> {
    await this.create({
      bookingId: params.bookingId,
      action: BookingAuditAction.REJECTED,
      actor: params.actor ? this.serializeActor(params.actor) : undefined,
      data: {
        eventTypeId: params.eventTypeId,
        startTime: params.startTime.toISOString(),
        endTime: params.endTime.toISOString(),
        location: params.location,
        attendeeCount: params.attendeeCount ?? 1,
        rejectionReason: params.rejectionReason,
        rejectedBy: params.rejectedBy,
      },
    });
  }

  /**
   * Creates a booking audit log for payment events
   */
  static async logPaymentEvent(params: {
    bookingId: number;
    eventTypeId: number;
    startTime: Date;
    endTime: Date;
    location?: string;
    attendeeCount?: number;
    paymentId?: number;
    paymentUid?: string;
    amount: number;
    currency: string;
    paymentMethod?: string;
    status: "initiated" | "succeeded" | "failed" | "refunded";
    actor?: ActorMetadata;
  }): Promise<void> {
    const action =
      params.status === "initiated"
        ? BookingAuditAction.PAYMENT_INITIATED
        : BookingAuditAction.PAYMENT_COMPLETED;

    await this.create({
      bookingId: params.bookingId,
      action,
      actor: params.actor ? this.serializeActor(params.actor) : undefined,
      data: {
        eventTypeId: params.eventTypeId,
        startTime: params.startTime.toISOString(),
        endTime: params.endTime.toISOString(),
        location: params.location,
        attendeeCount: params.attendeeCount ?? 1,
        paymentId: params.paymentId,
        paymentUid: params.paymentUid,
        amount: params.amount,
        currency: params.currency,
        paymentMethod: params.paymentMethod,
        status: params.status,
      },
    });
  }

  /**
   * Creates a booking audit log for attendee management
   */
  static async logAttendeeEvent(params: {
    bookingId: number;
    eventTypeId: number;
    startTime: Date;
    endTime: Date;
    location?: string;
    attendeeCount?: number;
    attendeeEmail: string;
    attendeeName: string;
    action: "added" | "removed";
    seatReferenceUid?: string;
    actor?: ActorMetadata;
  }): Promise<void> {
    const auditAction =
      params.action === "added" ? BookingAuditAction.ATTENDEE_ADDED : BookingAuditAction.ATTENDEE_REMOVED;

    await this.create({
      bookingId: params.bookingId,
      action: auditAction,
      actor: params.actor ? this.serializeActor(params.actor) : undefined,
      data: {
        eventTypeId: params.eventTypeId,
        startTime: params.startTime.toISOString(),
        endTime: params.endTime.toISOString(),
        location: params.location,
        attendeeCount: params.attendeeCount ?? 1,
        attendeeEmail: params.attendeeEmail,
        attendeeName: params.attendeeName,
        action: params.action,
        seatReferenceUid: params.seatReferenceUid,
      },
    });
  }

  /**
   * Retrieves audit logs for a specific booking
   */
  static async getBookingAuditLogs(bookingId: number) {
    try {
      return await prisma.bookingAudit.findMany({
        select: {
          id: true,
          bookingId: true,
          action: true,
          actor: true,
          version: true,
          data: true,
          createdAt: true,
        },
        where: {
          bookingId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } catch (error) {
      log.error(
        `Failed to retrieve audit logs for booking ${bookingId}`,
        safeStringify({
          error: error instanceof Error ? error.message : "Unknown error",
          bookingId,
        })
      );
      return [];
    }
  }

  /**
   * Alias for getBookingAuditLogs for backward compatibility
   */
  static async getAuditLogs(bookingId: number) {
    return this.getBookingAuditLogs(bookingId);
  }

  /**
   * Retrieves audit logs for multiple bookings
   */
  static async getMultipleBookingAuditLogs(bookingIds: number[]) {
    try {
      return await prisma.bookingAudit.findMany({
        where: {
          bookingId: {
            in: bookingIds,
          },
        },
        orderBy: [
          {
            bookingId: "asc",
          },
          {
            createdAt: "desc",
          },
        ],
      });
    } catch (error) {
      log.error(
        "Failed to retrieve audit logs for multiple bookings",
        safeStringify({
          error: error instanceof Error ? error.message : "Unknown error",
          bookingIds,
        })
      );
      return [];
    }
  }

  /**
   * Serializes actor metadata to a string for storage
   */
  private static serializeActor(actor: ActorMetadata): string {
    try {
      return JSON.stringify(actor);
    } catch (error) {
      log.warn("Failed to serialize actor metadata", safeStringify({ actor, error }));
      return JSON.stringify({ error: "Failed to serialize actor data" });
    }
  }

  /**
   * Deserializes actor metadata from a stored string
   */
  static deserializeActor(actorString: string): ActorMetadata | null {
    try {
      return JSON.parse(actorString);
    } catch (error) {
      log.warn("Failed to deserialize actor metadata", safeStringify({ actorString, error }));
      return null;
    }
  }
}

export default BookingAuditService;
