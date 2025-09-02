// 1. The interface for the logger's configuration settings.
// This is extracted directly from your class.
export interface IMyLoggerSettings {
  minLevel: number;
  displayTimestamp: boolean;
  logFormat: "pretty" | "json" | "simple";
}

// 2. The main interface for the Logger instance.
// This describes the public "shape" of your Logger class.
export interface ILogger {
  /**
   * The configuration settings for this logger instance.
   */
  readonly settings: IMyLoggerSettings;

  /**
   * Creates a new Logger instance with a specific prefix for contextual logging.
   * @param options - Configuration for the sub-logger.
   * @returns A new ILogger instance with the specified prefix.
   */
  getSubLogger(options: { prefix?: string[] }): ILogger;

  /** Logs an informational message. */
  info(...args: any[]): void;

  /** Logs a warning message. */
  warn(...args: any[]): void;

  /** Logs an error message. */
  error(...args: any[]): void;

  /** Logs a debug message. */
  debug(...args: any[]): void;

  /** Logs a detailed trace message. */
  trace(...args: any[]): void;

  /** Logs a critical error that may require immediate attention. */
  fatal(...args: any[]): void;

  /** Logs a message with the lowest level of detail. */
  silly(...args: any[]): void;
}
