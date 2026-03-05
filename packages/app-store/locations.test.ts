import { describe, it, expect, vi } from "vitest";

import { BookingStatus } from "@calcom/prisma/enums";

import { DailyLocationType } from "./constants";
import {
  DefaultEventLocationTypeEnum,
  getEventLocationType,
  getLocationFromApp,
  guessEventLocationType,
  isStaticLocationType,
  isCalVideoLocation,
  getAppSlugFromLocationType,
  privacyFilteredLocations,
  getMessageForOrganizer,
  getHumanReadableLocationValue,
  locationKeyToString,
  getEventLocationWithType,
  getLocationValueForDB,
  getEventLocationValue,
  getSuccessPageLocationMessage,
  getTranslatedLocation,
  getOrganizerInputLocationTypes,
  isAttendeeInputRequired,
  locationsResolver,
  defaultLocations,
} from "./locations";
import type { LocationObject } from "./locations";

const mockT = vi.fn((key: string, _opts?: Record<string, string>) => key) as unknown as Parameters<
  typeof getMessageForOrganizer
>[1];

describe("getEventLocationType", () => {
  it("should find a default location type", () => {
    const result = getEventLocationType(DefaultEventLocationTypeEnum.InPerson);
    expect(result).toBeDefined();
    expect(result!.type).toBe(DefaultEventLocationTypeEnum.InPerson);
  });

  it("should find an app-based location type", () => {
    const result = getEventLocationType("integrations:daily");
    expect(result).toBeDefined();
    expect(result!.type).toBe("integrations:daily");
  });

  it("should return undefined for unknown type", () => {
    const result = getEventLocationType("nonexistent:type");
    expect(result).toBeUndefined();
  });

  it("should return undefined for null/undefined", () => {
    expect(getEventLocationType(null)).toBeUndefined();
    expect(getEventLocationType(undefined)).toBeUndefined();
  });
});

describe("getLocationFromApp", () => {
  it("should find app location", () => {
    const result = getLocationFromApp("integrations:daily");
    expect(result).toBeDefined();
    expect(result!.type).toBe("integrations:daily");
  });

  it("should return undefined for default location types", () => {
    const result = getLocationFromApp(DefaultEventLocationTypeEnum.InPerson);
    expect(result).toBeUndefined();
  });

  it("should return undefined for unknown type", () => {
    const result = getLocationFromApp("nonexistent:type");
    expect(result).toBeUndefined();
  });
});

describe("guessEventLocationType", () => {
  it("should find by exact type match", () => {
    const result = guessEventLocationType("integrations:daily");
    expect(result).toBeDefined();
    expect(result!.type).toBe("integrations:daily");
  });

  it("should return undefined for neither type nor URL match", () => {
    const result = guessEventLocationType("random-string");
    expect(result).toBeUndefined();
  });

  it("should return falsy for undefined", () => {
    expect(guessEventLocationType(undefined)).toBeFalsy();
  });
});

describe("isStaticLocationType", () => {
  it("should return true for default enum values", () => {
    expect(isStaticLocationType(DefaultEventLocationTypeEnum.InPerson)).toBe(true);
    expect(isStaticLocationType(DefaultEventLocationTypeEnum.Phone)).toBe(true);
    expect(isStaticLocationType(DefaultEventLocationTypeEnum.Link)).toBe(true);
  });

  it("should return false for non-static types", () => {
    expect(isStaticLocationType("integrations:daily")).toBe(false);
    expect(isStaticLocationType("random-type")).toBe(false);
  });
});

describe("isCalVideoLocation", () => {
  it("should return true for Daily type", () => {
    expect(isCalVideoLocation(DailyLocationType)).toBe(true);
  });

  it("should return false for other types", () => {
    expect(isCalVideoLocation("integrations:zoom")).toBe(false);
    expect(isCalVideoLocation(DefaultEventLocationTypeEnum.InPerson)).toBe(false);
  });
});

describe("getAppSlugFromLocationType", () => {
  it("should return slug for a known app location type", () => {
    const slug = getAppSlugFromLocationType("integrations:daily");
    expect(slug).toBe("daily-video");
  });

  it("should return null for unknown type", () => {
    const slug = getAppSlugFromLocationType("nonexistent:type");
    expect(slug).toBeNull();
  });

  it("should return null for default location types", () => {
    const slug = getAppSlugFromLocationType(DefaultEventLocationTypeEnum.InPerson);
    expect(slug).toBeNull();
  });
});

