import { createModule } from "@evyweb/ioctopus";

import { bindModuleToClassOnToken, type ModuleLoader } from "@calcom/features/di/di";
import { TriggerDevLogger } from "@calcom/lib/triggerDevLogger";

import { SHARED_TOKENS } from "../shared.tokens";

const thisModule = createModule();
const token = SHARED_TOKENS.TRIGGER_DEV_LOGGER;
const moduleToken = SHARED_TOKENS.TRIGGER_DEV_LOGGER_MODULE;

class TriggerDevLoggerService extends TriggerDevLogger {
  constructor() {
    super();
  }
}

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: TriggerDevLoggerService,
  depsMap: {},
});

export const moduleLoader = {
  token: SHARED_TOKENS.TRIGGER_DEV_LOGGER,
  loadModule,
} satisfies ModuleLoader;
