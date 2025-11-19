export interface ITasker {
  create(
    taskName: string,
    payload: string,
    options?: { scheduledAt?: Date; referenceUid?: string }
  ): Promise<string>;
  cancelWithReference(referenceUid: string, taskName: string): Promise<string | null>;
}

export interface ILogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  getSubLogger(options: { prefix: string[] }): ILogger;
}
