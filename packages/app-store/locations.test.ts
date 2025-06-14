import { describe, it, expect } from "vitest";

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
    }).toThrow("InvalidLocationForEventType: Location 'phone' is not allowed for this event type.");

    expect(() => {
      getLocationValueForDB("inPerson", eventLocations);
    }).toThrow("InvalidLocationForEventType: Location 'inPerson' is not allowed for this event type.");
  });

  it("should handle empty location by using first available or default", () => {
    const eventLocations = [
      { type: "integrations:zoom", link: "https://zoom.us/j/123" },
      { type: "phone", link: "" },
    ];

    const result = getLocationValueForDB("", eventLocations);
    expect(result.bookingLocation).toBe("integrations:zoom");
  });

  it("should handle displayLocationPublicly cases", () => {
    const eventLocations = [
      {
        type: "link",
        link: "https://meet.example.com/room",
        displayLocationPublicly: true,
      },
    ];

    const result = getLocationValueForDB("https://meet.example.com/room", eventLocations);
    expect(result.bookingLocation).toBe("https://meet.example.com/room");
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
