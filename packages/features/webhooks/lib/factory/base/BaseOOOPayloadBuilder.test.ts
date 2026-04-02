import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { describe, expect, it } from "vitest";
import type { OOOCreatedDTO } from "../../dto/types";
import { OOOPayloadBuilder } from "../versioned/v2021-10-20/OOOPayloadBuilder";

describe("OOOPayloadBuilder (v2021-10-20)", () => {
  const builder = new OOOPayloadBuilder();

  describe("OOO_CREATED", () => {
    it("should build payload with OOO entry", () => {
      const dto: OOOCreatedDTO = {
        triggerEvent: WebhookTriggerEvents.OOO_CREATED,
        createdAt: "2024-01-15T10:00:00Z",
        oooEntry: {
          id: 1,
          userId: 1,
          start: "2024-01-20T00:00:00Z",
          end: "2024-01-25T00:00:00Z",
          reason: "Vacation",
        },
      };

      const payload = builder.build(dto);

      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.OOO_CREATED);
      expect(payload.createdAt).toBe("2024-01-15T10:00:00Z");
      expect(payload.payload.oooEntry).toEqual({
        id: 1,
        userId: 1,
        start: "2024-01-20T00:00:00Z",
        end: "2024-01-25T00:00:00Z",
        reason: "Vacation",
      });
    });
  });
});
