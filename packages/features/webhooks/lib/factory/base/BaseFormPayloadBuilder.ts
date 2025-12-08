import type { FORM_SUBMITTED_WEBHOOK_RESPONSES } from "@calcom/app-store/routing-forms/lib/formSubmissionUtils";

import type { FormSubmittedDTO, FormSubmittedNoEventDTO } from "../../dto/types";
import type { WebhookPayload } from "../types";
import type { IFormPayloadBuilder } from "../versioned/PayloadBuilderFactory";

/**
 * Base form payload builder with shared logic.
 * Version-specific builders can extend this and override methods as needed.
 */
export abstract class BaseFormPayloadBuilder implements IFormPayloadBuilder {
  /**
   * Build the form webhook payload.
   * Override this method in version-specific builders to modify the payload structure.
   */
  build(dto: FormSubmittedDTO | FormSubmittedNoEventDTO): WebhookPayload {
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

    // Add unwrapped response fields at root level for backwards compatibility
    this.addBackwardsCompatibilityFields(payload, responses);

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload,
    };
  }

  /**
   * Add backwards compatibility fields to payload.
   * Override to customize or remove this behavior in future versions.
   */
  protected addBackwardsCompatibilityFields(
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

