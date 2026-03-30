import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerModuleLoader } from "@calcom/features/di/shared/services/logger.service";
import { AuditTasker } from "../tasker/AuditTasker";
import { moduleLoader as auditSyncTaskerModuleLoader } from "./AuditSyncTasker.module";
import { moduleLoader as auditTriggerTaskerModuleLoader } from "./AuditTriggerTasker.module";
import { AUDIT_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = AUDIT_DI_TOKENS.AUDIT_TASKER;
const moduleToken = AUDIT_DI_TOKENS.AUDIT_TASKER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: AuditTasker,
  depsMap: {
    logger: loggerModuleLoader,
    syncTasker: auditSyncTaskerModuleLoader,
    asyncTasker: auditTriggerTaskerModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
