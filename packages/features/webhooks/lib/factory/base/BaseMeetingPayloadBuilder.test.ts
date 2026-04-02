import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { describe, expect, it } from "vitest";
import type { MeetingEndedDTO, MeetingStartedDTO } from "../../dto/types";
import { MeetingPayloadBuilder } from "../versioned/v2021-10-20/MeetingPayloadBuilder";

describe("MeetingPayloadBuilder (v2021-10-20)", () => {
  const builder = new MeetingPayloadBuilder();

  const mockBookingData = {
    id: 1,
    uid: "booking-uid-123",
    title: "Test Meeting",
    startTime: "2024-01-15T10:00:00Z",
    endTime: "2024-01-15T10:30:00Z",
  };

  describe("MEETING_STARTED", () => {
    it("should build payload with booking data", () => {
      const dto: MeetingStartedDTO = {
        triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
        createdAt: "2024-01-15T10:00:00Z",
        booking: mockBookingData,
      };

      const payload = builder.build(dto);

      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.MEETING_STARTED);
      expect(payload.createdAt).toBe("2024-01-15T10:00:00Z");
      expect(payload.payload.id).toBe(1);
      expect(payload.payload.uid).toBe("booking-uid-123");
      expect(payload.payload.title).toBe("Test Meeting");
    });
  });

  describe("MEETING_ENDED", () => {
    it("should build payload with booking data", () => {
      const dto: MeetingEndedDTO = {
        triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
        createdAt: "2024-01-15T10:30:00Z",
        booking: mockBookingData,
      };

      const payload = builder.build(dto);

      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.MEETING_ENDED);
      expect(payload.createdAt).toBe("2024-01-15T10:30:00Z");
      expect(payload.payload).toEqual(mockBookingData);
    });
  });
});