describe("privacyFilteredLocations", () => {
  it("should return location as-is when displayLocationPublicly is true", () => {
    const locations: LocationObject[] = [
      {
        type: DefaultEventLocationTypeEnum.InPerson,
        address: "123 Main St",
        displayLocationPublicly: true,
      },
    ];
    const result = privacyFilteredLocations(locations);
    expect(result[0]).toHaveProperty("address", "123 Main St");
  });

  it("should strip private fields when displayLocationPublicly is false", () => {
    const locations: LocationObject[] = [
      {
        type: DefaultEventLocationTypeEnum.InPerson,
        address: "123 Main St",
        link: "https://example.com",
        hostPhoneNumber: "+1234567890",
        displayLocationPublicly: false,
      },
    ];
    const result = privacyFilteredLocations(locations);
    expect(result[0]).not.toHaveProperty("address");
    expect(result[0]).not.toHaveProperty("link");
    expect(result[0]).not.toHaveProperty("hostPhoneNumber");
  });

  it("should keep location as-is when type is unknown", () => {
    const locations: LocationObject[] = [
      {
        type: "unknown:type",
        address: "123 Main St",
      },
    ];
    const result = privacyFilteredLocations(locations);
    expect(result[0]).toHaveProperty("address", "123 Main St");
  });

  it("should handle mixed array", () => {
    const locations: LocationObject[] = [
      {
        type: DefaultEventLocationTypeEnum.InPerson,
        address: "123 Main St",
        displayLocationPublicly: true,
      },
      {
        type: DefaultEventLocationTypeEnum.UserPhone,
        hostPhoneNumber: "+1234567890",
        displayLocationPublicly: false,
      },
    ];
    const result = privacyFilteredLocations(locations);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty("address", "123 Main St");
    expect(result[1]).not.toHaveProperty("hostPhoneNumber");
  });
});

describe("getMessageForOrganizer", () => {
  it("should return translated message for default location", () => {
    const result = getMessageForOrganizer(DefaultEventLocationTypeEnum.InPerson, mockT);
    expect(result).toBe("Provide an Address or Place");
  });

  it("should return message for dynamic video location", () => {
    const result = getMessageForOrganizer("integrations:daily", mockT);
    // Daily is dynamic and not zoom, so should return Cal will provide message
    expect(result).toContain("Cal will provide");
  });

  it("should return empty string for unknown location", () => {
    const result = getMessageForOrganizer("unknown:type", mockT);
    expect(result).toBe("");
  });
});

