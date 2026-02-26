import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/slugify", () => ({
  default: vi.fn((str: string) => str.toLowerCase().replace(/\s+/g, "-")),
}));

import { getBookingWithResponses } from "./getBooking";

describe("getBookingWithResponses", () => {
  it("returns responses directly when they exist", () => {
    const booking = {
      id: 1,
      uid: "uid-1",
      description: "A meeting",
      customInputs: {},
      responses: { name: "John", email: "john@test.com" },
      location: "zoom",
      attendees: [{ email: "john@test.com", name: "John" }],
    };

    const result = getBookingWithResponses(booking);
    expect(result.responses).toEqual({ name: "John", email: "john@test.com" });
    expect(result.id).toBe(1);
    expect(result.uid).toBe("uid-1");
  });

  it("falls back to old booking format when responses is null", () => {
    const booking = {
      id: 2,
      uid: "uid-2",
      description: "Meeting notes here",
      customInputs: { "Custom Field": "custom value" },
      responses: null,
      location: "google_meet",
      attendees: [
        { email: "alice@test.com", name: "Alice" },
        { email: "bob@test.com", name: "Bob" },
      ],
    };

    const result = getBookingWithResponses(booking);
    expect(result.responses).toEqual(
      expect.objectContaining({
        name: "Alice",
        email: "alice@test.com",
        guests: ["bob@test.com"],
        notes: "Meeting notes here",
        location: {
          value: "google_meet",
          optionValue: "google_meet",
        },
        "custom-field": "custom value",
      })
    );
  });

  it("uses 'Nameless' when no attendees exist and responses is falsy", () => {
    const booking = {
      id: 3,
      uid: "uid-3",
      description: null,
      customInputs: {},
      responses: null,
      location: null,
      attendees: [],
    };

    const result = getBookingWithResponses(booking);
    expect(result.responses.name).toBe("Nameless");
    expect(result.responses.email).toBe("");
  });

  it("handles empty description and location", () => {
    const booking = {
      id: 4,
      uid: "uid-4",
      description: null,
      customInputs: {},
      responses: null,
      location: null,
      attendees: [{ email: "user@test.com", name: "User" }],
    };

    const result = getBookingWithResponses(booking);
    expect(result.responses.notes).toBe("");
    expect(result.responses.location).toEqual({
      value: "",
      optionValue: "",
    });
  });

  it("extracts guests from additional attendees", () => {
    const booking = {
      id: 5,
      uid: "uid-5",
      description: "",
      customInputs: {},
      responses: null,
      location: "",
      attendees: [
        { email: "organizer@test.com", name: "Organizer" },
        { email: "guest1@test.com", name: "Guest 1" },
        { email: "guest2@test.com", name: "Guest 2" },
        { email: "guest3@test.com", name: "Guest 3" },
      ],
    };

    const result = getBookingWithResponses(booking);
    expect(result.responses.guests).toEqual(["guest1@test.com", "guest2@test.com", "guest3@test.com"]);
  });

  it("slugifies custom input labels as keys", () => {
    const booking = {
      id: 6,
      uid: "uid-6",
      description: "",
      customInputs: {
        "Company Name": "Acme Inc",
        "Phone Number": "+1234567890",
      },
      responses: null,
      location: "",
      attendees: [{ email: "test@test.com", name: "Test" }],
    };

    const result = getBookingWithResponses(booking);
    expect(result.responses["company-name"]).toBe("Acme Inc");
    expect(result.responses["phone-number"]).toBe("+1234567890");
  });

  it("preserves all original booking properties", () => {
    const booking = {
      id: 7,
      uid: "uid-7",
      description: "test",
      customInputs: {},
      responses: { name: "Test" },
      location: "office",
      attendees: [{ email: "test@test.com", name: "Test" }],
      startTime: new Date("2025-06-15T10:00:00Z"),
    };

    const result = getBookingWithResponses(booking);
    expect(result.id).toBe(7);
    expect(result.uid).toBe("uid-7");
    expect(result.description).toBe("test");
    expect(result.location).toBe("office");
    expect(result.attendees).toHaveLength(1);
  });

  it("uses empty object when customInputs is falsy", () => {
    const booking = {
      id: 8,
      uid: "uid-8",
      description: "",
      customInputs: null,
      responses: null,
      location: "",
      attendees: [{ email: "test@test.com", name: "Test" }],
    };

    const result = getBookingWithResponses(booking);
    expect(result.responses.name).toBe("Test");
  });
});
