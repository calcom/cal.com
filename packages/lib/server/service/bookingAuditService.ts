import type { BookingAudit, BookingAuditType, BookingAuditAction, Prisma, ActorType } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@calcom/prisma";

import type { IBookingAuditRepository } from "../repository/IBookingAuditRepository";
import { PrismaBookingAuditRepository } from "../repository/PrismaBookingAuditRepository";

export const BookingAuditDataSchema = z
  .object({
    version: z.number().optional(),
    actor: z
      .object({
        type: z.enum(["User", "System", "Attendee"]),
      })
      .optional(),
    booking: z
      .object({
        meetingTime: z.string().optional(),
        totalReschedules: z.number().optional(),
        attendeeCountChange: z.number().optional(),
        cancellationReason: z.string().optional(),
        rejectionReason: z.string().optional(),
        assignmentReason: z.string().optional(),
        reassignmentReason: z.string().optional(),
      })
      .optional(),
    attendee: z
      .object({
        id: z.string().optional(),
      })
      .optional(),
    meeting: z
      .object({
        provider: z.string().optional(),
        meetingId: z.string().optional(),
        meetingUrl: z.string().url().optional(),
      })
      .optional(),
    location: z
      .object({
        type: z.string().optional(),
        address: z.string().optional(),
        details: z.record(z.unknown()).optional(),
      })
      .optional(),
    changes: z
      .object({
        field: z.string(),
        oldValue: z.unknown().optional(),
        newValue: z.unknown().optional(),
      })
      .array()
      .optional(),
  })
  .optional();

export type BookingAuditData = z.infer<typeof BookingAuditDataSchema>;

export type CreateBookingAuditInput = {
  bookingId: string;
  actorId: string;
  type: BookingAuditType;
  action?: BookingAuditAction | null;
  data?: BookingAuditData | null;
};

const CURRENT_AUDIT_DATA_VERSION = 1;
const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

export class BookingAuditService {
  constructor(
    private readonly bookingAuditRepository: IBookingAuditRepository = new PrismaBookingAuditRepository()
  ) {}

  /**
   * Creates a BookingAuditService with default dependencies
   */
  static create(): BookingAuditService {
    return new BookingAuditService();
  }

