import type { Tasker } from "@calcom/features/tasker/tasker";

export type ITasker = Tasker;

export interface ILogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  getSubLogger(options: { prefix: string[] }): ILogger;
}
