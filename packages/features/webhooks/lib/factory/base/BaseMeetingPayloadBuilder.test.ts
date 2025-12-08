import { describe, it, expect } from "vitest";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { MeetingStartedDTO, MeetingEndedDTO } from "../../dto/types";
import { BaseMeetingPayloadBuilder } from "./BaseMeetingPayloadBuilder";

// Concrete implementation for testing
class TestMeetingPayloadBuilder extends BaseMeetingPayloadBuilder {}

describe("BaseMeetingPayloadBuilder", () => {
  const builder = new TestMeetingPayloadBuilder();

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

