import {
  createDefaultValidators,
  ValidationPipeline,
} from "@calcom/features/bookings/lib/service/validation";
import type { Container, ModuleLoader } from "@calcom/features/di/di";
import { createModule } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";

const thisModule = createModule();
const token = DI_TOKENS.VALIDATION_PIPELINE;
const moduleToken = DI_TOKENS.VALIDATION_PIPELINE_MODULE;

thisModule.bind(token).toFactory(() => {
  const validators = createDefaultValidators();
  return new ValidationPipeline({ validators });
});

function loadModule(container: Container): void {
  container.load(moduleToken, thisModule);
}

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;

export type { ValidationPipeline } from "@calcom/features/bookings/lib/service/validation";
