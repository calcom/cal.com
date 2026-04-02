import { createContainer } from "@calcom/features/di/di";
import {
  type WorkflowStepTranslationRepository,
  moduleLoader as workflowStepTranslationRepositoryModuleLoader,
} from "./WorkflowStepTranslationRepository.module";

const workflowStepTranslationRepositoryContainer = createContainer();

export function getWorkflowStepTranslationRepository(): WorkflowStepTranslationRepository {
  workflowStepTranslationRepositoryModuleLoader.loadModule(workflowStepTranslationRepositoryContainer);
  return workflowStepTranslationRepositoryContainer.get<WorkflowStepTranslationRepository>(
    workflowStepTranslationRepositoryModuleLoader.token
  );
}
