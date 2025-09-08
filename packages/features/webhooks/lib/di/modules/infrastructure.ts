import { createModule } from "@evyweb/ioctopus";

import type { ITasker, ILogger } from "../../interface/infrastructure";
import { WEBHOOK_DI_TOKENS } from "../tokens";

export const infrastructureModule = createModule();

// Bind tasker with proper async factory that respects IoC
infrastructureModule.bind(WEBHOOK_DI_TOKENS.TASKER).toFactory(async (): Promise<ITasker> => {
  const taskerModule = await import("@calcom/features/tasker");
  return taskerModule.default;
});

// Bind logger with proper factory that respects IoC
infrastructureModule.bind(WEBHOOK_DI_TOKENS.LOGGER).toFactory(async (): Promise<ILogger> => {
  const loggerModule = await import("@calcom/lib/logger");
  return loggerModule.default;
});
