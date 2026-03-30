import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { AuditSyncTasker } from "../tasker/AuditSyncTasker";
import { moduleLoader as auditTaskConsumerModuleLoader } from "./AuditTaskConsumer.module";
import { AUDIT_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = AUDIT_DI_TOKENS.AUDIT_SYNC_TASKER;
const moduleToken = AUDIT_DI_TOKENS.AUDIT_SYNC_TASKER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: AuditSyncTasker,
  depsMap: {
    auditTaskConsumer: auditTaskConsumerModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
