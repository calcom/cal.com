import { createModule } from "@evyweb/ioctopus";

import { LoggerAdapter } from "../adapters/LoggerAdapter";
import { DI_TOKENS } from "../tokens";

export const loggerModule = createModule();
loggerModule.bind(DI_TOKENS.LOGGER).toClass(LoggerAdapter);
