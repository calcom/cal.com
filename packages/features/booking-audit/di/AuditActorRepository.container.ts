import { createContainer } from "@calcom/features/di/di";
import type { IAuditActorRepository } from "@calcom/features/booking-audit/lib/repository/IAuditActorRepository";

import { moduleLoader as auditActorRepositoryModule } from "./AuditActorRepository.module";

const container = createContainer();

export function getAuditActorRepository(): IAuditActorRepository {
  auditActorRepositoryModule.loadModule(container);

  return container.get<IAuditActorRepository>(auditActorRepositoryModule.token);
}
