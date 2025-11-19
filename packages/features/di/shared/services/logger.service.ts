import { createModule } from "@evyweb/ioctopus";
import { Logger } from "tslog";

import { bindModuleToClassOnToken, ModuleLoader } from "@calcom/features/di/di";
import type { ILogger } from "@calcom/features/webhooks/lib/interface/infrastructure";

import { SHARED_TOKENS } from "../shared.tokens";

export const loggerServiceModule = createModule();

// Bind logger with proper factory that respects IoC
loggerServiceModule.bind(SHARED_TOKENS.LOGGER).toFactory(async (): Promise<ILogger> => {
  const loggerModule = await import("@calcom/lib/logger");
  return loggerModule.default;
});

const loadModule = bindModuleToClassOnToken({
  module: loggerServiceModule,
  moduleToken: SHARED_TOKENS.LOGGER_MODULE,
  token: SHARED_TOKENS.LOGGER,
  classs: Logger,
  depsMap: {},
});

export const moduleLoader = {
  token: SHARED_TOKENS.LOGGER,
  loadModule,
} satisfies ModuleLoader;
