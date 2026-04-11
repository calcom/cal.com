import { describe, it, expect } from "vitest";
import { noShowAction } from "../lib/actions/noShow";
import { WebhookTriggerEvents } from "@calcom/lib/CalComClient/event";
import { mapZapierActionToWebhookEvent } from "../trpc/subscriptions";

describe("Zapier No-Show Integration", () => {
  describe("noShowAction", () => {
    it("should have correct id", () => {
      expect(noShowAction.id).toBe("booking_no_show");
    });

    it("should have required display properties", () => {
      expect(noShowAction.display.label).toBeDefined();
      expect(noShowAction.display.description).toBeDefined();
    });

    it("should have operation with perform body", () => {
      expect(noShowAction.operation.perform.body.data).toBeDefined();
    });
  });

  describe("mapZapierActionToWebhookEvent", () => {
    it("should map booking_no_show to BOOKING_NO_SHOW", () => {
      const result = mapZapierActionToWebhookEvent("booking_no_show");
      expect(result).toBe(WebhookTriggerEvents.BOOKING_NO_SHOW);
    });

    it("should return null for unmapped actions", () => {
      const result = mapZapierActionToWebhookEvent("invalid_action");
      expect(result).toBeNull();
    });

    it("should handle all known booking actions", () => {
      const actions = [
        "booking_created",
        "booking_rescheduled",
        "booking_cancelled",
        "booking_confirmed",
        "booking_declined",
        "booking_requested",
        "booking_payment_initiated",
        "booking_no_show",
      ];

      actions.forEach((action) => {
        expect(mapZapierActionToWebhookEvent(action)).not.toBeNull();
      });
    });

    it("should be case-sensitive", () => {
      expect(mapZapierActionToWebhookEvent("BOOKING_NO_SHOW")).toBeNull();
      expect(mapZapierActionToWebhookEvent("Booking_No_Show")).toBeNull();
    });
  });
});