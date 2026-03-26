import { Prisma } from "@calcom/prisma/client";
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { logger, retry, schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";
import type { WebhookDeliveryResult, WebhookSubscriber } from "../../dto/types";
import type { WebhookPayload } from "../../factory/types";
import type { IWebhookRepository } from "../../interface/IWebhookRepository";
import { isGenericWebhookTrigger, WebhookHttpError, WebhookSendError } from "../../service/WebhookService";
import type { WebhookTaskPayload } from "../../types/webhookTask";
import { webhookDeliveryTaskConfig, webhookRetryConfig } from "./config";
import { webhookDeliveryTaskSchema } from "./schema";

const WEBHOOK_DELIVERY_JOB_ID = "webhook.deliver" as const;

export type SendFn = (
  trigger: WebhookTriggerEvents,
  payload: WebhookPayload,
  subscriber: WebhookSubscriber
) => Promise<WebhookDeliveryResult>;

export interface DeliveryContext {
  operationId: string;
  taskId: string;
}

/** Maximum number of subscribers to deliver to in parallel during the first pass. */
const PARALLEL_CONCURRENCY = 10;

/**
 * HTTP status codes that are worth retrying.
 * Everything else (4xx client errors, etc.) is treated as non-retryable.
 */
export const RETRYABLE_STATUS_CODES = new Set([
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
]);

/** HTTP 410 Gone — the subscriber URL has been permanently removed. */
const GONE_STATUS_CODE = 410;

/**
 * Prisma error codes that are worth retrying (transient infrastructure issues).
 */
export const RETRYABLE_PRISMA_CODES = new Set([
  "P1008", // Query timeout
  "P1017", // Server closed connection
  "P2024", // Connection pool timeout
  "P2034", // Transaction conflict
]);

// ---------------------------------------------------------------------------
// Error classification helpers
// ---------------------------------------------------------------------------

/** Check whether an HTTP error is retryable based on its status code. */
export function isRetryableHttpError(error: unknown): boolean {
  return error instanceof WebhookHttpError && RETRYABLE_STATUS_CODES.has(error.statusCode);
}

/** Check whether a Prisma error is retryable based on its type and error code. */
export function isRetryablePrismaError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientValidationError) return false;
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Prisma.PrismaClientUnknownRequestError) return true;
  return error instanceof Prisma.PrismaClientKnownRequestError && RETRYABLE_PRISMA_CODES.has(error.code);
}

/** Check whether an error originated from the webhook send path (HTTP or network). */
export function isWebhookDeliveryError(error: unknown): boolean {
  return error instanceof WebhookHttpError || error instanceof WebhookSendError;
}

/**
 * Single allowlist check: is this error worth retrying?
 *
 * Only three categories qualify:
 * - Retryable HTTP status codes (5xx, 408, 429)
 * - Network failures (WebhookSendError)
 * - Transient Prisma errors (timeouts, connection issues)
 *
 * Everything else (4xx, PrismaClientValidationError, unknown errors) is
 * non-retryable by default. New error types must be explicitly added here
 * to be retried — this prevents accidental retries of permanent failures.
 */
export function isRetryableError(error: unknown): boolean {
  return isRetryableHttpError(error) || isRetryablePrismaError(error) || error instanceof WebhookSendError;
}

// ---------------------------------------------------------------------------
// 410 Gone handling
// ---------------------------------------------------------------------------

/**
 * If the error is a 410 Gone response, deactivate the webhook in the database
 * so it is no longer included in future subscriber queries.
 */
