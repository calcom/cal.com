import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import defaultPrisma from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma";

import type { WebhookDeliveryResult, WebhookSubscriber } from "../dto/types";

const log = logger.getSubLogger({ prefix: ["[WebhookDeliveryService]"] });

export interface WebhookDeliveryAttempt {
  webhookId: string;
  subscriberUrl: string;
  triggerEvent: string;
  payload: string;
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  errorMessage?: string;
  duration?: number;
  attemptedAt: Date;
}

/**
 * Service responsible for logging webhook delivery status in the database
 * Records response status, duration, and failure reasons
 */
export class WebhookDeliveryService {
  constructor(private prisma: PrismaClient = defaultPrisma) {}

  /**
   * Logs a webhook delivery attempt
   */
  async logDeliveryAttempt(attempt: WebhookDeliveryAttempt): Promise<void> {
    try {
      // For now, we'll log to the application logger
      // In the future, this could be extended to log to a dedicated webhook_delivery_logs table
      const logData = {
        webhookId: attempt.webhookId,
        subscriberUrl: attempt.subscriberUrl,
        triggerEvent: attempt.triggerEvent,
        success: attempt.success,
        statusCode: attempt.statusCode,
        duration: attempt.duration,
        errorMessage: attempt.errorMessage,
        attemptedAt: attempt.attemptedAt.toISOString(),
      };

      if (attempt.success) {
        log.info("Webhook delivered successfully", logData);
      } else {
        log.error("Webhook delivery failed", logData);
      }

      // TODO: In the future, we could store this in a dedicated table:
      // await this.prisma.webhookDeliveryLog.create({
      //   data: {
      //     webhookId: attempt.webhookId,
      //     subscriberUrl: attempt.subscriberUrl,
      //     triggerEvent: attempt.triggerEvent,
      //     success: attempt.success,
      //     statusCode: attempt.statusCode,
      //     responseBody: attempt.responseBody?.substring(0, 1000), // Truncate long responses
      //     errorMessage: attempt.errorMessage?.substring(0, 500), // Truncate long error messages
      //     duration: attempt.duration,
      //     attemptedAt: attempt.attemptedAt,
      //   },
      // });
    } catch (error) {
      log.error("Failed to log webhook delivery attempt", {
        error: error instanceof Error ? error.message : String(error),
        webhookId: attempt.webhookId,
        subscriberUrl: attempt.subscriberUrl,
      });
    }
  }

  /**
   * Logs a successful webhook delivery
   */
  async logSuccess(
    subscriber: WebhookSubscriber,
    triggerEvent: string,
    result: WebhookDeliveryResult,
    payload: string,
    duration: number
  ): Promise<void> {
    await this.logDeliveryAttempt({
      webhookId: subscriber.id,
      subscriberUrl: subscriber.subscriberUrl,
      triggerEvent,
      payload,
      success: true,
      statusCode: result.status,
      responseBody: result.message,
      duration,
      attemptedAt: new Date(),
    });
  }

  /**
   * Logs a failed webhook delivery
   */
  async logFailure(
    subscriber: WebhookSubscriber,
    triggerEvent: string,
    payload: string,
    error: Error | string,
    statusCode?: number,
    duration?: number
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await this.logDeliveryAttempt({
      webhookId: subscriber.id,
      subscriberUrl: subscriber.subscriberUrl,
      triggerEvent,
      payload,
      success: false,
      statusCode,
      errorMessage,
      duration,
      attemptedAt: new Date(),
    });
  }

  /**
   * Gets delivery statistics for a webhook (useful for monitoring)
   */
  async getDeliveryStats(webhookId: string, days = 7): Promise<{
    totalAttempts: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    successRate: number;
    averageResponseTime?: number;
  }> {
    // This would query a dedicated delivery log table when implemented
    // For now, return placeholder data
    return {
      totalAttempts: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      successRate: 0,
      averageResponseTime: undefined,
    };
  }

  /**
   * Gets recent delivery failures for a webhook (useful for debugging)
   */
  async getRecentFailures(webhookId: string, limit = 10): Promise<WebhookDeliveryAttempt[]> {
    // This would query a dedicated delivery log table when implemented
    // For now, return empty array
    return [];
  }
}
