import { Injectable, Logger as NestLogger, Scope } from "@nestjs/common";
import type { Logger as TsLogger } from "tslog";

// 1. Define an interface for the settings
interface IMyLoggerSettings {
  minLevel: number; // Example: 0=debug, 1=info, 2=warn, 3=error
  displayTimestamp: boolean;
  logFormat: "pretty" | "json" | "simple";
  // Add unknown other settings you need, mimicking tslog or your own requirements
  // e.g., name?: string; displayFunctionName?: boolean; etc.
}

// Define log level constants (optional but recommended for readability)
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/**
 * This logger acts as a bridge between Nest.js Logger and log calls originating
 * from platform libraries. It forwards logs to NestLogger, allowing centralization
 * (e.g., sending to Axiom) and adds an optional prefix for context.
 */
@Injectable({ scope: Scope.TRANSIENT }) // TRANSIENT ensures getSubLogger provides truly independent instances if needed elsewhere
export class Logger
  implements
    Pick<TsLogger<unknown>, "log" | "silly" | "trace" | "debug" | "info" | "warn" | "error" | "getSubLogger">
{
  // Use NestLogger for the actual logging output
  private readonly nestLogger = new NestLogger("LoggerBridge");
  // Prefix to add to messages for this instance
  private prefix = "";

  // Add a public `settings` property, typed with the interface
  public settings: IMyLoggerSettings;

  // Define default settings
  private static readonly defaultSettings: IMyLoggerSettings = {
    minLevel: process?.env?.LOGGER_BRIDGE_LOG_LEVEL
      ? Number(process.env.LOGGER_BRIDGE_LOG_LEVEL)
      : LogLevel.INFO, // Default to INFO level
    displayTimestamp: true,
    logFormat: "pretty",
  };

  constructor(userSettings?: Partial<IMyLoggerSettings>) {
    // Merge default settings with user-provided settings
    // User settings override defaults
    this.settings = {
      ...Logger.defaultSettings,
      ...userSettings,
    };
  }

  /**
   * Creates a new LoggerBridge instance with a specific prefix.
   * Useful for providing context from different parts of a library.
   * @param options - Configuration for the sub-logger.
   * @param options.prefix - An array of strings to join as the log prefix.
   * @returns A new LoggerBridge instance with the specified prefix.
   */
  getSubLogger(options: { prefix?: string[] }): TsLogger<unknown> {
    const newLogger = new Logger();
    // Set the prefix for the *new* instance
    newLogger.prefix = options?.prefix?.join(" ") ?? "";
    return newLogger as unknown as TsLogger<unknown>;
  }

  // --- Public logging methods ---

  log(...args: unknown[]): undefined {
    if (this.settings.minLevel <= LogLevel.INFO) this.logInternal("log", ...args);
  }

  info(...args: unknown[]): undefined {
    if (this.settings.minLevel <= 1) {
      this.logInternal("log", ...args);
    }
  }

  warn(...args: unknown[]): undefined {
    if (this.settings.minLevel <= 2) {
      this.logInternal("warn", ...args);
    }
  }

  error(...args: unknown[]): undefined {
    if (this.settings.minLevel <= 3) {
      this.logInternal("error", ...args);
    }
  }

  debug(...args: unknown[]): undefined {
    if (this.settings.minLevel === 0) {
      this.logInternal("debug", ...args);
    }
  }

  trace(...args: unknown[]): undefined {
    if (this.settings.minLevel === 0) {
      this.logInternal("verbose", ...args);
    }
  }

  fatal(...args: unknown[]): undefined {
    // Prepend FATAL: to the message and log as error
    const fatalMessage = `fatal: ${this.formatArgsAsString(args)}`;
    if (this.settings.minLevel <= 3) {
      this.logInternal("error", fatalMessage);
    }
  }

  silly(...args: unknown[]): undefined {
    const sillyMessage = `silly: ${this.formatArgsAsString(args)}`;
    if (this.settings.minLevel === 0) {
      this.logInternal("verbose", sillyMessage);
    }
  }

  // --- Internal logging implementation ---

  /** Formats arguments into a single string */
  private formatArgsAsString(args: unknown[]): string {
    return args
      .map((arg) => {
        if (typeof arg === "string") {
          return arg;
        }
        // Attempt to stringify non-string arguments
        try {
          return JSON.stringify(arg);
        } catch {
          return "[Unserializable Object]";
        }
      })
      .join(" "); // Use space as separator, adjust if needed
  }

  /** Central method to forward logs to NestLogger */
  private logInternal(level: "log" | "warn" | "error" | "debug" | "verbose", ...args: unknown[]) {
    try {
      // Format message from potentially multiple arguments
      const formattedMessage = this.formatArgsAsString(args);

      // Prepend the prefix if it exists
      const message = this.prefix ? `${this.prefix} ${formattedMessage}` : formattedMessage;

      // Call the corresponding NestLogger method
      switch (level) {
        case "log":
          this.nestLogger.log(message);
          break;
        case "warn":
          this.nestLogger.warn(message);
          break;
        case "error":
          this.nestLogger.error(message);
          break;
        case "debug":
          this.nestLogger.debug(message);
          break;
        case "verbose":
          this.nestLogger.verbose(message);
          break;
      }
    } catch (err) {
      this.nestLogger.error(
        `Could not bridge log message. Error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
