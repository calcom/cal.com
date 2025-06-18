import { describe, it, expect } from "vitest";

import { ErrorCode } from "@calcom/lib/errorCodes";

import { getLocationValueForDB, type LocationObject } from "./locations";

describe("getLocationValueForDB Security Fix", () => {
  it("should accept valid location types that are configured for the event", () => {
    const eventLocations = [
      { type: "integrations:zoom", link: "https://zoom.us/j/123" },
      { type: "phone", link: "" },
    ];

    const result1 = getLocationValueForDB("integrations:zoom", eventLocations);
    expect(result1.bookingLocation).toBe("integrations:zoom");

    const result2 = getLocationValueForDB("phone", eventLocations);
    expect(result2.bookingLocation).toBe("phone");
  });

  it("should reject location types that are NOT configured for the event", () => {
    const eventLocations = [{ type: "integrations:zoom", link: "https://zoom.us/j/123" }];

    expect(() => {
      getLocationValueForDB("phone", eventLocations);
    }).toThrow(ErrorCode.InvalidLocationForEventType);

    expect(() => {
      getLocationValueForDB("inPerson", eventLocations);
    }).toThrow(ErrorCode.InvalidLocationForEventType);
  });

  it("should handle empty location by using first available or default", () => {
    const eventLocations = [
      { type: "integrations:zoom", link: "https://zoom.us/j/123" },
      { type: "phone", link: "" },
    ];

    const result = getLocationValueForDB("", eventLocations);
    expect(result.bookingLocation).toBe("integrations:zoom");
  });

  it("should return conferenceCredentialId when present", () => {
    const eventLocations = [
      {
        type: "integrations:zoom",
        link: "https://zoom.us/j/123",
        credentialId: 456,
      },
    ];

    const result = getLocationValueForDB("integrations:zoom", eventLocations);
    expect(result.bookingLocation).toBe("integrations:zoom");
    expect(result.conferenceCredentialId).toBe(456);
  });

  it("should allow any location when no locations are configured (backward compatibility)", () => {
    const eventLocations: LocationObject[] = [];

    const result = getLocationValueForDB("phone", eventLocations);
    expect(result.bookingLocation).toBe("phone");
  });
});

describe("User-input location types", () => {
  it("should accept phone number values for phone type locations", () => {
    const eventLocations = [
      { type: "phone", link: "" },
      { type: "integrations:zoom", link: "https://zoom.us/j/123" },
    ];

    const result = getLocationValueForDB("+1 (857) 350-2425", eventLocations);
    expect(result.bookingLocation).toBe("+1 (857) 350-2425");
    expect(result.conferenceCredentialId).toBeUndefined();
  });

  it("should accept address values for attendeeInPerson type locations", () => {
    const eventLocations = [
      { type: "attendeeInPerson", link: "" },
      { type: "integrations:zoom", link: "https://zoom.us/j/123" },
    ];

    const result = getLocationValueForDB("123 Main St, New York, NY 10001", eventLocations);
    expect(result.bookingLocation).toBe("123 Main St, New York, NY 10001");
  });

  it("should accept custom text values for somewhereElse type locations", () => {
    const eventLocations = [
      { type: "somewhereElse", link: "" },
      { type: "phone", link: "" },
    ];

    const result = getLocationValueForDB("We'll coordinate via email", eventLocations);
    expect(result.bookingLocation).toBe("We'll coordinate via email");
  });

  it("should reject invalid phone numbers when phone type is configured", () => {
    const eventLocations = [
      { type: "phone", link: "" },
      { type: "integrations:zoom", link: "https://zoom.us/j/123" },
    ];

    expect(() => {
      getLocationValueForDB("not-a-phone-number", eventLocations);
    }).toThrow(ErrorCode.InvalidLocationForEventType);
  });

  it("should preserve conferenceCredentialId for user-input location types", () => {
    const eventLocations = [
      { type: "phone", link: "", credentialId: 789 },
      { type: "integrations:zoom", link: "https://zoom.us/j/123" },
    ];

    const result = getLocationValueForDB("+1 (857) 350-7425", eventLocations);
    expect(result.bookingLocation).toBe("+1 (857) 350-7425");
    expect(result.conferenceCredentialId).toBe(789);
  });

  it("should handle mixed scenarios correctly", () => {
    const eventLocations = [
      { type: "phone", link: "" },
      { type: "attendeeInPerson", link: "" },
      { type: "integrations:zoom", link: "https://zoom.us/j/123" },
    ];

    // Phone number should work
    const phoneResult = getLocationValueForDB("+1 (857) 350-2425", eventLocations);
    expect(phoneResult.bookingLocation).toBe("+1 (857) 350-2425");

    // Address should work
    const addressResult = getLocationValueForDB("123 Main St", eventLocations);
    expect(addressResult.bookingLocation).toBe("123 Main St");

    // Zoom type should work
    const zoomResult = getLocationValueForDB("integrations:zoom", eventLocations);
    expect(zoomResult.bookingLocation).toBe("integrations:zoom");
  });
});
