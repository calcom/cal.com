import { describe, expect, it } from "vitest";

import {
  extractFieldValue,
  formatCsvRow,
  getUtmDataForBooking,
  isSystemField,
  processBookingAttendees,
  processBookingsForCsv,
  type BookingTimeStatusData,
  type BookingWithAttendees,
} from "./csvDataTransformer";

describe("extractFieldValue", () => {
  it("returns string value when non-empty", () => {
    expect(extractFieldValue("hello")).toBe("hello");
  });

  it("returns null for empty string", () => {
    expect(extractFieldValue("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(extractFieldValue("   ")).toBeNull();
  });

  it("returns stringified number", () => {
    expect(extractFieldValue(42)).toBe("42");
  });

  it("returns stringified boolean", () => {
    expect(extractFieldValue(true)).toBe("true");
    expect(extractFieldValue(false)).toBe("false");
  });

  it("joins array values with comma", () => {
    expect(extractFieldValue(["a", "b", "c"])).toBe("a, b, c");
  });

  it("filters null and empty values from array", () => {
    expect(extractFieldValue(["a", null, "", "b"])).toBe("a, b");
  });

  it("returns null for empty array after filtering", () => {
    expect(extractFieldValue([null, "", undefined])).toBeNull();
  });

  it("extracts value from object with value property", () => {
    expect(extractFieldValue({ value: "nested" })).toBe("nested");
  });

  it("recursively extracts nested value objects", () => {
    expect(extractFieldValue({ value: { value: "deep" } })).toBe("deep");
  });

  it("returns null for null", () => {
    expect(extractFieldValue(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(extractFieldValue(undefined)).toBeNull();
  });
});

describe("isSystemField", () => {
  it("returns true for known system fields", () => {
    expect(isSystemField("name")).toBe(true);
    expect(isSystemField("email")).toBe(true);
    expect(isSystemField("location")).toBe(true);
  });

  it("returns false for custom fields", () => {
    expect(isSystemField("myCustomField")).toBe(false);
    expect(isSystemField("companyName")).toBe(false);
  });
});

describe("processBookingAttendees", () => {
  const makeBooking = (overrides: Partial<BookingWithAttendees> = {}): BookingWithAttendees => ({
    uid: "uid-1",
    eventTypeId: 1,
    attendees: [
      { name: "Alice", email: "alice@test.com", phoneNumber: "+1111111111", noShow: false },
      { name: "Bob", email: "bob@test.com", phoneNumber: null, noShow: false },
    ],
    seatsReferences: [],
    responses: {},
    eventType: null,
    tracking: null,
    ...overrides,
  });

  it("formats attendees as 'Name (email)'", () => {
    const result = processBookingAttendees(makeBooking(), null, null, false);
    expect(result.attendeeList).toEqual(["Alice (alice@test.com)", "Bob (bob@test.com)"]);
  });

  it("counts no-show attendees", () => {
    const booking = makeBooking({
      attendees: [
        { name: "Alice", email: "alice@test.com", phoneNumber: null, noShow: true },
        { name: "Bob", email: "bob@test.com", phoneNumber: null, noShow: false },
      ],
    });
    const result = processBookingAttendees(booking, null, null, false);
    expect(result.noShowGuestsCount).toBe(1);
    expect(result.noShowGuests).toBe("Alice (alice@test.com)");
  });

  it("returns null noShowGuests when no attendees are no-show", () => {
    const result = processBookingAttendees(makeBooking(), null, null, false);
    expect(result.noShowGuests).toBeNull();
    expect(result.noShowGuestsCount).toBe(0);
  });

  it("uses seatsReferences attendees when present", () => {
    const booking = makeBooking({
      attendees: [{ name: "Original", email: "orig@test.com", phoneNumber: null, noShow: false }],
      seatsReferences: [
        { attendee: { name: "Seated", email: "seated@test.com", phoneNumber: null, noShow: false } },
      ],
    });
    const result = processBookingAttendees(booking, null, null, true);
    expect(result.attendeeList).toEqual(["Seated (seated@test.com)"]);
  });

  it("extracts phone numbers from attendees", () => {
    const result = processBookingAttendees(makeBooking(), null, null, false);
    expect(result.attendeePhoneNumbers[0]).toBe("+1111111111");
  });

  it("falls back to system phone from responses when attendee has no phone", () => {
    const booking = makeBooking({
      attendees: [{ name: "Alice", email: "alice@test.com", phoneNumber: null, noShow: false }],
      responses: { attendeePhoneNumber: "+9999999999" },
    });
    const result = processBookingAttendees(booking, null, null, false);
    expect(result.attendeePhoneNumbers[0]).toBe("+9999999999");
  });
});

describe("processBookingsForCsv", () => {
  it("returns empty map for empty bookings array", () => {
    const result = processBookingsForCsv([]);
    expect(result.bookingMap.size).toBe(0);
    expect(result.maxAttendees).toBe(0);
    expect(result.allBookingQuestionLabels.size).toBe(0);
  });

  it("tracks max attendees across bookings", () => {
    const bookings: BookingWithAttendees[] = [
      {
        uid: "uid-1",
        eventTypeId: 1,
        attendees: [
          { name: "A", email: "a@test.com", phoneNumber: null, noShow: false },
          { name: "B", email: "b@test.com", phoneNumber: null, noShow: false },
        ],
        seatsReferences: [],
        responses: {},
        eventType: null,
        tracking: null,
      },
      {
        uid: "uid-2",
        eventTypeId: 1,
        attendees: [{ name: "C", email: "c@test.com", phoneNumber: null, noShow: false }],
        seatsReferences: [],
        responses: {},
        eventType: null,
        tracking: null,
      },
    ];
    const result = processBookingsForCsv(bookings);
    expect(result.maxAttendees).toBe(2);
    expect(result.bookingMap.size).toBe(2);
  });
});

describe("formatCsvRow", () => {
  const baseBookingData: BookingTimeStatusData = {
    id: 1,
    uid: "uid-1",
    title: "Test Meeting",
    createdAt: new Date("2025-06-15T10:00:00Z"),
    timeStatus: "upcoming",
    eventTypeId: 1,
    eventLength: 30,
    startTime: new Date("2025-06-16T14:00:00Z"),
    endTime: new Date("2025-06-16T14:30:00Z"),
    paid: false,
    userEmail: "host@test.com",
    userUsername: "host",
    rating: null,
    ratingFeedback: null,
    noShowHost: false,
  };

  it("includes date and time fields in UTC", () => {
    const row = formatCsvRow(baseBookingData, null, 0, new Set(), "UTC");
    expect(row.createdAt_date).toBe("2025-06-15");
    expect(row.createdAt_time).toBe("10:00:00");
    expect(row.startTime_date).toBe("2025-06-16");
    expect(row.startTime_time).toBe("14:00:00");
    expect(row.endTime_date).toBe("2025-06-16");
    expect(row.endTime_time).toBe("14:30:00");
  });

  it("includes attendee columns up to maxAttendees", () => {
    const processedData = {
      noShowGuests: null,
      noShowGuestsCount: 0,
      attendeeList: ["Alice (alice@test.com)"],
      attendeePhoneNumbers: ["+1111111111"],
      bookingQuestionResponses: {},
    };
    const row = formatCsvRow(baseBookingData, processedData, 2, new Set(), "UTC");
    expect(row.attendee1).toBe("Alice (alice@test.com)");
    expect(row.attendeePhone1).toBe("+1111111111");
    expect(row.attendee2).toBeNull();
    expect(row.attendeePhone2).toBeNull();
  });

  it("includes booking question responses", () => {
    const processedData = {
      noShowGuests: null,
      noShowGuestsCount: 0,
      attendeeList: [],
      attendeePhoneNumbers: [],
      bookingQuestionResponses: { "Company Name": "Acme Inc" },
    };
    const labels = new Set(["Company Name", "Notes"]);
    const row = formatCsvRow(baseBookingData, processedData, 0, labels, "UTC");
    expect(row["Company Name"]).toBe("Acme Inc");
    expect(row.Notes).toBeNull();
  });

  it("handles null processedData", () => {
    const row = formatCsvRow(baseBookingData, null, 1, new Set(), "UTC");
    expect(row.noShowGuests).toBeNull();
    expect(row.noShowGuestsCount).toBe(0);
    expect(row.attendee1).toBeNull();
  });
});

describe("getUtmDataForBooking", () => {
  it("returns empty strings for undefined booking", () => {
    const result = getUtmDataForBooking(undefined);
    expect(result.utm_source).toBe("");
    expect(result.utm_medium).toBe("");
    expect(result.utm_campaign).toBe("");
    expect(result.utm_term).toBe("");
    expect(result.utm_content).toBe("");
  });

  it("returns tracking data when present", () => {
    const booking: BookingWithAttendees = {
      uid: "uid-1",
      eventTypeId: 1,
      attendees: [],
      seatsReferences: [],
      responses: {},
      eventType: null,
      tracking: {
        utm_source: "google",
        utm_medium: "cpc",
        utm_campaign: "summer",
        utm_term: "scheduling",
        utm_content: "banner",
      },
    };
    const result = getUtmDataForBooking(booking);
    expect(result.utm_source).toBe("google");
    expect(result.utm_medium).toBe("cpc");
    expect(result.utm_campaign).toBe("summer");
    expect(result.utm_term).toBe("scheduling");
    expect(result.utm_content).toBe("banner");
  });

  it("returns empty strings for null tracking fields", () => {
    const booking: BookingWithAttendees = {
      uid: "uid-1",
      eventTypeId: 1,
      attendees: [],
      seatsReferences: [],
      responses: {},
      eventType: null,
      tracking: {
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        utm_term: null,
        utm_content: null,
      },
    };
    const result = getUtmDataForBooking(booking);
    expect(result.utm_source).toBe("");
    expect(result.utm_medium).toBe("");
  });
});
