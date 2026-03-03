import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as eventTypeRepositoryModuleLoader } from "@calcom/features/di/modules/EventType";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { EventTypeService } from "../service/EventTypeService";

const thisModule = createModule();
const token = DI_TOKENS.EVENT_TYPE_SERVICE;
const moduleToken = DI_TOKENS.EVENT_TYPE_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: EventTypeService,
  dep: eventTypeRepositoryModuleLoader,
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;

export type { EventTypeService };
export type { EventTypeBrandingData } from "../service/EventTypeService";
