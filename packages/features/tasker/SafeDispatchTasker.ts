// No need for a generic base 'TaskerInterface'. We will use the specific domain interface directly.
// For example, ICalendarTasker.
import type { ILogger } from "./types/logger";

export abstract class BaseTaskerService<T> {
  // T is now just a placeholder for the class that extends this
  // The dependencies are now typed with the specific interfaces
  protected readonly primaryTasker: T;
  protected readonly fallbackTasker: T;
  protected readonly logger: ILogger;

  constructor(dependencies: { primaryTasker: T; fallbackTasker: T; logger: ILogger }) {
    this.primaryTasker = dependencies.primaryTasker;
    this.fallbackTasker = dependencies.fallbackTasker;
    this.logger = dependencies.logger;
  }

  public async dispatch<K extends keyof T>(
    taskName: K,
    ...args: T[K] extends (...args: any[]) => any ? Parameters<T[K]> : never
  ): Promise<T[K] extends (...args: any[]) => any ? Awaited<ReturnType<T[K]>> : never> {
    this.logger.info(`Dispatching task '${String(taskName)}'`, { args });
    return this.safeDispatch(taskName, ...args);
  }

  // The dispatch method is now strongly typed to the keys of T
  protected async safeDispatch<K extends keyof T>(
    taskName: K,
    // We infer the arguments directly from the method on T
    ...args: T[K] extends (...args: any[]) => any ? Parameters<T[K]> : never
  ): Promise<T[K] extends (...args: any[]) => any ? Awaited<ReturnType<T[K]>> : never> {
    try {
      const method = this.primaryTasker[taskName] as (...args: any[]) => any;
      return await method.apply(this.primaryTasker, args);
    } catch (err) {
      this.logger.error(`Primary tasker failed for '${String(taskName)}'.`, err as Error);

      if (this.primaryTasker === this.fallbackTasker) {
        throw err;
      }

      this.logger.warn(`Falling back to SyncTasker for '${String(taskName)}'.`);

      const fallbackMethod = this.fallbackTasker[taskName] as (...args: any[]) => any;
      return fallbackMethod.apply(this.fallbackTasker, args);
    }
  }
}
