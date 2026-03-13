import type { FORM_SUBMITTED_WEBHOOK_RESPONSES } from "@calcom/app-store/routing-forms/lib/formSubmissionUtils";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type {
  FormSubmittedDTO,
  FormSubmittedNoEventDTO,
  RoutingFormFallbackHitDTO,
} from "../../../dto/types";
import { BaseFormPayloadBuilder } from "../../base/BaseFormPayloadBuilder";
import type { WebhookPayload } from "../../types";

/**
 * Form payload builder for webhook version 2021-10-20.
 *
 * This is the initial form webhook payload format. It includes:
 * - Form ID, name, and team ID
 * - Structured responses object
 * - Backwards compatibility: response values also at root level
 */
export class FormPayloadBuilder extends BaseFormPayloadBuilder {
  build(dto: FormSubmittedDTO | FormSubmittedNoEventDTO | RoutingFormFallbackHitDTO): WebhookPayload {
    if (dto.triggerEvent === WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT) {
      return this.buildFallbackHitPayload(dto);
    }

    return this.buildFormSubmittedPayload(dto);
  }

  private buildFormSubmittedPayload(dto: FormSubmittedDTO | FormSubmittedNoEventDTO): WebhookPayload {
    const responses = dto.response.data;

    const payload: {
      formId: string;
      formName: string;
      teamId: number | null;
      responses: FORM_SUBMITTED_WEBHOOK_RESPONSES;
      [key: string]: unknown;
    } = {
      formId: dto.form.id,
      formName: dto.form.name,
      teamId: dto.teamId ?? null,
      responses,
    };

    this.addBackwardsCompatibilityFields(payload, responses);

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload,
    };
  }

  private buildFallbackHitPayload(dto: RoutingFormFallbackHitDTO): WebhookPayload {
    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: {
        formId: dto.form.id,
        formName: dto.form.name,
        teamId: dto.teamId ?? null,
        responseId: dto.responseId,
        fallbackAction: dto.fallbackAction,
        responses: dto.responses,
      },
    };
  }

  /**
   * Add backwards compatibility fields to payload.
   * This spreads individual response values at the root level of the payload.
   */
  private addBackwardsCompatibilityFields(
    payload: Record<string, unknown>,
    responses: FORM_SUBMITTED_WEBHOOK_RESPONSES
  ): void {
    Object.entries(responses).forEach(([fieldKey, fieldValue]) => {
      if (fieldValue && typeof fieldValue === "object") {
        const responseField = fieldValue as {
          value?: unknown;
          response?: unknown;
        };

        if (responseField.value !== undefined) {
          payload[fieldKey] = responseField.value;
        } else if (responseField.response !== undefined) {
          payload[fieldKey] = responseField.response;
        }
      }
    });
  }
}
