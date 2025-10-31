import { logger } from "@trigger.dev/sdk";
import type { ISettingsParam, Logger as TsLogger } from "tslog";

interface ITriggerDevLoggerSettings {
  minLevel: number; // 0=debug, 1=info, 2=warn, 3=error
}

const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

export class TriggerDevLogger
  implements
    Pick<TsLogger<any>, "log" | "silly" | "trace" | "debug" | "info" | "warn" | "error" | "getSubLogger">
{
  private prefix = "";
  public settings: ITriggerDevLoggerSettings;

  constructor(userSettings?: Partial<ITriggerDevLoggerSettings>) {
    this.settings = {
      minLevel: LogLevel.INFO,
      ...userSettings,
    };
  }

  getSubLogger(settings?: ISettingsParam<any>, logObj?: any): TsLogger<any> {
    const subLogger = new TriggerDevLogger(this.settings);
    subLogger.prefix = settings?.name ?? this.prefix;
    return subLogger as unknown as TsLogger<any>;
  }

  log(...args: any[]): undefined {
    if (this.settings.minLevel <= LogLevel.INFO) this.logInternal("info", ...args);
  }

  info(...args: any[]): undefined {
    if (this.settings.minLevel <= LogLevel.INFO) this.logInternal("info", ...args);
  }

  debug(...args: any[]): undefined {
    if (this.settings.minLevel <= LogLevel.DEBUG) this.logInternal("debug", ...args);
  }

  trace(...args: any[]): undefined {
    if (this.settings.minLevel <= LogLevel.DEBUG) this.logInternal("debug", ...args);
  }

  warn(...args: any[]): undefined {
    if (this.settings.minLevel <= LogLevel.WARN) this.logInternal("warn", ...args);
  }

  error(...args: any[]): undefined {
    if (this.settings.minLevel <= LogLevel.ERROR) this.logInternal("error", ...args);
  }

  silly(...args: any[]): undefined {
    if (this.settings.minLevel <= LogLevel.DEBUG) this.logInternal("debug", ...args);
  }

  private formatArgsAsString(args: any[]): string {
    return args
      .map((arg) => {
        if (typeof arg === "string") return arg;
        try {
          return JSON.stringify(arg);
        } catch {
          return "[Unserializable Object]";
        }
      })
      .join(" ");
  }

  private logInternal(level: "info" | "warn" | "error" | "debug", ...args: any[]): void {
    const message = this.prefix
      ? `${this.prefix} ${this.formatArgsAsString(args)}`
      : this.formatArgsAsString(args);
    switch (level) {
      case "info":
        logger.info(message);
        break;
      case "warn":
        logger.warn(message);
        break;
      case "error":
        logger.error(message);
        break;
      case "debug":
        logger.debug(message);
        break;
    }
  }
}
