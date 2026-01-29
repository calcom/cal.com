import { createContainer } from "@calcom/features/di/di";

import { type WorkflowTasker, moduleLoader as workflowTaskerModuleLoader } from "./WorkflowTasker.module";

const workflowTaskerContainer = createContainer();

export function getWorkflowTasker(): WorkflowTasker {
  workflowTaskerModuleLoader.loadModule(workflowTaskerContainer);
  return workflowTaskerContainer.get<WorkflowTasker>(workflowTaskerModuleLoader.token);
}
