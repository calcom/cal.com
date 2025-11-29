import type { Actor } from "../../../bookings/lib/types/actor";
import type { BookingAuditActionData } from "../types/bookingAuditTask";

/**
 * BookingAuditProducerService Interface
 * 
 * Producer abstraction for queueing booking audit tasks.
 * Allows for multiple implementations (e.g., Tasker, Trigger.dev).
 * 
 * Implementations:
 * - BookingAuditTaskerProducerService: Uses Tasker for local/background jobs
 * - BookingAuditTriggerProducerService: (Future) Uses Trigger.dev for cloud jobs
 */
export interface BookingAuditProducerService {
    /**
     * Queue Audit - Push audit task for async processing
     * 
     * Single method that handles all audit types using discriminated union.
     * TypeScript ensures type safety between action and data.
     * 
     * @param bookingUid - The booking UID
     * @param actor - The actor performing the action
     * @param organizationId - The organization ID (null for non-org bookings)
     * @param actionData - Discriminated union of action type and its data
     * 
     * @example
     * await bookingAuditProducerService.queueAudit(bookingUid, actor, organizationId, {
     *   action: "CREATED",
     *   data: { startTime, endTime, status }
     * });
     */
    queueAudit(bookingUid: string, actor: Actor, organizationId: number | null, actionData: BookingAuditActionData): Promise<void>;
}

