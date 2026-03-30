import { createContainer } from "@calcom/features/di/di";
import logger from "@calcom/lib/logger";
import type { AuditEmitInput, AuditProducerService } from "../services/AuditProducerService";
import { moduleLoader as auditProducerServiceModuleLoader } from "./AuditProducerService.module";

const container = createContainer();
const log = logger.getSubLogger({ prefix: ["audit"] });

export function getAuditProducerService(): AuditProducerService {
  auditProducerServiceModuleLoader.loadModule(container);
  return container.get<AuditProducerService>(auditProducerServiceModuleLoader.token);
}

export async function emitAuditEvent(input: AuditEmitInput): Promise<void> {
  try {
    const producer = getAuditProducerService();
    await producer.emit(input);
  } catch (error) {
    log.error("Audit event failed", { action: input.action, error });
  }
}
