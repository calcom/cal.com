import type { Tasker } from "@calcom/features/tasker/tasker";

import type { Actor } from "../../../bookings/lib/types/actor";
import type { BookingAuditTaskProducerActionData } from "../types/bookingAuditTask";
import type { BookingAuditProducerService } from "./BookingAuditProducerService.interface";

interface BookingAuditTaskerProducerServiceDeps {
    tasker: Tasker;
}

/**
 * BookingAuditTaskerProducerService - Tasker-based implementation of BookingAuditProducerService
 * 
 * Producer that uses Tasker for local/background job processing.
 * Task processing is handled by BookingAuditTaskConsumer.
 * 
 * For future migration to trigger.dev, create BookingAuditTriggerProducerService
 * that implements the same BookingAuditProducerService interface.
 */
export class BookingAuditTaskerProducerService implements BookingAuditProducerService {
    private readonly tasker: Tasker;

    constructor(private readonly deps: BookingAuditTaskerProducerServiceDeps) {
        this.tasker = deps.tasker;
    }

    /**
     * Queue Audit - Push audit task to Tasker for async processing
     * 
     * Single method that handles all audit types using discriminated union.
     * TypeScript ensures type safety between action and data.
     * Timestamp is automatically captured when the task is queued.
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
    async queueAudit(bookingUid: string, actor: Actor, organizationId: number | null, actionData: BookingAuditTaskProducerActionData): Promise<void> {
        // Skip queueing for non-organization bookings
        if (organizationId === null) {
            return;
        }

        await this.tasker.create("bookingAudit", {
            bookingUid,
            actor,
            organizationId,
            timestamp: Date.now(),
            ...actionData,
        });
    }
}