export async function deactivateIfGone(
  error: unknown,
  subscriber: WebhookSubscriber,
  repository: IWebhookRepository,
  context: DeliveryContext
): Promise<void> {
  if (error instanceof WebhookHttpError && error.statusCode === GONE_STATUS_CODE) {
    try {
      await repository.deactivateWebhook(subscriber.id);
      logger.info("Webhook deactivated due to 410 Gone response", {
        ...context,
        webhookId: subscriber.id,
        subscriberUrl: subscriber.subscriberUrl,
      });
    } catch (deactivateError) {
      logger.error("Failed to deactivate webhook after 410 Gone", {
        ...context,
        webhookId: subscriber.id,
        subscriberUrl: subscriber.subscriberUrl,
        error: deactivateError instanceof Error ? deactivateError.message : String(deactivateError),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

// ---------------------------------------------------------------------------
// Delivery functions
// ---------------------------------------------------------------------------

/**
 * Deliver a webhook to a single subscriber with retries.
 *
 * Only errors that pass `isRetryableError` are retried. Everything else is
 * caught inside the retry callback and re-thrown outside so `retry.onThrow`
 * does not waste attempts on permanent failures.
 */
export async function deliverToSubscriber(
  sendFn: SendFn,
  triggerEvent: WebhookTriggerEvents,
  webhookPayload: WebhookPayload,
  subscriber: WebhookSubscriber
): Promise<void> {
  let nonRetryableError: Error | null = null;

  await retry.onThrow(async () => {
    try {
      await sendFn(triggerEvent, webhookPayload, subscriber);
    } catch (error) {
      if (isRetryableError(error)) {
        throw error;
      }
      nonRetryableError = toError(error);
      return;
    }
  }, webhookRetryConfig);

  if (nonRetryableError) {
    throw nonRetryableError;
  }
}

/**
 * Result of attempting to deliver to a single subscriber in the first (parallel) pass.
 */
interface FirstPassResult {
  subscriber: WebhookSubscriber;
  status: "success" | "retryable" | "nonRetryable" | "unexpected";
  error?: unknown;
}

/**
 * Attempt delivery to a single subscriber without retries (first pass).
 * Classifies the result for the second pass.
 */
export async function attemptDelivery(
  sendFn: SendFn,
  triggerEvent: WebhookTriggerEvents,
  webhookPayload: WebhookPayload,
  subscriber: WebhookSubscriber
): Promise<FirstPassResult> {
  try {
    await sendFn(triggerEvent, webhookPayload, subscriber);
    return { subscriber, status: "success" };
  } catch (error) {
    if (isRetryableError(error)) {
      return { subscriber, status: "retryable", error };
    }
    if (isWebhookDeliveryError(error)) {
      return { subscriber, status: "nonRetryable", error };
    }
    return { subscriber, status: "unexpected", error };
  }
}

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

/**
 * Classify a delivery error and log it.
 *
 * Returns `true` for `isDelivery` if this is a known webhook delivery error
 * (HTTP or network). Returns `false` for unexpected errors (collected for re-throw).
 */
export function classifyAndLogError(
  error: unknown,
  subscriber: WebhookSubscriber,
  context: DeliveryContext
): { isDelivery: boolean } {
  const errorMessage = extractErrorMessage(error);
  const baseFields = {
    ...context,
    webhookId: subscriber.id,
    subscriberUrl: subscriber.subscriberUrl,
    error: errorMessage,
  };

  if (error instanceof WebhookHttpError) {
    const status = error.statusCode;
    if (status === GONE_STATUS_CODE) {
      logger.error("Webhook delivery failed with HTTP 410 Gone, webhook will be deactivated", baseFields);
    } else if (RETRYABLE_STATUS_CODES.has(status)) {
      logger.error(`Webhook delivery failed with retryable HTTP ${status} after retries`, baseFields);
    } else {
      logger.error(`Webhook delivery failed with non-retryable HTTP ${status}, not retried`, baseFields);
    }
    return { isDelivery: true };
  }

  if (error instanceof WebhookSendError) {
    logger.error("Webhook delivery failed due to network error after retries", baseFields);
    return { isDelivery: true };
  }

  if (isRetryablePrismaError(error)) {
    const code =
      error instanceof Prisma.PrismaClientKnownRequestError ? error.code : (error as Error).constructor.name;
    logger.error(`Webhook delivery failed due to retryable Prisma error (${code}) after retries`, baseFields);
    return { isDelivery: true };
  }

  logger.error("Unexpected error during webhook delivery", baseFields);
  return { isDelivery: false };
}

export function logDeliverySummary(
  context: DeliveryContext,
  total: number,
  successCount: number,
  failureCount: number,
  unexpectedErrorCount: number
): void {
  logger.info("Webhook delivery completed", {
    ...context,
    total,
    succeeded: successCount,
    failed: failureCount,
    unexpectedErrorCount,
  });

  if (failureCount > 0) {
    logger.error("Webhook delivery completed with failures", {
      ...context,
      succeeded: successCount,
      failed: failureCount,
    });
  }
}

/**
 * Throw an aggregated error if any unexpected (non-delivery) errors occurred,
 * so the task fails and triggers alerting.
 */
export function throwIfUnexpectedErrors(unexpectedErrors: Error[], operationId: string): void {
  if (unexpectedErrors.length > 0) {
    throw new Error(
      `Unexpected errors during webhook delivery (operationId=${operationId}): ${unexpectedErrors.map((e) => e.message).join("; ")}`
    );
  }
}

// ---------------------------------------------------------------------------
// Trigger.dev task
// ---------------------------------------------------------------------------

/**
 * Trigger.dev task for webhook delivery.
 *
 * Uses a two-pass approach:
 *
 * 1. **First pass (parallel)**: Attempt delivery to all subscribers in parallel
 *    using `Promise.allSettled` with `p-limit` (capped at {@link PARALLEL_CONCURRENCY}).
 *    No retries here — this is the fast happy path.
 *
 * 2. **Second pass (sequential retries)**: Subscribers that failed with retryable
 *    errors (5xx, 408, 429, network errors, transient Prisma errors) are retried
 *    sequentially using `retry.onThrow`. Sequential processing is required because
 *    retry.onThrow uses an underlying Trigger.dev "wait" and parallel waits are
 *    not supported:
 *    https://trigger.dev/docs/troubleshooting#parallel-waits-are-not-supported
 *
 * Non-retryable HTTP errors (other 4xx) skip retries entirely since these
 * status codes indicate the subscriber URL or request is permanently wrong.
 * A 410 Gone response additionally deactivates the webhook.
 *
 * Unexpected (non-delivery) errors are collected and re-thrown after all
 * subscribers have been attempted, so the task fails and triggers alerting.
 */
export const deliverWebhook: TaskWithSchema<
  typeof WEBHOOK_DELIVERY_JOB_ID,
  typeof webhookDeliveryTaskSchema
> = schemaTask({
  id: WEBHOOK_DELIVERY_JOB_ID,
  ...webhookDeliveryTaskConfig,
  schema: webhookDeliveryTaskSchema,
  run: async (payload: WebhookTaskPayload, { ctx }) => {
    const { getWebhookTaskConsumer, getWebhookService, getWebhookFeature } = await import(
      "@calcom/features/di/webhooks/containers/webhook"
    );

    const webhookTaskConsumer = getWebhookTaskConsumer();
    const webhookService = getWebhookService();
    const { repository } = getWebhookFeature();
    const context: DeliveryContext = {
      operationId: payload.operationId,
      taskId: ctx.run.id,
    };

    // --- Prepare delivery (with retries for transient Prisma errors) ---
    let prepareError: Error | null = null;

    const prepared = await retry.onThrow(async () => {
      try {
        return await webhookTaskConsumer.prepareWebhookDelivery(payload, context.taskId);
      } catch (error) {
        if (isRetryableError(error)) {
          logger.warn("prepareWebhookDelivery failed with retryable error, retrying", {
            ...context,
            error: extractErrorMessage(error),
          });
          throw error;
        }
        prepareError = toError(error);
        return null;
      }
    }, webhookRetryConfig);

    if (prepareError) {
      throw prepareError;
    }

    if (!prepared) {
      logger.info("No webhooks to deliver", { ...context });
      return;
    }

    const { subscribers, triggerEvent, webhookPayload } = prepared;

    logger.info("Delivering webhooks to subscribers", {
      ...context,
      subscriberCount: subscribers.length,
    });

    const sendFn: SendFn = isGenericWebhookTrigger(triggerEvent)
      ? webhookService.sendGenericWebhookDirectly.bind(webhookService)
      : webhookService.sendWebhookDirectly.bind(webhookService);

    let successCount = 0;
    let failureCount = 0;
    const unexpectedErrors: Error[] = [];

    // --- First pass: parallel delivery (no retries) ---
    const { default: pLimit } = await import("p-limit");
    const limit = pLimit(PARALLEL_CONCURRENCY);
    const firstPassResults = await Promise.allSettled(
      subscribers.map((subscriber) =>
        limit(() => attemptDelivery(sendFn, triggerEvent, webhookPayload, subscriber))
      )
    );

    const retryableSubscribers: WebhookSubscriber[] = [];

    for (const settled of firstPassResults) {
      if (settled.status === "rejected") {
        // Promise itself rejected unexpectedly (should not happen with attemptDelivery's try/catch)
        unexpectedErrors.push(toError(settled.reason));
        continue;
      }

      const result = settled.value;
      switch (result.status) {
        case "success":
          successCount++;
          logger.info("Webhook delivery succeeded for subscriber", {
            ...context,
            webhookId: result.subscriber.id,
            subscriberUrl: result.subscriber.subscriberUrl,
          });
          break;
        case "retryable":
          logger.warn("Webhook delivery failed on first attempt, queuing for retry", {
            ...context,
            webhookId: result.subscriber.id,
            subscriberUrl: result.subscriber.subscriberUrl,
            error: extractErrorMessage(result.error),
          });
          retryableSubscribers.push(result.subscriber);
          break;
        case "nonRetryable":
          failureCount++;
          classifyAndLogError(result.error, result.subscriber, context);
          await deactivateIfGone(result.error, result.subscriber, repository, context);
          break;
        case "unexpected":
          unexpectedErrors.push(toError(result.error));
          break;
      }
    }

    // --- Second pass: sequential retries for retryable failures ---
    if (retryableSubscribers.length > 0) {
      logger.info("Retrying failed subscribers sequentially", {
        ...context,
        retryCount: retryableSubscribers.length,
      });
    }

    for (const subscriber of retryableSubscribers) {
      try {
        await deliverToSubscriber(sendFn, triggerEvent, webhookPayload, subscriber);
        successCount++;
        logger.info("Webhook delivery succeeded for subscriber on retry", {
          ...context,
          webhookId: subscriber.id,
          subscriberUrl: subscriber.subscriberUrl,
        });
      } catch (error) {
        const { isDelivery } = classifyAndLogError(error, subscriber, context);
        if (isDelivery) {
          failureCount++;
          await deactivateIfGone(error, subscriber, repository, context);
        } else {
          unexpectedErrors.push(toError(error));
        }
      }
    }

    logDeliverySummary(context, subscribers.length, successCount, failureCount, unexpectedErrors.length);
    throwIfUnexpectedErrors(unexpectedErrors, payload.operationId);
  },
});
