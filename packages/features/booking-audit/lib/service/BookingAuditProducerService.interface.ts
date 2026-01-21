import type { z } from "zod";

import type { Actor, BookingAuditContext } from "../dto/types";
import type { ActionSource } from "../types/actionSource";
import type { AcceptedAuditActionService } from "../actions/AcceptedAuditActionService";
import type { AttendeeAddedAuditActionService } from "../actions/AttendeeAddedAuditActionService";
import type { AttendeeNoShowUpdatedAuditActionService } from "../actions/AttendeeNoShowUpdatedAuditActionService";
import type { AttendeeRemovedAuditActionService } from "../actions/AttendeeRemovedAuditActionService";
import type { CancelledAuditActionService } from "../actions/CancelledAuditActionService";
import type { CreatedAuditActionService } from "../actions/CreatedAuditActionService";
import type { HostNoShowUpdatedAuditActionService } from "../actions/HostNoShowUpdatedAuditActionService";
import type { LocationChangedAuditActionService } from "../actions/LocationChangedAuditActionService";
import type { ReassignmentAuditActionService } from "../actions/ReassignmentAuditActionService";
import type { RejectedAuditActionService } from "../actions/RejectedAuditActionService";
import type { RescheduleRequestedAuditActionService } from "../actions/RescheduleRequestedAuditActionService";
import type { RescheduledAuditActionService } from "../actions/RescheduledAuditActionService";
import type { SeatBookedAuditActionService } from "../actions/SeatBookedAuditActionService";
import type { SeatRescheduledAuditActionService } from "../actions/SeatRescheduledAuditActionService";

/**
 * BookingAuditProducerService Interface
 *
 * Producer abstraction for queueing booking audit tasks.
 * Allows for multiple implementations (e.g., Tasker, Trigger.dev).
 *
 * Uses specialized methods per action type for better TypeScript performance
 * and type safety, avoiding large discriminated unions.
 *
 * Implementations:
 * - BookingAuditTaskerProducerService: Uses Tasker for local/background jobs
 * - BookingAuditTriggerProducerService: (Future) Uses Trigger.dev for cloud jobs
 */
export interface BookingAuditProducerService {
  queueCreatedAudit(params: {
    bookingUid: string;
    actor: Actor;
    organizationId: number | null;
    source: ActionSource;
    operationId?: string | null;
    data: z.infer<typeof CreatedAuditActionService.latestFieldsSchema>;
    context?: BookingAuditContext;
  }): Promise<void>;

  queueRescheduledAudit(params: {
    bookingUid: string;
    actor: Actor;
    organizationId: number | null;
    source: ActionSource;
    operationId?: string | null;
    data: z.infer<typeof RescheduledAuditActionService.latestFieldsSchema>;
    context?: BookingAuditContext;
  }): Promise<void>;

  queueAcceptedAudit(params: {
    bookingUid: string;
    actor: Actor;
    organizationId: number | null;
    source: ActionSource;
    operationId?: string | null;
    data: z.infer<typeof AcceptedAuditActionService.latestFieldsSchema>;
    context?: BookingAuditContext;
  }): Promise<void>;

  queueCancelledAudit(params: {
    bookingUid: string;
    actor: Actor;
    organizationId: number | null;
    source: ActionSource;
    operationId?: string | null;
    data: z.infer<typeof CancelledAuditActionService.latestFieldsSchema>;
    context?: BookingAuditContext;
  }): Promise<void>;

  queueRescheduleRequestedAudit(params: {
    bookingUid: string;
    actor: Actor;
    organizationId: number | null;
    source: ActionSource;
    operationId?: string | null;
    data: z.infer<typeof RescheduleRequestedAuditActionService.latestFieldsSchema>;
    context?: BookingAuditContext;
  }): Promise<void>;

  queueAttendeeAddedAudit(params: {
    bookingUid: string;
    actor: Actor;
    organizationId: number | null;
    source: ActionSource;
    operationId?: string | null;
    data: z.infer<typeof AttendeeAddedAuditActionService.latestFieldsSchema>;
    context?: BookingAuditContext;
  }): Promise<void>;

  queueHostNoShowUpdatedAudit(params: {
    bookingUid: string;
    actor: Actor;
    organizationId: number | null;
    source: ActionSource;
    operationId?: string | null;
    data: z.infer<typeof HostNoShowUpdatedAuditActionService.latestFieldsSchema>;
    context?: BookingAuditContext;
  }): Promise<void>;

