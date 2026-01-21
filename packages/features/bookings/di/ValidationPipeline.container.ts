import { createContainer } from "@calcom/features/di/di";
import type { ValidationPipeline } from "./ValidationPipeline.module";
import { moduleLoader as validationPipelineModuleLoader } from "./ValidationPipeline.module";

const validationPipelineContainer = createContainer();

export function getValidationPipeline(): ValidationPipeline {
  validationPipelineModuleLoader.loadModule(validationPipelineContainer);
  return validationPipelineContainer.get<ValidationPipeline>(validationPipelineModuleLoader.token);
}
