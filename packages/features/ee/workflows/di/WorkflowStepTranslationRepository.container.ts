import { createContainer } from "@calcom/features/di/di";

import {
  moduleLoader as workflowStepTranslationRepositoryModuleLoader,
  type WorkflowStepTranslationRepository,
} from "./WorkflowStepTranslationRepository.module";

const workflowStepTranslationRepositoryContainer = createContainer();

export function getWorkflowStepTranslationRepository(): WorkflowStepTranslationRepository {
  workflowStepTranslationRepositoryModuleLoader.loadModule(workflowStepTranslationRepositoryContainer);
  return workflowStepTranslationRepositoryContainer.get<WorkflowStepTranslationRepository>(
    workflowStepTranslationRepositoryModuleLoader.token
  );
}
