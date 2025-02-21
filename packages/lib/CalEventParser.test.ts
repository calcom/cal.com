import type { TFunction } from "next-i18next";
import { describe, expect, it } from "vitest";

import type { CalendarEvent } from "@calcom/types/Calendar";

import { getRichDescription } from "./CalEventParser";

describe("getRichDescription", () => {
  const t = ((key: string, _args?: Record<string, unknown>) => key) as TFunction;

  const mockCalEvent: CalendarEvent = {
    type: "test",
    title: "Test Event",
    description: "Test description",
    startTime: "2023-01-01T10:00:00Z",
    endTime: "2023-01-01T11:00:00Z",
    organizer: {
      email: "test@example.com",
      name: "Test Organizer",
      timeZone: "America/New_York",
      language: { translate: t, locale: "en" },
    },
    attendees: [
      {
        email: "attendee@example.com",
        name: "Test Attendee",
        timeZone: "America/New_York",
        language: { translate: t, locale: "en" },
      },
    ],
    location: "https://zoom.us/j/123456brahhh",
    additionalNotes: "Some additional notes",
  };

  it("should format description without extra whitespace", () => {
    const description = getRichDescription(mockCalEvent, t);

    console.log("Description:", description);
    console.log(
      "Lines:",
      description.split("\n").map((line) => `"${line}"`)
    );

    // Description should not have more than 2 consecutive newlines
    expect(description).not.toMatch(/\n{3,}/);

    // Each non-empty line should have content
    const lines = description.split("\n").filter((line) => line.trim());
    lines.forEach((line) => {
      expect(line.trim().length).toBeGreaterThan(0);
    });

    // Verify content is present and properly formatted
    expect(description).toContain("what:");
    expect(description).toContain("Test Event");
    expect(description).toContain("where:");
    expect(description).toContain("https://zoom.us/j/123456brahhh");
  });

  it("should include payment info when present", () => {
    const eventWithPayment = {
      ...mockCalEvent,
      paymentInfo: {
        link: "https://payment.test",
      },
    };

    const description = getRichDescription(eventWithPayment, t);
    expect(description).toContain("pay_now:\nhttps://payment.test");
  });

  it("should handle empty optional fields", () => {
    const eventWithoutOptionals = {
      ...mockCalEvent,
      description: "",
      additionalNotes: "",
      location: "",
    };

    const description = getRichDescription(eventWithoutOptionals, t);
    expect(description).not.toContain("description:");
    expect(description).not.toContain("additional_notes:");
    // Should still contain required fields
    expect(description).toContain("what:");
    expect(description).toContain("who:");
  });
});
