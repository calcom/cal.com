import { describe, it, expect } from "vitest";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { FormSubmittedDTO, FormSubmittedNoEventDTO } from "../../dto/types";
import { FormPayloadBuilder } from "../versioned/v2021-10-20/FormPayloadBuilder";

describe("FormPayloadBuilder (v2021-10-20)", () => {
  const builder = new FormPayloadBuilder();

  const createMockDTO = (
    triggerEvent: typeof WebhookTriggerEvents.FORM_SUBMITTED | typeof WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT
  ): FormSubmittedDTO | FormSubmittedNoEventDTO =>
    ({
      triggerEvent,
      createdAt: "2024-01-15T10:00:00Z",
      form: {
        id: "form-123",
        name: "Test Form",
      },
      teamId: 1,
      response: {
        data: {
          name: { value: "John Doe", response: "John Doe" },
          email: { value: "john@test.com", response: "john@test.com" },
        },
      },
    }) as FormSubmittedDTO | FormSubmittedNoEventDTO;

  describe("FORM_SUBMITTED", () => {
    it("should build payload with form details", () => {
      const dto = createMockDTO(WebhookTriggerEvents.FORM_SUBMITTED);
      const payload = builder.build(dto);

      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.FORM_SUBMITTED);
      expect(payload.payload.formId).toBe("form-123");
      expect(payload.payload.formName).toBe("Test Form");
      expect(payload.payload.teamId).toBe(1);
    });

    it("should include responses", () => {
      const dto = createMockDTO(WebhookTriggerEvents.FORM_SUBMITTED);
      const payload = builder.build(dto);

      expect(payload.payload.responses).toBeDefined();
      expect(payload.payload.responses.name).toEqual({
        value: "John Doe",
        response: "John Doe",
      });
    });

    it("should add backwards compatibility fields at root level", () => {
      const dto = createMockDTO(WebhookTriggerEvents.FORM_SUBMITTED);
      const payload = builder.build(dto);

      // Field values should be at root level for backwards compatibility
      expect(payload.payload.name).toBe("John Doe");
      expect(payload.payload.email).toBe("john@test.com");
    });
  });

  describe("FORM_SUBMITTED_NO_EVENT", () => {
    it("should build payload for forms without events", () => {
      const dto = createMockDTO(WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT);
      const payload = builder.build(dto);

      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT);
      expect(payload.payload.formId).toBe("form-123");
    });
  });

  describe("null teamId", () => {
    it("should handle null teamId", () => {
      const dto = {
        ...createMockDTO(WebhookTriggerEvents.FORM_SUBMITTED),
        teamId: undefined,
      } as FormSubmittedDTO;

      const payload = builder.build(dto);

      expect(payload.payload.teamId).toBeNull();
    });
  });
});
