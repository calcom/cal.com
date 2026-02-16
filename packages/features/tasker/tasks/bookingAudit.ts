import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getBookingAuditTaskConsumer } from "@calcom/features/booking-audit/di/BookingAuditTaskConsumer.container";
import { BookingAuditTaskConsumerSchema } from "@calcom/features/booking-audit/lib/types/bookingAuditTask";

const log = logger.getSubLogger({ prefix: ["[tasker] bookingAudit"] });

/**
 * Booking Audit Task Handler
 *
 * Thin wrapper that parses JSON and delegates to BookingAuditTaskConsumer.
 * Routes to processAuditTask or processBulkAuditTask based on isBulk field.
 *
 */
export async function bookingAudit(payload: string, taskId?: string): Promise<void> {
  try {
    if (!taskId) {
      throw new Error("Task ID is required for booking audit consumer");
    }
    const parsedPayload: unknown = JSON.parse(payload);

    const parseResult = BookingAuditTaskConsumerSchema.safeParse(parsedPayload);

    if (!parseResult.success) {
      const errorMsg = `Invalid booking audit payload: ${safeStringify(parseResult.error.errors)} | TaskId: ${taskId}`;
      log.error(errorMsg);
      throw new Error(errorMsg);
    }

    const validatedPayload = parseResult.data;
    const bookingAuditTaskConsumer = getBookingAuditTaskConsumer();

    if (validatedPayload.isBulk) {
      await bookingAuditTaskConsumer.processBulkAuditTask(validatedPayload, taskId);
    } else {
      await bookingAuditTaskConsumer.processAuditTask(validatedPayload, taskId);
    }
  } catch (error) {
    const errorMsg = `Error processing booking audit: ${safeStringify(error)} | TaskId: ${taskId}`;
    log.error(errorMsg);
    // Rethrow to trigger retry via Tasker
    throw error;
  }
}
