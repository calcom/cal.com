import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import { WebhookNotifier } from "../notifier/WebhookNotifier";
import { WebhookService } from "./WebhookService";

// Form-specific DTOs
export interface FormSubmittedDTO {
  triggerEvent: typeof WebhookTriggerEvents.FORM_SUBMITTED;
  createdAt: string;
  eventTypeId?: number | null;
  userId?: number | null;
  teamId?: number | null;
  orgId?: number | null;
  platformClientId?: string | null;
  form: {
    id: string;
    name: string;
  };
  response: {
    id: number;
    data: Record<string, any>;
  };
}

export interface FormSubmittedNoEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT;
  createdAt: string;
  userId?: number | null;
  teamId?: number | null;
  orgId?: number | null;
  platformClientId?: string | null;
  form: {
    id: string;
    name: string;
  };
  response: {
    id: number;
    data: Record<string, any>;
  };
}

/**
 * Service for creating form-related webhook DTOs and emitting webhook events
 * Handles FORM_SUBMITTED and FORM_SUBMITTED_NO_EVENT webhooks
 */
export class FormWebhookService extends WebhookService {
  /**
   * Emits a form submitted webhook (with event)
   */
  static async emitFormSubmitted(params: {
    form: {
      id: string;
      name: string;
    };
    response: {
      id: number;
      data: Record<string, any>;
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

    await WebhookNotifier.emitWebhook(WebhookTriggerEvents.FORM_SUBMITTED, dto, params.isDryRun);
  }

  /**
   * Emits a form submitted webhook (no event)
   */
  static async emitFormSubmittedNoEvent(params: {
    form: {
      id: string;
      name: string;
    };
    response: {
      id: number;
      data: Record<string, any>;
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

    await WebhookNotifier.emitWebhook(WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT, dto, params.isDryRun);
  }
}
