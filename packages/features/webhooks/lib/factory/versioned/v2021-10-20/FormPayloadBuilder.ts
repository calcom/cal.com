import type { FORM_SUBMITTED_WEBHOOK_RESPONSES } from "@calcom/app-store/routing-forms/lib/formSubmissionUtils";

import type { FormSubmittedDTO, FormSubmittedNoEventDTO } from "../../../dto/types";
import type { WebhookPayload } from "../../types";
import { BaseFormPayloadBuilder } from "../../base/BaseFormPayloadBuilder";

/**
 * Form payload builder for webhook version 2021-10-20.
 *
 * This is the initial form webhook payload format. It includes:
 * - Form ID, name, and team ID
 * - Structured responses object
 * - Backwards compatibility: response values also at root level
 */
export class FormPayloadBuilder extends BaseFormPayloadBuilder {
  /**
   * Build the form webhook payload for v2021-10-20.
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