  /**
   * Creates or finds an Actor record for a registered user
   * We store user information in Actor table to maintain audit trail even after user deletion
   */
  static async getOrCreateUserActor(userId: number): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }

    const actor = await prisma.actor.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        type: "USER" as ActorType,
        userId: user.id,
        email: user.email,
        name: user.name,
      },
    });

    return actor.id;
  }

  /**
   * Creates a booking audit record with standardized data structure
   */
  async createAuditRecord(input: CreateBookingAuditInput): Promise<BookingAudit> {
    const auditData: Prisma.BookingAuditCreateInput = {
      bookingId: input.bookingId,
      actorId: input.actorId,
      type: input.type,
      action: input.action,
      data: input.data
        ? ({
            ...input.data,
            version: CURRENT_AUDIT_DATA_VERSION,
          } as Prisma.InputJsonValue)
        : undefined,
    };

    return this.bookingAuditRepository.create(auditData);
  }

  /**
   * Creates an audit record for booking creation
   */
  async onBookingCreated(
    bookingId: string,
    userId: number,
    data?: Partial<BookingAuditData>
  ): Promise<BookingAudit> {
    const actorId = await BookingAuditService.getOrCreateUserActor(userId);
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_CREATED",
      action: "ACCEPTED",
      data: {
        actor: { type: "User" },
        ...data,
      },
    });
  }

  /**
   * Creates an audit record when booking status changes to accepted
   */
  async onBookingAccepted(
    bookingId: string,
    userId?: number,
    data?: Partial<BookingAuditData>
  ): Promise<BookingAudit> {
    const actorId = userId ? await BookingAuditService.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "ACCEPTED",
      data: {
        actor: { type: userId ? "User" : "System" },
        ...data,
      },
    });
  }

  /**
   * Creates an audit record when booking is rejected
   */
  async onBookingRejected(
    bookingId: string,
    userId?: number,
    data?: Partial<BookingAuditData>
  ): Promise<BookingAudit> {
    const actorId = userId ? await BookingAuditService.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "REJECTED",
      data: {
        actor: { type: userId ? "User" : "System" },
        ...data,
      },
    });
  }

  /**
   * Creates an audit record when booking status changes to pending
   */
  async onBookingPending(
    bookingId: string,
    userId?: number,
    data?: Partial<BookingAuditData>
  ): Promise<BookingAudit> {
    const actorId = userId ? await BookingAuditService.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "PENDING",
      data: {
        actor: { type: userId ? "User" : "System" },
        ...data,
      },
    });
  }

  /**
   * Creates an audit record when booking is awaiting host action
   */
  async onBookingAwaitingHost(
    bookingId: string,
    userId?: number,
    data?: Partial<BookingAuditData>
  ): Promise<BookingAudit> {
    const actorId = userId ? await BookingAuditService.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "AWAITING_HOST",
      data: {
        actor: { type: userId ? "User" : "System" },
        ...data,
      },
    });
  }

  /**
   * Creates an audit record for booking updates
   */
  async onBookingUpdated(
    bookingId: string,
    userId: number,
    data?: Partial<BookingAuditData>
  ): Promise<BookingAudit> {
    const actorId = await BookingAuditService.getOrCreateUserActor(userId);
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: null,
      data: {
        actor: { type: "User" },
        ...data,
      },
    });
  }

  /**
   * Creates an audit record for booking cancellation
   */
  async onBookingCancelled(
    bookingId: string,
    userId?: number,
    data?: Partial<BookingAuditData>
  ): Promise<BookingAudit> {
    const actorId = userId ? await BookingAuditService.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "CANCELLED",
      data: {
        actor: { type: userId ? "User" : "System" },
        ...data,
      },
    });
  }

  /**
   * Creates an audit record for booking reschedule
   */
  async onBookingRescheduled(
    bookingId: string,
    userId: number,
    data?: Partial<BookingAuditData>
  ): Promise<BookingAudit> {
    const actorId = await BookingAuditService.getOrCreateUserActor(userId);
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "RESCHEDULED",
      data: {
        actor: { type: "User" },
        ...data,
      },
    });
  }

  /**
   * Creates an audit record when reschedule is requested
   */
  async onRescheduleRequested(
    bookingId: string,
    userId: number,
    data?: Partial<BookingAuditData>
  ): Promise<BookingAudit> {
    const actorId = await BookingAuditService.getOrCreateUserActor(userId);
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "RESCHEDULE_REQUESTED",
      data: {
        actor: { type: "User" },
        ...data,
      },
    });
  }

  /**
   * Creates an audit record for attendee addition
   */
  async onAttendeeAdded(
    bookingId: string,
    userId: number,
    data?: Partial<BookingAuditData>
  ): Promise<BookingAudit> {
    const actorId = await BookingAuditService.getOrCreateUserActor(userId);
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "ATTENDEE_ADDED",
      data: {
        actor: { type: "User" },
        ...data,
      },
    });
  }

  /**
   * Creates an audit record for attendee removal
   */
  async onAttendeeRemoved(
    bookingId: string,
    userId: number,
    data?: Partial<BookingAuditData>
  ): Promise<BookingAudit> {
    const actorId = await BookingAuditService.getOrCreateUserActor(userId);
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "ATTENDEE_REMOVED",
      data: {
        actor: { type: "User" },
        ...data,
      },
    });
  }

  // ============== REASON UPDATES ==============

  /**
   * Creates an audit record when cancellation reason is updated
   */
  async onCancellationReasonUpdated(
    bookingId: string,
    userId: number,
    data?: Partial<BookingAuditData>
  ): Promise<BookingAudit> {
    const actorId = await BookingAuditService.getOrCreateUserActor(userId);
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "CANCELLATION_REASON_UPDATED",
      data: {
        actor: { type: "User" },
        ...data,
      },
    });
  }

  /**
   * Creates an audit record when rejection reason is updated
   */
  async onRejectionReasonUpdated(
    bookingId: string,
    userId: number,
    data?: Partial<BookingAuditData>
  ): Promise<BookingAudit> {
    const actorId = await BookingAuditService.getOrCreateUserActor(userId);
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "REJECTION_REASON_UPDATED",
      data: {
        actor: { type: "User" },
        ...data,
      },
    });
  }

  /**
   * Creates an audit record when assignment reason is updated
   */
  async onAssignmentReasonUpdated(
    bookingId: string,
    userId: number,
    data?: Partial<BookingAuditData>
  ): Promise<BookingAudit> {
    const actorId = await BookingAuditService.getOrCreateUserActor(userId);
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "ASSIGNMENT_REASON_UPDATED",
      data: {
        actor: { type: "User" },
        ...data,
      },
    });
  }

  /**
   * Creates an audit record when reassignment reason is updated
   */
  async onReassignmentReasonUpdated(
    bookingId: string,
    userId: number,
    data?: Partial<BookingAuditData>
  ): Promise<BookingAudit> {
    const actorId = await BookingAuditService.getOrCreateUserActor(userId);
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "REASSIGNMENT_REASON_UPDATED",
      data: {
        actor: { type: "User" },
        ...data,
      },
    });
  }

  // ============== MEETING DETAILS ==============

  /**
   * Creates an audit record when location is changed
   */
  async onLocationChanged(
    bookingId: string,
    userId: number,
    data?: Partial<BookingAuditData>
  ): Promise<BookingAudit> {
    const actorId = await BookingAuditService.getOrCreateUserActor(userId);
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "LOCATION_CHANGED",
      data: {
        actor: { type: "User" },
        ...data,
      },
    });
  }

  /**
   * Creates an audit record when meeting URL is updated
   */
  async onMeetingUrlUpdated(
    bookingId: string,
    userId?: number,
    data?: Partial<BookingAuditData>
  ): Promise<BookingAudit> {
    const actorId = userId ? await BookingAuditService.getOrCreateUserActor(userId) : SYSTEM_ACTOR_ID;
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "MEETING_URL_UPDATED",
      data: {
        actor: { type: userId ? "User" : "System" },
        ...data,
      },
    });
  }

  // ============== NO-SHOW TRACKING ==============

  /**
   * Creates an audit record when host no-show status is updated by Attendee
   */
  async onHostNoShowUpdated(
    bookingId: string,
    userId: number,
    data?: Partial<BookingAuditData>
  ): Promise<BookingAudit> {
    const actorId = await BookingAuditService.getOrCreateUserActor(userId);
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "HOST_NO_SHOW_UPDATED",
      data: {
        actor: { type: "Attendee" },
        ...data,
      },
    });
  }

  /**
   * Creates an audit record when attendee no-show status is updated by User
   */
  async onAttendeeNoShowUpdated(
    bookingId: string,
    userId: number,
    data?: Partial<BookingAuditData>
  ): Promise<BookingAudit> {
    const actorId = await BookingAuditService.getOrCreateUserActor(userId);
    return this.createAuditRecord({
      bookingId,
      actorId,
      type: "RECORD_UPDATED",
      action: "ATTENDEE_NO_SHOW_UPDATED",
      data: {
        actor: { type: "User" },
        ...data,
      },
    });
  }

  // ============== SYSTEM ACTIONS ==============

  /**
   * Creates an audit record for system-initiated actions (A catch all for system actions)
   */
  async onSystemAction(
    bookingId: string,
    type: BookingAuditType,
    action: BookingAuditAction,
    data?: Partial<BookingAuditData>
  ): Promise<BookingAudit> {
    return this.createAuditRecord({
      bookingId,
      actorId: SYSTEM_ACTOR_ID,
      type,
      action,
      data: {
        actor: { type: "System" },
        ...data,
      },
    });
  }
}
