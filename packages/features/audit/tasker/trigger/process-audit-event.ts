import { schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";
import type { z } from "zod";
import { auditEventTaskConfig } from "./config";
import { AuditEventTaskPayloadSchema } from "./schema";

export const PROCESS_AUDIT_EVENT_JOB_ID = "audit.process-event";

export const processAuditEvent: TaskWithSchema<
  typeof PROCESS_AUDIT_EVENT_JOB_ID,
  typeof AuditEventTaskPayloadSchema
> = schemaTask({
  id: PROCESS_AUDIT_EVENT_JOB_ID,
  ...auditEventTaskConfig,
  schema: AuditEventTaskPayloadSchema,
  run: async (payload: z.infer<typeof AuditEventTaskPayloadSchema>) => {
    const { getAuditTaskConsumer } = await import("@calcom/features/audit/di/AuditTaskConsumer.container");
    const consumer = getAuditTaskConsumer();
    await consumer.processEvent(payload);
  },
});
