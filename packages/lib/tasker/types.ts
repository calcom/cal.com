import type { Logger as TsLogger } from "tslog";

// 1. The interface for the logger's configuration settings.
// This is extracted directly from your class.
export interface IMyLoggerSettings {
  minLevel: number;
  displayTimestamp: boolean;
  logFormat: "pretty" | "json" | "simple";
}

// 2. The main interface for the Logger instance.
// This describes the public "shape" of your Logger class.
export type ILogger = Pick<
  TsLogger<unknown>,
  "log" | "silly" | "trace" | "debug" | "info" | "warn" | "error" | "getSubLogger"
>;
export interface ITaskerDependencies {
  logger: ILogger;
}
