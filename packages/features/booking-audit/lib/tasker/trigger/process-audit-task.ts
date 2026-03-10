import { schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";
import type { z } from "zod";
import { bookingAuditTaskConfig } from "./config";
import { SingleBookingAuditTaskConsumerSchema } from "./schema";

export const PROCESS_AUDIT_TASK_JOB_ID = "booking-audit.process-audit-task";

export const processAuditTask: TaskWithSchema<
  typeof PROCESS_AUDIT_TASK_JOB_ID,
  typeof SingleBookingAuditTaskConsumerSchema
> = schemaTask({
  id: PROCESS_AUDIT_TASK_JOB_ID,
  ...bookingAuditTaskConfig,
  schema: SingleBookingAuditTaskConsumerSchema,
  run: async (payload: z.infer<typeof SingleBookingAuditTaskConsumerSchema>) => {
    const { getBookingAuditTaskConsumer } = await import(
      "@calcom/features/booking-audit/di/BookingAuditTaskConsumer.container"
    );
    const consumer = getBookingAuditTaskConsumer();
    await consumer.processAuditTask(payload);
  },
});
