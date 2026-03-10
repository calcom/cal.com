import type {
  BulkBookingAuditTaskConsumerPayload,
  SingleBookingAuditTaskConsumerPayload,
} from "./trigger/schema";

export interface IBookingAuditTasker {
  processAuditTask(payload: SingleBookingAuditTaskConsumerPayload): Promise<{ runId: string }>;

  processBulkAuditTask(payload: BulkBookingAuditTaskConsumerPayload): Promise<{ runId: string }>;
}
