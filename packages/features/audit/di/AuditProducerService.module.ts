import { moduleLoader as auditActorRepositoryModuleLoader } from "@calcom/features/booking-audit/di/AuditActorRepository.module";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerModuleLoader } from "@calcom/features/di/shared/services/logger.service";

import { AuditProducerService } from "../services/AuditProducerService";
import { moduleLoader as auditEventRepositoryModuleLoader } from "./PrismaAuditEventRepository.module";
import { AUDIT_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = AUDIT_DI_TOKENS.AUDIT_PRODUCER_SERVICE;
const moduleToken = AUDIT_DI_TOKENS.AUDIT_PRODUCER_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: AuditProducerService,
  depsMap: {
    auditEventRepository: auditEventRepositoryModuleLoader,
    auditActorRepository: auditActorRepositoryModuleLoader,
    log: loggerModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
