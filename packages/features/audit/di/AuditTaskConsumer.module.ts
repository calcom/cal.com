import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerModuleLoader } from "@calcom/features/di/shared/services/logger.service";

import { AuditTaskConsumer } from "../tasker/AuditTaskConsumer";
import { AUDIT_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = AUDIT_DI_TOKENS.AUDIT_TASK_CONSUMER;
const moduleToken = AUDIT_DI_TOKENS.AUDIT_TASK_CONSUMER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: AuditTaskConsumer,
  depsMap: {
    log: loggerModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
