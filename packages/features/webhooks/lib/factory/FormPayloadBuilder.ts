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
    // Legacy compatibility: Form webhooks need special payload structure
    // They include both structured payload AND unwrapped response fields at root level
    const payload: Record<string, unknown> = {
      formId: dto.form.id,
      formName: dto.form.name,
      teamId: dto.teamId,
      responses: dto.response.data,
    };

    // Add unwrapped response fields at root level for backwards compatibility
    // This matches legacy sendGenericWebhookPayload with rootData
    if (dto.response.data && typeof dto.response.data === "object") {
      Object.entries(dto.response.data).forEach(([key, value]) => {
        if (value && typeof value === "object" && "value" in value) {
          // Type-safe extraction of the value property
          const responseValue = value as { value: unknown };
          payload[key] = responseValue.value;
        }
      });
    }

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload,
    };
  }
}
