import { createModule } from "@evyweb/ioctopus";

import type { ILogger } from "@calcom/features/webhooks/lib/interface/infrastructure";

import { SHARED_TOKENS } from "../shared.tokens";

export const loggerServiceModule = createModule();

// Bind logger with proper factory that respects IoC
loggerServiceModule.bind(SHARED_TOKENS.LOGGER).toFactory(async (): Promise<ILogger> => {
  const loggerModule = await import("@calcom/lib/logger");
  return loggerModule.default;
});
