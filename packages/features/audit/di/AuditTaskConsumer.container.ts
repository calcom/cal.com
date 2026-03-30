import { createContainer } from "@calcom/features/di/di";
import type { AuditTaskConsumer } from "../tasker/AuditTaskConsumer";
import { moduleLoader as auditTaskConsumerModuleLoader } from "./AuditTaskConsumer.module";

const container = createContainer();

export function getAuditTaskConsumer(): AuditTaskConsumer {
  auditTaskConsumerModuleLoader.loadModule(container);
  return container.get<AuditTaskConsumer>(auditTaskConsumerModuleLoader.token);
}
