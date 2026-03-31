import type { RoutingFormResponseRepositoryInterface } from "@calcom/features/routing-forms/repositories/RoutingFormResponseRepository.interface";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { FetchEventDataResult, IWebhookDataFetcher, SubscriberContext } from "../../interface/IWebhookDataFetcher";
import type { ILogger } from "../../interface/infrastructure";
import type {
  FormWebhookTaskPayload,
  RoutingFormFallbackHitWebhookTaskPayload,
  WebhookTaskPayload,
} from "../../types/webhookTask";
import { routingFormFallbackHitMetadataSchema } from "../../types/webhookTask";

export class FormWebhookDataFetcher implements IWebhookDataFetcher {
  private readonly FORM_TRIGGERS = new Set([
    WebhookTriggerEvents.FORM_SUBMITTED,
    WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT,
  ]);

  constructor(
    private readonly logger: ILogger,
    private readonly routingFormResponseRepository: RoutingFormResponseRepositoryInterface
  ) {}

  canHandle(triggerEvent: WebhookTriggerEvents): boolean {
    return this.FORM_TRIGGERS.has(triggerEvent as never);
  }

  async fetchEventData(payload: WebhookTaskPayload): Promise<FetchEventDataResult> {
    if (payload.triggerEvent === WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT) {
      return this.fetchFallbackHitData(payload as RoutingFormFallbackHitWebhookTaskPayload);
    }

    return this.fetchFormSubmittedData(payload as FormWebhookTaskPayload);
  }

  getSubscriberContext(payload: WebhookTaskPayload): SubscriberContext {
    return {
      triggerEvent: payload.triggerEvent,
      userId: ("userId" in payload ? payload.userId : undefined) ?? undefined,
      eventTypeId: undefined,
      teamId: "teamId" in payload ? payload.teamId : undefined,
      orgId: ("orgId" in payload ? payload.orgId : undefined) ?? undefined,
      oAuthClientId: "oAuthClientId" in payload ? payload.oAuthClientId : undefined,
    };
  }

  private async fetchFormSubmittedData(
    payload: FormWebhookTaskPayload
  ): Promise<FetchEventDataResult> {
    const { formId } = payload;

    if (!formId) {
      this.logger.warn("Missing formId for form webhook");
      return { data: null };
    }

    // TODO: Implement using FormRepository (Phase 1+)
    this.logger.debug("Form data fetch not implemented yet (Phase 0 scaffold)", { formId });
    return { data: { formId, _scaffold: true } };
  }

  private async fetchFallbackHitData(
    payload: RoutingFormFallbackHitWebhookTaskPayload
  ): Promise<FetchEventDataResult> {
    const { formId, responseId } = payload;

    if (!formId || !responseId) {
      this.logger.warn("Missing formId or responseId for fallback hit webhook");
      return { data: null };
    }

    const parsed = routingFormFallbackHitMetadataSchema.safeParse(payload.metadata);
    if (!parsed.success) {
      this.logger.warn("Invalid metadata for fallback hit webhook", {
        errors: parsed.error.issues.map((i) => i.message),
      });
      return { data: null };
    }

    try {
      const formResponse = await this.routingFormResponseRepository.findByIdIncludeForm(responseId);

      if (!formResponse) {
        this.logger.warn("Form response not found for fallback hit webhook", { responseId, formId });
        return { data: null };
      }

      return {
        data: {
          formId,
          formName: formResponse.form.name,
          responseId,
          fallbackAction: parsed.data.fallbackAction,
          responses: formResponse.response as Record<string, unknown> | null,
        },
      };
    } catch (error) {
      this.logger.error("Error fetching form response for fallback hit webhook", {
        responseId,
        formId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