  queueRejectedAudit(params: {
    bookingUid: string;
    actor: Actor;
    organizationId: number | null;
    source: ActionSource;
    operationId?: string | null;
    data: z.infer<typeof RejectedAuditActionService.latestFieldsSchema>;
    context?: BookingAuditContext;
  }): Promise<void>;

  queueAttendeeRemovedAudit(params: {
    bookingUid: string;
    actor: Actor;
    organizationId: number | null;
    source: ActionSource;
    operationId?: string | null;
    data: z.infer<typeof AttendeeRemovedAuditActionService.latestFieldsSchema>;
    context?: BookingAuditContext;
  }): Promise<void>;

  queueReassignmentAudit(params: {
    bookingUid: string;
    actor: Actor;
    organizationId: number | null;
    source: ActionSource;
    operationId?: string | null;
    data: z.infer<typeof ReassignmentAuditActionService.latestFieldsSchema>;
    context?: BookingAuditContext;
  }): Promise<void>;

  queueLocationChangedAudit(params: {
    bookingUid: string;
    actor: Actor;
    organizationId: number | null;
    source: ActionSource;
    operationId?: string | null;
    data: z.infer<typeof LocationChangedAuditActionService.latestFieldsSchema>;
    context?: BookingAuditContext;
  }): Promise<void>;

  queueAttendeeNoShowUpdatedAudit(params: {
    bookingUid: string;
    actor: Actor;
    organizationId: number | null;
    source: ActionSource;
    operationId?: string | null;
    data: z.infer<typeof AttendeeNoShowUpdatedAuditActionService.latestFieldsSchema>;
    context?: BookingAuditContext;
  }): Promise<void>;

  queueSeatBookedAudit(params: {
    bookingUid: string;
    actor: Actor;
    organizationId: number | null;
    source: ActionSource;
    operationId?: string | null;
    data: z.infer<typeof SeatBookedAuditActionService.latestFieldsSchema>;
    context?: BookingAuditContext;
  }): Promise<void>;

  queueSeatRescheduledAudit(params: {
    bookingUid: string;
    actor: Actor;
    organizationId: number | null;
    source: ActionSource;
    operationId?: string | null;
    data: z.infer<typeof SeatRescheduledAuditActionService.latestFieldsSchema>;
    context?: BookingAuditContext;
  }): Promise<void>;

  /**
   * Queues a bulk accepted audit task for multiple bookings
   */
  queueBulkAcceptedAudit(params: {
    bookings: Array<{
      bookingUid: string;
      data: z.infer<typeof AcceptedAuditActionService.latestFieldsSchema>;
    }>;
    actor: Actor;
    organizationId: number | null;
    source: ActionSource;
    operationId?: string | null;
    context?: BookingAuditContext;
  }): Promise<void>;

  /**
   * Queues a bulk cancelled audit task for multiple bookings
   */
  queueBulkCancelledAudit(params: {
    bookings: Array<{
      bookingUid: string;
      data: z.infer<typeof CancelledAuditActionService.latestFieldsSchema>;
    }>;
    actor: Actor;
    organizationId: number | null;
    source: ActionSource;
    operationId?: string | null;
    context?: BookingAuditContext;
  }): Promise<void>;

  queueBulkCreatedAudit(params: {
    bookings: Array<{
      bookingUid: string;
      data: z.infer<typeof CreatedAuditActionService.latestFieldsSchema>;
    }>;
    actor: Actor;
    organizationId: number | null;
    source: ActionSource;
    operationId?: string | null;
  }): Promise<void>;

  queueBulkRescheduledAudit(params: {
    bookings: Array<{
      bookingUid: string;
      data: z.infer<typeof RescheduledAuditActionService.latestFieldsSchema>;
    }>;
    actor: Actor;
    organizationId: number | null;
    source: ActionSource;
    operationId?: string | null;
  }): Promise<void>;

  queueBulkRejectedAudit(params: {
    bookings: Array<{
      bookingUid: string;
      data: z.infer<typeof RejectedAuditActionService.latestFieldsSchema>;
    }>;
    actor: Actor;
    organizationId: number | null;
    source: ActionSource;
    operationId?: string | null;
    context?: BookingAuditContext;
  }): Promise<void>;
}
