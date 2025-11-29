import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getBookingAuditTaskConsumer } from "@calcom/features/booking-audit/di/BookingAuditTaskConsumer.container";

const log = logger.getSubLogger({ prefix: ["[tasker] bookingAudit"] });

/**
 * Booking Audit Task Handler
 * 
 * Thin wrapper that parses JSON and delegates to BookingAuditTaskConsumer.
 * Schema validation happens in processAuditTask for better separation of concerns.
 * 
 */
export async function bookingAudit(payload: string, taskId?: string): Promise<void> {
    try {
        // Parse JSON - schema validation happens in processAuditTask
        const parsedPayload = JSON.parse(payload);

        log.info(`Processing booking audit: taskId=${taskId}`);

        // Get BookingAuditTaskConsumer instance and delegate processing
        const bookingAuditTaskConsumer = getBookingAuditTaskConsumer();
        await bookingAuditTaskConsumer.processAuditTask(parsedPayload, taskId);

        log.info(`Successfully processed booking audit: taskId=${taskId}`);
    } catch (error) {
        const errorMsg = `Error processing booking audit: ${safeStringify(error)} | TaskId: ${taskId}`;
        log.error(errorMsg);
        // Rethrow to trigger retry via Tasker
        throw error;
    }
}

