import { z } from "zod";

import type { Actor, BookingAuditContext } from "../dto/types";
import type { ActionSource } from "../types/actionSource";
import { AcceptedAuditActionService } from "../actions/AcceptedAuditActionService";
import { AttendeeAddedAuditActionService } from "../actions/AttendeeAddedAuditActionService";
import { AttendeeRemovedAuditActionService } from "../actions/AttendeeRemovedAuditActionService";
import { CancelledAuditActionService } from "../actions/CancelledAuditActionService";
import { CreatedAuditActionService } from "../actions/CreatedAuditActionService";
import { LocationChangedAuditActionService } from "../actions/LocationChangedAuditActionService";
import { NoShowUpdatedAuditActionService } from "../actions/NoShowUpdatedAuditActionService";
import { ReassignmentAuditActionService } from "../actions/ReassignmentAuditActionService";
import { RejectedAuditActionService } from "../actions/RejectedAuditActionService";
import { RescheduleRequestedAuditActionService } from "../actions/RescheduleRequestedAuditActionService";
import { RescheduledAuditActionService } from "../actions/RescheduledAuditActionService";
import { SeatBookedAuditActionService } from "../actions/SeatBookedAuditActionService";
import { SeatRescheduledAuditActionService } from "../actions/SeatRescheduledAuditActionService";

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

  queueNoShowUpdatedAudit(params: {
    bookingUid: string;
    actor: Actor;
    organizationId: number | null;
    source: ActionSource;
    operationId?: string | null;
    data: z.infer<typeof NoShowUpdatedAuditActionService.latestFieldsSchema>;
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
