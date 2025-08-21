import dayjs from "@calcom/dayjs";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { FormSubmittedDTO, FormSubmittedNoEventDTO } from "../dto/types";
import { WebhookNotifier } from "../notifier/WebhookNotifier";
import { WebhookService } from "./WebhookService";

/**
 * Specialized service for form submission webhook events.
 *
 * @description This service provides high-level methods for emitting form-related
 * webhook events when users submit forms in Cal.com. It handles both standard form
 * submissions linked to bookings and standalone form submissions without associated
 * events, ensuring proper data mapping and reliable webhook delivery to external integrations.
 *
 * @responsibilities
 * - Creates properly structured DTOs for form submission events (with and without bookings)
 * - Handles form response data mapping and validation for webhook delivery
 * - Manages different form submission types and their specific data requirements
 * - Coordinates with WebhookNotifier for reliable event emission
 * - Supports dry-run testing for form webhook flows
 *
 * @features
 * - Static methods for easy integration without instantiation
 * - Support for both booking-associated and standalone form submissions
 * - Automatic timestamp generation for webhook events
 * - Flexible form response data handling with type safety
 * - Built-in dry-run support for testing webhook flows
 * - Handles various form field types and response formats
 *
 * @example Emitting a form submission webhook (with booking)
 * ```typescript
 * await FormWebhookService.emitFormSubmitted({
 *   form: {
 *     id: "contact-form-123",
 *     name: "Contact Information Form"
 *   },
 *   response: {
 *     id: 456,
 *     data: {
 *       name: "John Doe",
 *       email: "john@example.com",
 *       message: "Looking forward to our meeting"
 *     }
 *   },
 *   userId: 789,
 *   eventTypeId: 101
 * });
 * ```
 *
 * @example Emitting a standalone form submission webhook (no booking)
 * ```typescript
 * await FormWebhookService.emitFormSubmittedNoEvent({
 *   form: {
 *     id: "newsletter-signup",
 *     name: "Newsletter Subscription"
 *   },
 *   response: {
 *     id: 789,
 *     data: {
 *       email: "subscriber@example.com",
 *       preferences: ["weekly", "product-updates"]
 *     }
 *   },
 *   isDryRun: false
 * });
 * ```
 *
 * @example Testing form webhook with dry-run
 * ```typescript
 * await FormWebhookService.emitFormSubmitted({
 *   form: formData,
 *   response: responseData,
 *   userId: 123,
 *   isDryRun: true
 * });
 * // Webhook processing is simulated without actual delivery
 * ```
 *
 * @see WebhookNotifier For the underlying webhook emission mechanism
 * @see FormSubmittedDTO For the standard form submission event structure
 * @see FormSubmittedNoEventDTO For the standalone form submission event structure
 */
export class FormWebhookService extends WebhookService {
  static async emitFormSubmitted(params: {
    form: {
      id: string;
      name: string;
    };
    response: {
      id: number;
      data: Record<string, unknown>;
    };
    eventTypeId?: number | null;
    userId?: number | null;
    teamId?: number | null;
    orgId?: number | null;
    platformClientId?: string;
    isDryRun?: boolean;
  }): Promise<void> {
    const dto: FormSubmittedDTO = {
      triggerEvent: WebhookTriggerEvents.FORM_SUBMITTED,
      createdAt: new Date().toISOString(),
      eventTypeId: params.eventTypeId,
      userId: params.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: params.platformClientId,
      form: params.form,
      response: params.response,
    };

    await WebhookNotifier.emitWebhook(dto, params.isDryRun);
  }

  static async emitFormSubmittedNoEvent(params: {
    form: {
      id: string;
      name: string;
    };
    response: {
      id: number;
      data: Record<string, unknown>;
    };
    userId?: number | null;
    teamId?: number | null;
    orgId?: number | null;
    platformClientId?: string;
    isDryRun?: boolean;
  }): Promise<void> {
    const dto: FormSubmittedNoEventDTO = {
      triggerEvent: WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT,
      createdAt: new Date().toISOString(),
      userId: params.userId,
      teamId: params.teamId,
      orgId: params.orgId,
      platformClientId: params.platformClientId,
      form: params.form,
      response: params.response,
    };

    await WebhookNotifier.emitWebhook(dto, params.isDryRun);
  }

  /**
   * Schedules delayed form submission webhooks
   * Replaces legacy getWebhooks + tasker.create pattern for FORM_SUBMITTED_NO_EVENT
   */
  static async scheduleDelayedFormWebhooks(params: {
    responseId: number;
    form: {
      id: string;
      name: string;
      teamId?: number | null;
    };
    responses: Record<string, unknown>;
    redirect?: Record<string, unknown>;
    teamId?: number | null;
    orgId?: number | null;
    delayMinutes?: number;
  }): Promise<void> {
    const webhookService = new WebhookService();

    const delayMinutes = params.delayMinutes || 15;
    const scheduledAt = dayjs().add(delayMinutes, "minute").toDate();

    // Create webhook payload using our architecture
    const payload = {
      payload: {
        responseId: params.responseId,
        form: {
          ...params.form,
          teamId: params.form.teamId ?? null,
        },
        responses: params.responses,
        redirect: params.redirect,
      },
    };

    // Use the centralized scheduling method from WebhookService
    await webhookService.scheduleDelayedWebhooks(
      WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT,
      payload,
      scheduledAt,
      { teamId: params.teamId, orgId: params.orgId }
    );
  }
}
