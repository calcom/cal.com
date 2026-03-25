import { describe, it, expect } from "vitest";
import { addOptionalGuestsToCalEvent } from "../handleNewBooking/index";

describe("Optional Guests in Bookings", () => {
  const mockTranslate = (key: string) => key;
  
  it("should add optional guests to calendar event attendees", () => {
    const calEvent = {
      attendees: [
        {
          name: "John Doe",
          email: "john@example.com",
          timeZone: "America/New_York",
          language: { translate: mockTranslate, locale: "en" },
        },
      ],
    };

    const optionalGuests = [
      { name: "Optional Guest", email: "optional@example.com" },
    ];

    const result = addOptionalGuestsToCalEvent(
      calEvent,
      optionalGuests,
      "America/New_York",
      mockTranslate
    );

    expect(result.attendees).toHaveLength(2);
    expect(result.attendees[1]).toMatchObject({
      email: "optional@example.com",
      optional: true,
    });
  });

  it("should mark optional guests with optional: true", () => {
    const calEvent = {
      attendees: [
        {
          name: "Required Attendee",
          email: "required@example.com",
          timeZone: "UTC",
          language: { translate: mockTranslate, locale: "en" },
        },
      ],
    };

    const result = addOptionalGuestsToCalEvent(
      calEvent,
      [{ name: "Optional", email: "opt@example.com" }],
      "UTC",
      mockTranslate
    );

    const requiredAttendee = result.attendees.find(
      (a) => a.email === "required@example.com"
    );
    const optionalAttendee = result.attendees.find(
      (a) => a.email === "opt@example.com"
    );

    expect(requiredAttendee?.optional).toBeUndefined();
    expect(optionalAttendee?.optional).toBe(true);
  });

  it("should handle null names for optional guests", () => {
    const calEvent = { attendees: [] };
    
    const result = addOptionalGuestsToCalEvent(
      calEvent,
      [{ name: null, email: "noname@example.com" }],
      "UTC",
      mockTranslate
    );

    expect(result.attendees[0].name).toBe("noname@example.com");
  });

  it("should not affect required attendees when no optional guests", () => {
    const calEvent = {
      attendees: [
        {
          name: "Required",
          email: "req@example.com",
          timeZone: "UTC",
          language: { translate: mockTranslate, locale: "en" },
        },
      ],
    };

    const result = addOptionalGuestsToCalEvent(calEvent, [], "UTC", mockTranslate);
    
    expect(result.attendees).toHaveLength(1);
    expect(result.attendees[0].optional).toBeUndefined();
  });
});
