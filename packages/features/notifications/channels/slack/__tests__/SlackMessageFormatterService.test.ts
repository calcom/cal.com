import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { describe, expect, it } from "vitest";
import { SlackMessageFormatterService } from "../SlackMessageFormatterService";

describe("SlackMessageFormatterService", () => {
  const formatter = new SlackMessageFormatterService();

  describe("format", () => {
    it("should format BOOKING_CREATED with header block", () => {
      const result = formatter.format(WebhookTriggerEvents.BOOKING_CREATED, {
        evt: { title: "30min Meeting", startTime: "2026-01-15T10:00:00Z" },
      });

      expect(result.text).toBe("Cal.com: New Booking Created");
      expect(result.blocks[0]).toEqual({
        type: "header",
        text: { type: "plain_text", text: "New Booking Created", emoji: true },
      });
    });

    it("should extract event title and start time fields", () => {
      const result = formatter.format(WebhookTriggerEvents.BOOKING_CREATED, {
        evt: { title: "Strategy Call", startTime: "2026-02-01T14:00:00Z" },
      });

      const sectionBlock = result.blocks.find((b) => b.type === "section");
      expect(sectionBlock).toBeDefined();
      const fieldTexts = sectionBlock?.fields?.map((f) => f.text) ?? [];
      expect(fieldTexts).toContain("*Event:* Strategy Call");
      expect(fieldTexts).toContain("*When:* 2026-02-01T14:00:00Z");
    });

    it("should extract attendee name from evt.attendees", () => {
      const result = formatter.format(WebhookTriggerEvents.BOOKING_CREATED, {
        evt: {
          title: "Meeting",
          attendees: [{ name: "John Doe", email: "john@example.com" }],
        },
      });

      const sectionBlock = result.blocks.find((b) => b.type === "section");
      const fieldTexts = sectionBlock?.fields?.map((f) => f.text) ?? [];
      expect(fieldTexts).toContain("*Attendee:* John Doe");
    });

    it("should extract booking info from payload.booking", () => {
      const result = formatter.format(WebhookTriggerEvents.MEETING_STARTED, {
        booking: { id: 42, title: "Quick Sync" },
      });

      const sectionBlock = result.blocks.find((b) => b.type === "section");
      const fieldTexts = sectionBlock?.fields?.map((f) => f.text) ?? [];
      expect(fieldTexts).toContain("*Booking:* Quick Sync");
      expect(fieldTexts).toContain("*Booking ID:* 42");
    });

    it("should handle OOO_CREATED with date range fields", () => {
      const result = formatter.format(WebhookTriggerEvents.OOO_CREATED, {
        oooEntry: { start: "2026-03-01", end: "2026-03-05" },
      });

      expect(result.text).toBe("Cal.com: Out of Office Created");
      const sectionBlock = result.blocks.find((b) => b.type === "section");
      const fieldTexts = sectionBlock?.fields?.map((f) => f.text) ?? [];
      expect(fieldTexts).toContain("*From:* 2026-03-01");
      expect(fieldTexts).toContain("*Until:* 2026-03-05");
    });

    it("should handle FORM_SUBMITTED with form name", () => {
      const result = formatter.format(WebhookTriggerEvents.FORM_SUBMITTED, {
        form: { name: "Contact Form" },
      });

      expect(result.text).toBe("Cal.com: Form Submitted");
      const sectionBlock = result.blocks.find((b) => b.type === "section");
      const fieldTexts = sectionBlock?.fields?.map((f) => f.text) ?? [];
      expect(fieldTexts).toContain("*Form:* Contact Form");
    });

    it("should include status field when present in payload", () => {
      const result = formatter.format(WebhookTriggerEvents.BOOKING_CREATED, {
        status: "ACCEPTED",
      });

      const sectionBlock = result.blocks.find((b) => b.type === "section");
      const fieldTexts = sectionBlock?.fields?.map((f) => f.text) ?? [];
      expect(fieldTexts).toContain("*Status:* ACCEPTED");
    });

    it("should return only header block when payload has no extractable fields", () => {
      const result = formatter.format(WebhookTriggerEvents.BOOKING_CANCELLED, {});

      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe("header");
    });

    it("should use triggerEvent as fallback label for unknown events", () => {
      const result = formatter.format("UNKNOWN_EVENT" as WebhookTriggerEvents, {});

      expect(result.text).toBe("Cal.com: UNKNOWN_EVENT");
    });
  });
});
