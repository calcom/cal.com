import type { ILogger, IMyLoggerSettings } from "@calcom/features/tasker/types/logger";

import logger from "../../logger";

export class LoggerAdapter implements ILogger {
  readonly settings: IMyLoggerSettings = {
    minLevel: parseInt(process.env.NEXT_PUBLIC_LOGGER_LEVEL || "4"),
    displayTimestamp: true,
    logFormat: process.env.NODE_ENV === "production" ? "json" : "pretty",
  };

  getSubLogger(options: { prefix?: string[] }): ILogger {
    const adapter = new LoggerAdapter();
    const originalLogger = logger;

    const prefix = options.prefix ? `[${options.prefix.join(":")}] ` : "";

    adapter.info = (...args: any[]) => originalLogger.info(prefix, ...args);
    adapter.warn = (...args: any[]) => originalLogger.warn(prefix, ...args);
    adapter.error = (...args: any[]) => originalLogger.error(prefix, ...args);
    adapter.debug = (...args: any[]) => originalLogger.debug(prefix, ...args);
    adapter.trace = (...args: any[]) => originalLogger.trace(prefix, ...args);
    adapter.fatal = (...args: any[]) => originalLogger.fatal(prefix, ...args);
    adapter.silly = (...args: any[]) => originalLogger.silly(prefix, ...args);

    return adapter;
  }

  info(...args: any[]): void {
    logger.info(...args);
  }

  warn(...args: any[]): void {
    logger.warn(...args);
  }

  error(...args: any[]): void {
    logger.error(...args);
  }

  debug(...args: any[]): void {
    logger.debug(...args);
  }

  trace(...args: any[]): void {
    logger.trace(...args);
  }

  fatal(...args: any[]): void {
    logger.fatal(...args);
  }

  silly(...args: any[]): void {
    logger.silly(...args);
  }
}