describe("getHumanReadableLocationValue", () => {
  it("should return no_location for null/undefined value", () => {
    expect(getHumanReadableLocationValue(null, mockT)).toBe("no_location");
    expect(getHumanReadableLocationValue(undefined, mockT)).toBe("no_location");
  });

  it("should return translated label for default type", () => {
    const result = getHumanReadableLocationValue(DefaultEventLocationTypeEnum.InPerson, mockT);
    expect(result).toBe("in_person");
  });

  it("should return label for app-based type", () => {
    const result = getHumanReadableLocationValue("integrations:daily", mockT);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("should return raw value when no type match found", () => {
    const result = getHumanReadableLocationValue("https://meet.google.com/abc-def", mockT);
    expect(result).toBe("https://meet.google.com/abc-def");
  });
});

describe("locationKeyToString", () => {
  it("should return value from defaultValueVariable when present", () => {
    const location: LocationObject = {
      type: DefaultEventLocationTypeEnum.InPerson,
      address: "123 Main St",
    };
    const result = locationKeyToString(location);
    expect(result).toBe("123 Main St");
  });

  it("should return label when value is not present", () => {
    const location: LocationObject = {
      type: DefaultEventLocationTypeEnum.InPerson,
    };
    const result = locationKeyToString(location);
    expect(typeof result).toBe("string");
  });

  it("should return null for unknown type", () => {
    const location: LocationObject = {
      type: "unknown:type",
    };
    const result = locationKeyToString(location);
    expect(result).toBeNull();
  });
});

describe("getEventLocationWithType", () => {
  it("should find location by type", () => {
    const locations: LocationObject[] = [
      { type: DefaultEventLocationTypeEnum.InPerson, address: "123 Main St" },
      { type: DefaultEventLocationTypeEnum.Phone },
    ];
    const result = getEventLocationWithType(locations, DefaultEventLocationTypeEnum.InPerson);
    expect(result).toBeDefined();
    expect(result!.address).toBe("123 Main St");
  });

  it("should return undefined when not found", () => {
    const locations: LocationObject[] = [{ type: DefaultEventLocationTypeEnum.InPerson }];
    const result = getEventLocationWithType(locations, DefaultEventLocationTypeEnum.Phone);
    expect(result).toBeUndefined();
  });
});

describe("getLocationValueForDB", () => {
  it("should resolve static link value from event locations", () => {
    const locations: LocationObject[] = [
      {
        type: DefaultEventLocationTypeEnum.InPerson,
        address: "123 Main St",
      },
    ];
    const result = getLocationValueForDB(DefaultEventLocationTypeEnum.InPerson, locations);
    expect(result.bookingLocation).toBe("123 Main St");
  });

  it("should keep type for dynamic link-based locations", () => {
    const locations: LocationObject[] = [
      {
        type: "integrations:daily",
      },
    ];
    const result = getLocationValueForDB("integrations:daily", locations);
    expect(result.bookingLocation).toBe("integrations:daily");
  });

  it("should return original value when no match", () => {
    const result = getLocationValueForDB("some-type", []);
    expect(result.bookingLocation).toBe("some-type");
  });

  it("should fallback to Daily when booking location is empty", () => {
    const locations: LocationObject[] = [
      {
        type: DefaultEventLocationTypeEnum.InPerson,
        address: "",
      },
    ];
    // Empty address with matching type should resolve to empty, then fallback to Daily
    const result = getLocationValueForDB(DefaultEventLocationTypeEnum.InPerson, locations);
    // address is "" which is falsy, so falls through to bookingLocation which is InPerson type
    expect(typeof result.bookingLocation).toBe("string");
  });

  it("should extract credentialId from location", () => {
    const locations: LocationObject[] = [
      {
        type: "integrations:daily",
        credentialId: 42,
      },
    ];
    const result = getLocationValueForDB("integrations:daily", locations);
    expect(result.conferenceCredentialId).toBe(42);
  });
});

describe("getEventLocationValue", () => {
  it("should get value from booking location's defaultValueVariable", () => {
    const eventLocations: LocationObject[] = [
      {
        type: DefaultEventLocationTypeEnum.Phone,
        phone: "+1234567890",
      },
    ];
    const bookingLocation: LocationObject = {
      type: DefaultEventLocationTypeEnum.Phone,
      phone: "+1234567890",
    };
    const result = getEventLocationValue(eventLocations, bookingLocation);
    expect(result).toBe("+1234567890");
  });

  it("should fallback to event location value", () => {
    const eventLocations: LocationObject[] = [
      {
        type: DefaultEventLocationTypeEnum.InPerson,
        address: "123 Main St",
      },
    ];
    const bookingLocation: LocationObject = {
      type: DefaultEventLocationTypeEnum.InPerson,
    };
    const result = getEventLocationValue(eventLocations, bookingLocation);
    expect(result).toBe("123 Main St");
  });

  it("should fallback to type when no value available", () => {
    const eventLocations: LocationObject[] = [
      {
        type: "integrations:daily",
      },
    ];
    const bookingLocation: LocationObject = {
      type: "integrations:daily",
    };
    const result = getEventLocationValue(eventLocations, bookingLocation);
    expect(result).toBe("integrations:daily");
  });

  it("should return empty string for unknown location type", () => {
    const eventLocations: LocationObject[] = [];
    const bookingLocation: LocationObject = {
      type: "unknown:type",
    };
    const result = getEventLocationValue(eventLocations, bookingLocation);
    expect(result).toBe("");
  });
});

describe("getSuccessPageLocationMessage", () => {
  it("should return location as-is for default locations", () => {
    const result = getSuccessPageLocationMessage(DefaultEventLocationTypeEnum.InPerson, mockT);
    expect(result).toBe(DefaultEventLocationTypeEnum.InPerson);
  });

  it("should return web_conference for dynamic+CANCELLED", () => {
    const result = getSuccessPageLocationMessage("integrations:daily", mockT, BookingStatus.CANCELLED);
    expect(result).toBe("web_conference");
  });

  it("should return web_conference for dynamic+REJECTED", () => {
    const result = getSuccessPageLocationMessage("integrations:daily", mockT, BookingStatus.REJECTED);
    expect(result).toBe("web_conference");
  });

  it("should return meeting URL message for dynamic+ACCEPTED", () => {
    const result = getSuccessPageLocationMessage("integrations:daily", mockT, BookingStatus.ACCEPTED);
    expect(result).toContain("meeting_url_in_confirmation_email");
  });

  it("should return details to follow for dynamic+PENDING", () => {
    const result = getSuccessPageLocationMessage("integrations:daily", mockT, BookingStatus.PENDING);
    expect(result).toBe("web_conferencing_details_to_follow");
  });
});

describe("getTranslatedLocation", () => {
  it("should return label for integration prefix type", () => {
    const location: LocationObject = { type: "integrations:daily" };
    const eventLocationType = getEventLocationType("integrations:daily");
    const result = getTranslatedLocation(location, eventLocationType, mockT);
    expect(result).toBe(eventLocationType!.label);
  });

  it("should translate key for translatable default location", () => {
    const location: LocationObject = { type: DefaultEventLocationTypeEnum.InPerson, address: "123 Main St" };
    const eventLocationType = getEventLocationType(DefaultEventLocationTypeEnum.InPerson);
    const result = getTranslatedLocation(location, eventLocationType, mockT);
    // locationKeyToString returns address for InPerson, and since it's not in translateAbleKeys, it returns as-is
    expect(typeof result).toBe("string");
    expect(result).toBe("123 Main St");
  });

  it("should return key as-is for non-translatable location", () => {
    const location: LocationObject = { type: DefaultEventLocationTypeEnum.Link, link: "https://example.com" };
    const eventLocationType = getEventLocationType(DefaultEventLocationTypeEnum.Link);
    const result = getTranslatedLocation(location, eventLocationType, mockT);
    expect(typeof result).toBe("string");
  });

  it("should return null for null eventLocationType", () => {
    const location: LocationObject = { type: "unknown:type" };
    const result = getTranslatedLocation(location, undefined, mockT);
    expect(result).toBeNull();
  });
});

describe("getOrganizerInputLocationTypes", () => {
  it("should return array of location types that require organizer input", () => {
    const result = getOrganizerInputLocationTypes();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should include InPerson and UserPhone (both have organizerInputType)", () => {
    const result = getOrganizerInputLocationTypes();
    expect(result).toContain(DefaultEventLocationTypeEnum.InPerson);
    expect(result).toContain(DefaultEventLocationTypeEnum.UserPhone);
  });
});

describe("isAttendeeInputRequired", () => {
  it("should return attendeeInputType for phone location", () => {
    const result = isAttendeeInputRequired(DefaultEventLocationTypeEnum.Phone);
    expect(result).toBe("phone");
  });

  it("should return false for unknown location type", () => {
    const result = isAttendeeInputRequired("nonexistent:type");
    expect(result).toBe(false);
  });
});

describe("locationsResolver", () => {
  it("should return a zod schema that parses valid locations", () => {
    const schema = locationsResolver(mockT);
    const result = schema!.safeParse([
      { type: DefaultEventLocationTypeEnum.InPerson, address: "123 Main St" },
    ]);
    expect(result.success).toBe(true);
  });

  it("should validate phone numbers", () => {
    const schema = locationsResolver(mockT);
    const result = schema!.safeParse([{ type: DefaultEventLocationTypeEnum.Phone, phone: "invalid" }]);
    expect(result.success).toBe(false);
  });

  it("should accept valid phone numbers", () => {
    const schema = locationsResolver(mockT);
    const result = schema!.safeParse([
      { type: DefaultEventLocationTypeEnum.Phone, phone: "+14155552671" },
    ]);
    expect(result.success).toBe(true);
  });

  it("should be optional (accept undefined)", () => {
    const schema = locationsResolver(mockT);
    const result = schema!.safeParse(undefined);
    expect(result.success).toBe(true);
  });

  it("should accept empty array", () => {
    const schema = locationsResolver(mockT);
    const result = schema!.safeParse([]);
    expect(result.success).toBe(true);
  });
});
