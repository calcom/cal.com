import { createModule, type ModuleLoader } from "@calcom/features/di/di";
import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/workflow-repository";

import { ADMIN_DI_TOKENS } from "../tokens";

const thisModule = createModule();

// WorkflowRepository is a static class — bind it directly as a value.
thisModule
  .bind(ADMIN_DI_TOKENS.WORKFLOW_REMOVAL_SERVICE)
  .toFactory(() => WorkflowRepository);

export function loadModule(container: Parameters<ModuleLoader["loadModule"]>[0]): void {
  container.load(ADMIN_DI_TOKENS.WORKFLOW_REMOVAL_SERVICE_MODULE, thisModule);
}

export const workflowRemovalServiceModuleLoader: ModuleLoader = {
  token: ADMIN_DI_TOKENS.WORKFLOW_REMOVAL_SERVICE,
  loadModule,
};
