import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { describe, expect, it } from "vitest";
import type { InstantMeetingDTO } from "../../dto/types";
import { InstantMeetingBuilder } from "../versioned/v2021-10-20/InstantMeetingBuilder";

describe("InstantMeetingBuilder (v2021-10-20)", () => {
  const builder = new InstantMeetingBuilder();

  describe("INSTANT_MEETING", () => {
    it("should build payload with all instant meeting fields", () => {
      const dto: InstantMeetingDTO = {
        triggerEvent: WebhookTriggerEvents.INSTANT_MEETING,
        createdAt: "2024-01-15T10:00:00Z",
        title: "Instant Meeting Request",
        body: "Someone is requesting an instant meeting",
        icon: "https://cal.com/icon.png",
        url: "https://cal.com/meeting/instant-123",
        actions: [
          { action: "accept", title: "Accept" },
          { action: "decline", title: "Decline" },
        ],
        requireInteraction: true,
        type: "instant",
      };

      const payload = builder.build(dto);

      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.INSTANT_MEETING);
      expect(payload.createdAt).toBe("2024-01-15T10:00:00Z");
      expect(payload.payload.title).toBe("Instant Meeting Request");
      expect(payload.payload.body).toBe("Someone is requesting an instant meeting");
      expect(payload.payload.icon).toBe("https://cal.com/icon.png");
      expect(payload.payload.url).toBe("https://cal.com/meeting/instant-123");
      expect(payload.payload.actions).toHaveLength(2);
      expect(payload.payload.requireInteraction).toBe(true);
      expect(payload.payload.type).toBe("instant");
    });
  });
});
