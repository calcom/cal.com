import type { ISimpleLogger } from "@calcom/features/di/shared/services/logger.service";

import { AuditEventTaskPayloadSchema, type AuditEventTaskPayload } from "../types/auditEventTask";

interface AuditTaskConsumerDeps {
  log: ISimpleLogger;
}

// Handles async delivery to Elastic. Postgres persistence is handled
// by AuditProducerService (fire-and-forget, after the business action).
export class AuditTaskConsumer {
  constructor(private readonly deps: AuditTaskConsumerDeps) {}

  async processEvent(payload: AuditEventTaskPayload): Promise<void> {
    const validated = AuditEventTaskPayloadSchema.parse(payload);

    // TODO: deliver to Elastic when OTel pipeline is integrated
    // After delivery, mark deliveredAt on the AuditEvent record

    this.deps.log.info(
      `Audit event ready for Elastic delivery: action=${validated.action}, target=${validated.targetType}:${validated.targetId}, operationId=${validated.operationId}`
    );
  }
}
