import type { FORM_SUBMITTED_WEBHOOK_RESPONSES } from "@calcom/app-store/routing-forms/lib/formSubmissionUtils";
import dayjs from "@calcom/dayjs";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { FormSubmittedDTO, FormSubmittedNoEventDTO } from "../dto/types";
import type { FormSubmittedPayload } from "../factory/types";
import type { IWebhookService, IFormWebhookService } from "../interface/services";
import type { IWebhookNotifier } from "../interface/webhook";

export class FormWebhookService implements IFormWebhookService {
  constructor(
    private readonly webhookNotifier: IWebhookNotifier,
    private readonly webhookService: IWebhookService
  ) {}

  async emitFormSubmitted(params: {
    form: { id: string; name: string };
    response: { id: number; data: FORM_SUBMITTED_WEBHOOK_RESPONSES };
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

    await this.webhookNotifier.emitWebhook(dto, params.isDryRun);
  }

  async emitFormSubmittedNoEvent(params: {
    form: { id: string; name: string };
    response: { id: number; data: FORM_SUBMITTED_WEBHOOK_RESPONSES };
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

    await this.webhookNotifier.emitWebhook(dto, params.isDryRun);
  }

  async scheduleDelayedFormWebhooks(params: {
    responseId: number;
    form: {
      id: string;
      name: string;
      teamId?: number | null;
    };
    responses: FORM_SUBMITTED_WEBHOOK_RESPONSES;
    redirect?: Record<string, unknown>;
    teamId?: number | null;
    orgId?: number | null;
    delayMinutes?: number;
  }): Promise<void> {
    const delayMinutes = params.delayMinutes || 15;
    const scheduledAt = dayjs().add(delayMinutes, "minute").toDate();

    const payload = {
      triggerEvent: WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT,
      createdAt: new Date().toISOString(),
      payload: {
        formId: params.form.id,
        formName: params.form.name,
        teamId: params.teamId ?? null,
        redirect: params.redirect,
        responses: params.responses,
      } as FormSubmittedPayload,
    };

    await this.webhookService.scheduleDelayedWebhooks(
      WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT,
      payload,
      scheduledAt,
      { teamId: params.teamId, orgId: params.orgId }
    );
  }
}
