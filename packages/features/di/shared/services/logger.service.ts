import { bindModuleToClassOnToken, type ModuleLoader } from "@calcom/features/di/di";
import { loggerConfig } from "@calcom/lib/logger";
import { createModule } from "@evyweb/ioctopus";
import { Logger } from "tslog";
import { SHARED_TOKENS } from "../shared.tokens";

/**
 * Minimal logger interface that supports common logging methods.
 * This allows both tslog Logger and bridge Logger implementations to be used interchangeably.
 * Can be used by any module that needs a simple logger interface.
 */
export interface ISimpleLogger {
  debug(...args: unknown[]): void;
  error(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
}

const thisModule = createModule();
const token = SHARED_TOKENS.LOGGER;
const moduleToken = SHARED_TOKENS.LOGGER_MODULE;
class LoggerService extends Logger<unknown> {
  constructor() {
    super(loggerConfig);
  }
}
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: LoggerService,
  depsMap: {},
});

export const moduleLoader = {
  token: SHARED_TOKENS.LOGGER,
  loadModule,
} satisfies ModuleLoader;
