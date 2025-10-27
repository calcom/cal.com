import type { FORM_SUBMITTED_WEBHOOK_RESPONSES } from "@calcom/app-store/routing-forms/lib/formSubmissionUtils";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { FormSubmittedDTO, FormSubmittedNoEventDTO } from "../dto/types";
import type { WebhookPayload } from "./types";

export class FormPayloadBuilder {
  canHandle(triggerEvent: WebhookTriggerEvents): boolean {
    return (
      triggerEvent === WebhookTriggerEvents.FORM_SUBMITTED ||
      triggerEvent === WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT
    );
  }

  build(dto: FormSubmittedDTO | FormSubmittedNoEventDTO): WebhookPayload {
    // Type the responses properly using the routing-forms type
    const responses = dto.response.data;

    // Create properly typed payload with primitive types
    const payload: {
      formId: string;
      formName: string;
      teamId: number | null;
      responses: FORM_SUBMITTED_WEBHOOK_RESPONSES;
      [key: string]: unknown; // For backward compatibility fields
    } = {
      formId: dto.form.id,
      formName: dto.form.name,
      teamId: dto.teamId ?? null,
      responses,
    };

    // Add unwrapped response fields at root level for backwards compatibility
    // This ensures both `value` (deprecated) and `response` (new) are available
    Object.entries(responses).forEach(([fieldKey, fieldValue]) => {
      if (fieldValue && typeof fieldValue === "object") {
        // Each field should have both `value` (deprecated) and `response` (new)
        const responseField = fieldValue as {
          value?: unknown;
          response?: unknown;
        };

        // Add the field value directly to payload root for backward compatibility
        // This preserves the legacy behavior where field values were at root level
        if (responseField.value !== undefined) {
          payload[fieldKey] = responseField.value;
        } else if (responseField.response !== undefined) {
          // Fallback to response if value is not present
          payload[fieldKey] = responseField.response;
        }
      }
    });

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload,
    };
  }
}
