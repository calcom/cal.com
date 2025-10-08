import { createModule } from "@evyweb/ioctopus";

import type { ILogger } from "@calcom/features/webhooks/lib/interface/infrastructure";
import logger from "@calcom/lib/logger";

import { SHARED_TOKENS } from "../shared.tokens";

export const loggerServiceModule = createModule();

loggerServiceModule.bind(SHARED_TOKENS.LOGGER).toFactory(() => logger as ILogger, "singleton");
