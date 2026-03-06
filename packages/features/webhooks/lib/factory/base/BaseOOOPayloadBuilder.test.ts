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

    it("should preserve all OOO entry fields including toUser", () => {
      const dto: OOOCreatedDTO = {
        triggerEvent: WebhookTriggerEvents.OOO_CREATED,
        createdAt: "2024-02-01T08:00:00Z",
        oooEntry: {
          id: 2,
          userId: 5,
          start: "2024-02-10T00:00:00Z",
          end: "2024-02-15T00:00:00Z",
          reason: "Conference",
          toUser: { id: 10, name: "Backup User" },
        },
      };

      const payload = builder.build(dto);

      expect(payload.payload.oooEntry.toUser).toEqual({ id: 10, name: "Backup User" });
      expect(payload.payload.oooEntry.id).toBe(2);
    });

    it("should set triggerEvent to OOO_CREATED in payload", () => {
      const dto: OOOCreatedDTO = {
        triggerEvent: WebhookTriggerEvents.OOO_CREATED,
        createdAt: "2024-01-15T10:00:00Z",
        oooEntry: { id: 3, userId: 1, start: "2024-01-20", end: "2024-01-25", reason: "Sick" },
      };

      const payload = builder.build(dto);

      expect(payload.triggerEvent).toBe("OOO_CREATED");
    });
  });
});
