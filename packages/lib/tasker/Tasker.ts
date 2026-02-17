/* eslint-disable @typescript-eslint/no-explicit-any */

import process from "node:process";
import { configure } from "@trigger.dev/sdk";
import { ENABLE_ASYNC_TASKER } from "../constants";
import { redactError } from "../redactError";
import type { ILogger } from "./types";

const isAsyncTaskerEnabled =
  ENABLE_ASYNC_TASKER && process.env.TRIGGER_SECRET_KEY && process.env.TRIGGER_API_URL;

export abstract class Tasker<T> {
  protected readonly asyncTasker: T;
  protected readonly syncTasker: T;
  protected readonly logger: ILogger;

  constructor(dependencies: {
    asyncTasker: T;
    syncTasker: T;
    logger: ILogger;
  }) {
    this.logger = dependencies.logger;

    if (!isAsyncTaskerEnabled) {
      if (ENABLE_ASYNC_TASKER && (!process.env.TRIGGER_SECRET_KEY || !process.env.TRIGGER_API_URL)) {
        this.logger.info(
          "Missing env variables TRIGGER_SECRET_KEY or TRIGGER_API_URL, falling back to Sync tasker."
        );
      }
    }

    if (isAsyncTaskerEnabled) {
      configure({
        accessToken: process.env.TRIGGER_SECRET_KEY,
        baseURL: process.env.TRIGGER_API_URL,
      });
    }

    this.asyncTasker = isAsyncTaskerEnabled ? dependencies.asyncTasker : dependencies.syncTasker;
    this.syncTasker = dependencies.syncTasker;
  }

  public async dispatch<K extends keyof T>(
    taskName: K,
    ...args: T[K] extends (...args: any[]) => any ? Parameters<T[K]> : never
  ): Promise<T[K] extends (...args: any[]) => any ? Awaited<ReturnType<T[K]>> : never> {
    this.logger.info(`Safely Dispatching task '${String(taskName)}'`, { args });
    return this._safeDispatch(taskName, ...args);
  }

  private async _safeDispatch<K extends keyof T>(
    taskName: K,
    ...args: T[K] extends (...args: any[]) => any ? Parameters<T[K]> : never
  ): Promise<T[K] extends (...args: any[]) => any ? Awaited<ReturnType<T[K]>> : never> {
    try {
      this.logger.info(
        `${isAsyncTaskerEnabled ? "AsyncTasker" : "SyncTasker"} '${String(taskName)}' dispatched.`
      );
      const method = this.asyncTasker[taskName] as (...args: any[]) => any;
      return await method.apply(this.asyncTasker, args);
    } catch (err) {
      const taskerLabel = isAsyncTaskerEnabled ? "AsyncTasker" : "SyncTasker";
      const baseUrlInfo = isAsyncTaskerEnabled
        ? ` (baseURL: ${process.env.TRIGGER_API_URL ?? "unknown"})`
        : "";
      this.logger.error(
        `${taskerLabel} failed for '${String(taskName)}'.${baseUrlInfo}`,
        this.getErrorDetails(err)
      );

      if (this.asyncTasker === this.syncTasker) {
        throw err;
      }

      this.logger.warn(`Trying again with SyncTasker for '${String(taskName)}'.`);

      try {
        const fallbackMethod = this.syncTasker[taskName] as (...args: any[]) => any;
        return await fallbackMethod.apply(this.syncTasker, args);
      } catch (err) {
        this.logger.error(`SyncTasker failed for '${String(taskName)}'.`, this.getErrorDetails(err));
        throw err;
      }
    }
  }

  private getErrorDetails(err: unknown) {
    const redactedError = redactError(err);
    if (redactedError instanceof Error) {
      return {
        name: redactedError.name,
        message: redactedError.message,
        stack: redactedError.stack,
      };
    }

    return { message: String(redactedError) };
  }
}
