import { schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";
import type { z } from "zod";
import { bookingAuditTaskConfig } from "./config";
import { BulkBookingAuditTaskConsumerSchema } from "./schema";

export const PROCESS_BULK_AUDIT_TASK_JOB_ID = "booking-audit.process-bulk-audit-task";

export const processBulkAuditTask: TaskWithSchema<
  typeof PROCESS_BULK_AUDIT_TASK_JOB_ID,
  typeof BulkBookingAuditTaskConsumerSchema
> = schemaTask({
  id: PROCESS_BULK_AUDIT_TASK_JOB_ID,
  ...bookingAuditTaskConfig,
  schema: BulkBookingAuditTaskConsumerSchema,
  run: async (payload: z.infer<typeof BulkBookingAuditTaskConsumerSchema>) => {
    const { getBookingAuditTaskConsumer } = await import(
      "@calcom/features/booking-audit/di/BookingAuditTaskConsumer.container"
    );
    const consumer = getBookingAuditTaskConsumer();
    await consumer.processBulkAuditTask(payload);
  },
});
