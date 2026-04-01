import type { AdminAction } from "./admin-action";
import { ErrorWithCode } from "@calcom/lib/errors";

/**
 * Observability decorator for admin actions.
 *
 * Inspired by `packages/infra/adapters/calendar/src/observable-calendar-adapter.ts`.
 * Wraps any AdminAction with structured audit logging including who performed
 * the action, duration, and error context.
 *
 * Usage:
 * ```ts
 * const action = new ObservableAdminAction(new LockUserAccountAction(deps), {
 *   actionId: "lockUserAccount",
 *   actor: { id: ctx.user.id, email: ctx.user.email },
 *   logger,
 * });
 * await action.execute(input);
 * ```
 */

export interface AdminActionLogger {
  info(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
}

export interface AdminActor {
  id: number;
  email: string;
}

export class ObservableAdminAction<TInput, TResult>
  implements AdminAction<TInput, TResult>
{
  constructor(
    private readonly inner: AdminAction<TInput, TResult>,
    private readonly opts: {
      actionId: string;
      actor: AdminActor;
      logger: AdminActionLogger;
    }
  ) {}

  async execute(input: TInput): Promise<TResult> {
    const { actionId, actor, logger } = this.opts;
    const start = performance.now();

    try {
      const result = await this.inner.execute(input);
      const durationMs = Math.round(performance.now() - start);

      logger.info(`admin.${actionId}`, { actor, durationMs, input });

      return result;
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      const code = err instanceof ErrorWithCode ? err.code : undefined;

      logger.error(`admin.${actionId}`, {
        actor,
        durationMs,
        input,
        code,
        error: err instanceof Error ? err.message : String(err),
      });

      throw err;
    }
  }
}
