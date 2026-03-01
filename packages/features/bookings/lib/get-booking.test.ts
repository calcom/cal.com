import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    booking: {
      findUnique: vi.fn(),
    },
    bookingSeat: {
      findFirst: vi.fn(),
    },
    eventType: {
      findUnique: vi.fn(),
    },
  };
  return { default: mockPrisma, __esModule: true };
});

vi.mock("@calcom/features/bookings/lib/getBookingResponsesSchema", () => ({
  bookingResponsesDbSchema: {
    parse: vi.fn((v: unknown) => v),
  },
}));

vi.mock("@calcom/features/pbac/services/permission-check.service", () => ({
  PermissionCheckService: vi.fn().mockImplementation(() => ({
    checkPermission: vi.fn().mockResolvedValue(false),
  })),
}));

import { getBookingWithResponses, getMultipleDurationValue } from "./get-booking";

describe("getBookingWithResponses", () => {
  it("returns responses directly when they exist", () => {
    const booking = {
      description: "test",
      customInputs: {},
      attendees: [{ email: "test@example.com", name: "Test" }],
      location: "zoom",
      responses: { name: "Test", email: "test@example.com" },
    };
    const result = getBookingWithResponses(booking);
    expect(result.responses).toEqual({ name: "Test", email: "test@example.com" });
  });

  it("falls back to old booking format when responses are null", () => {
    const booking = {
      description: "A meeting about features",
      customInputs: { "Company Name": "Acme Corp" },
      attendees: [{ email: "test@example.com", name: "Test User" }],
      location: "https://meet.google.com/abc",
      responses: null,
    };
    const result = getBookingWithResponses(booking);
    expect(result.responses).toHaveProperty("name", "Test User");
    expect(result.responses).toHaveProperty("email", "test@example.com");
    expect(result.responses).toHaveProperty("notes", "A meeting about features");
  });

  it("returns empty responses for seated events even when null", () => {
    const booking = {
      description: "test",
      customInputs: {},
      attendees: [{ email: "test@example.com", name: "Test" }],
      location: "zoom",
      responses: null,
    };
    const result = getBookingWithResponses(booking, true);
    expect(result.responses).toBeNull();
  });

  it("handles booking with no attendees gracefully", () => {
    const booking = {
      description: null,
      customInputs: {},
      attendees: [],
      location: null,
      responses: null,
    };
    const result = getBookingWithResponses(booking);
    expect(result.responses).toHaveProperty("name", "Nameless");
    expect(result.responses).toHaveProperty("email", "");
  });

  it("preserves all original booking fields", () => {
    const booking = {
      description: "test",
      customInputs: { field1: "value1" },
      attendees: [{ email: "test@example.com", name: "Test" }],
      location: "zoom",
      responses: { name: "Test" },
    };
    const result = getBookingWithResponses(booking);
    expect(result.description).toBe("test");
    expect(result.location).toBe("zoom");
  });
});

describe("getMultipleDurationValue", () => {
  it("returns null when multipleDurationConfig is undefined", () => {
    expect(getMultipleDurationValue(undefined, "30", 30)).toBeNull();
  });

  it("returns the queried duration when it exists in config", () => {
    expect(getMultipleDurationValue([15, 30, 60], "30", 15)).toBe(30);
  });

  it("returns default value when queried duration is not in config", () => {
    expect(getMultipleDurationValue([15, 30, 60], "45", 15)).toBe(15);
  });

  it("returns default value when queryDuration is undefined", () => {
    expect(getMultipleDurationValue([15, 30, 60], undefined, 30)).toBe(30);
  });

  it("handles string array queryDuration", () => {
    expect(getMultipleDurationValue([15, 30, 60], ["30"], 15)).toBe(30);
  });
});
