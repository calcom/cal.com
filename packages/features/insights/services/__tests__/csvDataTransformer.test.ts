import { describe, it, expect } from "vitest";

import {
  extractFieldValue,
  isSystemField,
  getPhoneFieldsForSeatedEvent,
  getAllFieldsForNonSeatedEvent,
  processBookingAttendees,
  processBookingsForCsv,
  formatCsvRow,
  transformBookingsForCsv,
  type BookingWithAttendees,
  type BookingTimeStatusData,
} from "../csvDataTransformer";

describe("csvDataTransformer", () => {
  describe("extractFieldValue", () => {
    it("should extract string values", () => {
      expect(extractFieldValue("hello")).toBe("hello");
      expect(extractFieldValue("  hello  ")).toBe("  hello  ");
    });

    it("should return null for empty strings", () => {
      expect(extractFieldValue("")).toBe(null);
      expect(extractFieldValue("   ")).toBe(null);
    });

    it("should convert numbers to strings", () => {
      expect(extractFieldValue(42)).toBe("42");
      expect(extractFieldValue(0)).toBe("0");
      expect(extractFieldValue(-5)).toBe("-5");
    });

    it("should convert booleans to strings", () => {
      expect(extractFieldValue(true)).toBe("true");
      expect(extractFieldValue(false)).toBe("false");
    });

    it("should join arrays with comma separator", () => {
      expect(extractFieldValue(["a", "b", "c"])).toBe("a, b, c");
      expect(extractFieldValue([1, 2, 3])).toBe("1, 2, 3");
    });

    it("should filter out null and empty values from arrays", () => {
      expect(extractFieldValue(["a", null, "b", "", "c"])).toBe("a, b, c");
      expect(extractFieldValue([null, "", undefined])).toBe(null);
    });

    it("should extract value from nested objects with value property", () => {
      expect(extractFieldValue({ value: "nested" })).toBe("nested");
      expect(extractFieldValue({ value: 123 })).toBe("123");
      expect(extractFieldValue({ value: ["a", "b"] })).toBe("a, b");
    });

    it("should handle deeply nested value objects", () => {
      expect(extractFieldValue({ value: { value: "deep" } })).toBe("deep");
    });

    it("should return null for null and undefined", () => {
      expect(extractFieldValue(null)).toBe(null);
      expect(extractFieldValue(undefined)).toBe(null);
    });

    it("should return null for objects without value property", () => {
      expect(extractFieldValue({ other: "prop" })).toBe(null);
    });

    it("snapshot: various input types", () => {
      const inputs = [
        "simple string",
        42,
        true,
        false,
        ["option1", "option2"],
        { value: "wrapped" },
        { value: ["multi", "select"] },
        null,
        "",
        ["", null, "valid"],
      ];

      const results = inputs.map((input) => ({
        input: JSON.stringify(input),
        output: extractFieldValue(input),
      }));

      expect(results).toMatchSnapshot();
    });
  });

  describe("isSystemField", () => {
    it("should identify system fields", () => {
      expect(isSystemField("name")).toBe(true);
      expect(isSystemField("email")).toBe(true);
      expect(isSystemField("location")).toBe(true);
      expect(isSystemField("title")).toBe(true);
      expect(isSystemField("notes")).toBe(true);
      expect(isSystemField("guests")).toBe(true);
      expect(isSystemField("rescheduleReason")).toBe(true);
      expect(isSystemField("smsReminderNumber")).toBe(true);
      expect(isSystemField("attendeePhoneNumber")).toBe(true);
      expect(isSystemField("aiAgentCallPhoneNumber")).toBe(true);
    });

    it("should return false for custom fields", () => {
      expect(isSystemField("customField")).toBe(false);
      expect(isSystemField("phone")).toBe(false);
      expect(isSystemField("company")).toBe(false);
      expect(isSystemField("howDidYouHear")).toBe(false);
    });
  });

  describe("getPhoneFieldsForSeatedEvent", () => {
    it("should extract only phone type fields excluding system phone fields", () => {
      const bookingFields = [
        { name: "customPhone", type: "phone", label: "Custom Phone" },
        { name: "attendeePhoneNumber", type: "phone", label: "Attendee Phone" },
        { name: "smsReminderNumber", type: "phone", label: "SMS Reminder" },
        { name: "company", type: "text", label: "Company" },
      ];

      const result = getPhoneFieldsForSeatedEvent(bookingFields);

      expect(result).toEqual([{ name: "customPhone", label: "Custom Phone" }]);
    });

    it("should return null for invalid booking fields", () => {
      expect(getPhoneFieldsForSeatedEvent(null)).toBe(null);
      expect(getPhoneFieldsForSeatedEvent("invalid")).toBe(null);
    });

    it("should use field name as label if label is not provided", () => {
      const bookingFields = [{ name: "customPhone", type: "phone" }];

      const result = getPhoneFieldsForSeatedEvent(bookingFields);

      expect(result).toEqual([{ name: "customPhone", label: "customPhone" }]);
    });

    it("snapshot: phone fields extraction for seated events", () => {
      const bookingFields = [
        { name: "primaryPhone", type: "phone", label: "Primary Phone Number" },
        { name: "secondaryPhone", type: "phone", label: "Secondary Phone" },
        { name: "attendeePhoneNumber", type: "phone", label: "System Phone" },
        { name: "smsReminderNumber", type: "phone", label: "SMS" },
        { name: "aiAgentCallPhoneNumber", type: "phone", label: "AI Phone" },
        { name: "company", type: "text", label: "Company Name" },
        { name: "notes", type: "textarea", label: "Notes" },
      ];

      expect(getPhoneFieldsForSeatedEvent(bookingFields)).toMatchSnapshot();
    });
  });

  describe("getAllFieldsForNonSeatedEvent", () => {
    it("should extract all non-system fields and track phone fields", () => {
      const bookingFields = [
        { name: "name", type: "text", label: "Name" },
        { name: "email", type: "email", label: "Email" },
        { name: "customPhone", type: "phone", label: "Phone" },
        { name: "company", type: "text", label: "Company" },
        { name: "howDidYouHear", type: "select", label: "How did you hear about us?" },
      ];

      const result = getAllFieldsForNonSeatedEvent(bookingFields);

      expect(result).toEqual({
        fields: [
          { name: "customPhone", label: "Phone" },
          { name: "company", label: "Company" },
          { name: "howDidYouHear", label: "How did you hear about us?" },
        ],
        phoneFieldNames: new Set(["customPhone"]),
      });
    });

    it("should return null for invalid booking fields", () => {
      expect(getAllFieldsForNonSeatedEvent(null)).toBe(null);
      expect(getAllFieldsForNonSeatedEvent("invalid")).toBe(null);
    });

    it("snapshot: all fields extraction for non-seated events", () => {
      const bookingFields = [
        { name: "name", type: "text", label: "Your Name" },
        { name: "email", type: "email", label: "Email Address" },
        { name: "location", type: "text", label: "Location" },
        { name: "customPhone", type: "phone", label: "Contact Phone" },
        { name: "company", type: "text", label: "Company Name" },
        { name: "jobTitle", type: "text", label: "Job Title" },
        { name: "budget", type: "number", label: "Budget" },
        { name: "interests", type: "multiselect", label: "Interests" },
        { name: "website", type: "url", label: "Website URL" },
        { name: "agreeToTerms", type: "checkbox", label: "I agree to terms" },
        { name: "additionalNotes", type: "textarea", label: "Additional Notes" },
      ];

      const result = getAllFieldsForNonSeatedEvent(bookingFields);
      expect({
        fields: result?.fields,
        phoneFieldNames: Array.from(result?.phoneFieldNames || []),
      }).toMatchSnapshot();
    });
  });

  describe("processBookingAttendees", () => {
    const createBooking = (overrides: Partial<BookingWithAttendees> = {}): BookingWithAttendees => ({
      uid: "test-uid",
      eventTypeId: 1,
      attendees: [{ name: "John Doe", email: "john@example.com", phoneNumber: null, noShow: false }],
      seatsReferences: [],
      responses: {},
      eventType: { bookingFields: [] },
      ...overrides,
    });

    it("should format attendees correctly", () => {
      const booking = createBooking({
        attendees: [
          { name: "John Doe", email: "john@example.com", phoneNumber: "+1234567890", noShow: false },
          { name: "Jane Smith", email: "jane@example.com", phoneNumber: null, noShow: false },
        ],
      });

      const result = processBookingAttendees(booking, null, null, false);

      expect(result.attendeeList).toEqual(["John Doe (john@example.com)", "Jane Smith (jane@example.com)"]);
      expect(result.attendeePhoneNumbers).toEqual(["+1234567890", null]);
    });

    it("should track no-show attendees", () => {
      const booking = createBooking({
        attendees: [
          { name: "John Doe", email: "john@example.com", phoneNumber: null, noShow: true },
          { name: "Jane Smith", email: "jane@example.com", phoneNumber: null, noShow: false },
          { name: "Bob Wilson", email: "bob@example.com", phoneNumber: null, noShow: true },
        ],
      });

      const result = processBookingAttendees(booking, null, null, false);

      expect(result.noShowGuests).toBe("John Doe (john@example.com); Bob Wilson (bob@example.com)");
      expect(result.noShowGuestsCount).toBe(2);
    });

    it("should use seat references for seated events", () => {
      const booking = createBooking({
        attendees: [{ name: "Should Not Use", email: "no@example.com", phoneNumber: null, noShow: false }],
        seatsReferences: [
          { attendee: { name: "Seat 1", email: "seat1@example.com", phoneNumber: "+111", noShow: false } },
          { attendee: { name: "Seat 2", email: "seat2@example.com", phoneNumber: "+222", noShow: true } },
        ],
      });

      const result = processBookingAttendees(booking, null, null, true);

      expect(result.attendeeList).toEqual(["Seat 1 (seat1@example.com)", "Seat 2 (seat2@example.com)"]);
      expect(result.noShowGuests).toBe("Seat 2 (seat2@example.com)");
    });

    it("should extract booking question responses", () => {
      const booking = createBooking({
        responses: {
          company: "Acme Inc",
          budget: 5000,
          interests: ["marketing", "sales"],
        },
      });

      const bookingFields = [
        { name: "company", label: "Company Name" },
        { name: "budget", label: "Budget" },
        { name: "interests", label: "Interests" },
      ];

      const result = processBookingAttendees(booking, bookingFields, null, false);

      expect(result.bookingQuestionResponses).toEqual({
        "Company Name": "Acme Inc",
        Budget: "5000",
        Interests: "marketing, sales",
      });
    });

    it("should use system phone as fallback for attendee phone", () => {
      const booking = createBooking({
        attendees: [{ name: "John Doe", email: "john@example.com", phoneNumber: null, noShow: false }],
        responses: {
          attendeePhoneNumber: "+1234567890",
        },
      });

      const result = processBookingAttendees(booking, null, null, false);

      expect(result.attendeePhoneNumbers).toEqual(["+1234567890"]);
    });

    it("should use custom phone field as fallback when system phone not available", () => {
      const booking = createBooking({
        attendees: [{ name: "John Doe", email: "john@example.com", phoneNumber: null, noShow: false }],
        responses: {
          customPhone: "+9876543210",
        },
      });

      const bookingFields = [{ name: "customPhone", label: "Custom Phone" }];
      const phoneFieldNames = new Set(["customPhone"]);

      const result = processBookingAttendees(booking, bookingFields, phoneFieldNames, false);

      expect(result.attendeePhoneNumbers).toEqual(["+9876543210"]);
    });

    it("snapshot: complete booking processing", () => {
      const booking = createBooking({
        attendees: [
          { name: "Alice Johnson", email: "alice@example.com", phoneNumber: "+1111111111", noShow: false },
          { name: "Bob Smith", email: "bob@example.com", phoneNumber: null, noShow: true },
          { name: "Carol White", email: "carol@example.com", phoneNumber: null, noShow: false },
        ],
        responses: {
          attendeePhoneNumber: "+0000000000",
          company: "Tech Corp",
          jobTitle: "Engineer",
          budget: 10000,
          interests: ["AI", "Cloud"],
          agreeToTerms: true,
        },
      });

      const bookingFields = [
        { name: "company", label: "Company" },
        { name: "jobTitle", label: "Job Title" },
        { name: "budget", label: "Budget" },
        { name: "interests", label: "Interests" },
        { name: "agreeToTerms", label: "Agreed to Terms" },
      ];

      const result = processBookingAttendees(booking, bookingFields, null, false);

      expect(result).toMatchSnapshot();
    });
  });

  describe("processBookingsForCsv", () => {
    it("should process multiple bookings and track max attendees", () => {
      const bookings: BookingWithAttendees[] = [
        {
          uid: "booking-1",
          eventTypeId: 1,
          attendees: [{ name: "A1", email: "a1@test.com", phoneNumber: null, noShow: false }],
          seatsReferences: [],
          responses: {},
          eventType: { bookingFields: [] },
        },
        {
          uid: "booking-2",
          eventTypeId: 1,
          attendees: [
            { name: "B1", email: "b1@test.com", phoneNumber: null, noShow: false },
            { name: "B2", email: "b2@test.com", phoneNumber: null, noShow: false },
            { name: "B3", email: "b3@test.com", phoneNumber: null, noShow: false },
          ],
          seatsReferences: [],
          responses: {},
          eventType: { bookingFields: [] },
        },
      ];

      const result = processBookingsForCsv(bookings);

      expect(result.maxAttendees).toBe(3);
      expect(result.bookingMap.size).toBe(2);
    });

    it("should collect all booking question labels across bookings", () => {
      const bookings: BookingWithAttendees[] = [
        {
          uid: "booking-1",
          eventTypeId: 1,
          attendees: [{ name: "A", email: "a@test.com", phoneNumber: null, noShow: false }],
          seatsReferences: [],
          responses: { company: "Company A" },
          eventType: {
            bookingFields: [{ name: "company", type: "text", label: "Company" }],
          },
        },
        {
          uid: "booking-2",
          eventTypeId: 2,
          attendees: [{ name: "B", email: "b@test.com", phoneNumber: null, noShow: false }],
          seatsReferences: [],
          responses: { department: "Engineering" },
          eventType: {
            bookingFields: [{ name: "department", type: "text", label: "Department" }],
          },
        },
      ];

      const result = processBookingsForCsv(bookings);

      expect(result.allBookingQuestionLabels).toContain("Company");
      expect(result.allBookingQuestionLabels).toContain("Department");
    });

    it("snapshot: processing multiple bookings with different event types", () => {
      const bookings: BookingWithAttendees[] = [
        {
          uid: "non-seated-booking",
          eventTypeId: 1,
          attendees: [
            { name: "John Doe", email: "john@example.com", phoneNumber: "+1234567890", noShow: false },
            { name: "Jane Smith", email: "jane@example.com", phoneNumber: null, noShow: true },
          ],
          seatsReferences: [],
          responses: {
            company: "Acme Inc",
            howDidYouHear: "Google",
            customPhone: "+9999999999",
          },
          eventType: {
            bookingFields: [
              { name: "company", type: "text", label: "Company Name" },
              { name: "howDidYouHear", type: "select", label: "How did you hear about us?" },
              { name: "customPhone", type: "phone", label: "Contact Phone" },
            ],
          },
        },
        {
          uid: "seated-booking",
          eventTypeId: 2,
          attendees: [],
          seatsReferences: [
            { attendee: { name: "Seat A", email: "seata@example.com", phoneNumber: null, noShow: false } },
            { attendee: { name: "Seat B", email: "seatb@example.com", phoneNumber: null, noShow: false } },
          ],
          responses: {
            emergencyPhone: "+5555555555",
          },
          eventType: {
            bookingFields: [
              { name: "emergencyPhone", type: "phone", label: "Emergency Contact" },
              { name: "dietaryRestrictions", type: "text", label: "Dietary Restrictions" },
            ],
          },
        },
      ];

      const result = processBookingsForCsv(bookings);

      expect({
        maxAttendees: result.maxAttendees,
        allBookingQuestionLabels: Array.from(result.allBookingQuestionLabels),
        bookings: Array.from(result.bookingMap.entries()),
      }).toMatchSnapshot();
    });
  });

  describe("formatCsvRow", () => {
    const createBookingTimeStatus = (
      overrides: Partial<BookingTimeStatusData> = {}
    ): BookingTimeStatusData => ({
      id: 1,
      uid: "test-uid",
      title: "Test Meeting",
      createdAt: new Date("2024-01-15T10:00:00Z"),
      timeStatus: "completed",
      eventTypeId: 1,
      eventLength: 30,
      startTime: new Date("2024-01-15T14:00:00Z"),
      endTime: new Date("2024-01-15T14:30:00Z"),
      paid: false,
      userEmail: "host@example.com",
      userUsername: "host",
      rating: 5,
      ratingFeedback: "Great meeting!",
      noShowHost: false,
      ...overrides,
    });

    it("should format dates correctly for timezone", () => {
      const bookingTimeStatus = createBookingTimeStatus();

      const result = formatCsvRow(bookingTimeStatus, null, 0, new Set(), "America/New_York");

      expect(result.createdAt).toBe("2024-01-15T10:00:00.000Z");
      expect(result.createdAt_date).toBe("2024-01-15");
      expect(result.createdAt_time).toBe("05:00:00");
    });

    it("should include attendee columns based on maxAttendees", () => {
      const bookingTimeStatus = createBookingTimeStatus();
      const processedData = {
        noShowGuests: null,
        noShowGuestsCount: 0,
        attendeeList: ["John (john@test.com)", "Jane (jane@test.com)"],
        attendeePhoneNumbers: ["+111", "+222"],
        bookingQuestionResponses: {},
      };

      const result = formatCsvRow(bookingTimeStatus, processedData, 3, new Set(), "UTC");

      expect(result.attendee1).toBe("John (john@test.com)");
      expect(result.attendeePhone1).toBe("+111");
      expect(result.attendee2).toBe("Jane (jane@test.com)");
      expect(result.attendeePhone2).toBe("+222");
      expect(result.attendee3).toBe(null);
      expect(result.attendeePhone3).toBe(null);
    });

    it("should include booking question responses", () => {
      const bookingTimeStatus = createBookingTimeStatus();
      const processedData = {
        noShowGuests: null,
        noShowGuestsCount: 0,
        attendeeList: [],
        attendeePhoneNumbers: [],
        bookingQuestionResponses: {
          Company: "Acme Inc",
          Budget: "5000",
        },
      };

      const result = formatCsvRow(
        bookingTimeStatus,
        processedData,
        0,
        new Set(["Company", "Budget", "Notes"]),
        "UTC"
      );

      expect(result.Company).toBe("Acme Inc");
      expect(result.Budget).toBe("5000");
      expect(result.Notes).toBe(null);
    });

    it("snapshot: complete CSV row formatting", () => {
      const bookingTimeStatus = createBookingTimeStatus({
        id: 123,
        uid: "booking-abc-123",
        title: "Strategy Meeting",
        createdAt: new Date("2024-03-20T09:30:00Z"),
        timeStatus: "completed",
        eventTypeId: 5,
        eventLength: 60,
        startTime: new Date("2024-03-20T15:00:00Z"),
        endTime: new Date("2024-03-20T16:00:00Z"),
        paid: true,
        userEmail: "manager@company.com",
        userUsername: "manager",
        rating: 4,
        ratingFeedback: "Very productive",
        noShowHost: false,
      });

      const processedData = {
        noShowGuests: "Late Person (late@example.com)",
        noShowGuestsCount: 1,
        attendeeList: [
          "Alice Johnson (alice@example.com)",
          "Bob Smith (bob@example.com)",
          "Late Person (late@example.com)",
        ],
        attendeePhoneNumbers: ["+1111111111", "+2222222222", null],
        bookingQuestionResponses: {
          Company: "Tech Corp",
          "Job Title": "Senior Engineer",
          Budget: "50000",
          "Meeting Purpose": "Quarterly Review",
        },
      };

      const allLabels = new Set(["Company", "Job Title", "Budget", "Meeting Purpose", "Additional Notes"]);

      const result = formatCsvRow(bookingTimeStatus, processedData, 3, allLabels, "America/Los_Angeles");

      expect(result).toMatchSnapshot();
    });
  });

  describe("transformBookingsForCsv", () => {
    it("snapshot: complete transformation pipeline", () => {
      const csvData: BookingTimeStatusData[] = [
        {
          id: 1,
          uid: "booking-1",
          title: "Sales Call",
          createdAt: new Date("2024-02-01T08:00:00Z"),
          timeStatus: "completed",
          eventTypeId: 1,
          eventLength: 30,
          startTime: new Date("2024-02-01T10:00:00Z"),
          endTime: new Date("2024-02-01T10:30:00Z"),
          paid: false,
          userEmail: "sales@company.com",
          userUsername: "sales",
          rating: 5,
          ratingFeedback: "Excellent",
          noShowHost: false,
        },
        {
          id: 2,
          uid: "booking-2",
          title: "Team Workshop",
          createdAt: new Date("2024-02-02T09:00:00Z"),
          timeStatus: "completed",
          eventTypeId: 2,
          eventLength: 120,
          startTime: new Date("2024-02-02T14:00:00Z"),
          endTime: new Date("2024-02-02T16:00:00Z"),
          paid: true,
          userEmail: "trainer@company.com",
          userUsername: "trainer",
          rating: null,
          ratingFeedback: null,
          noShowHost: false,
        },
        {
          id: 3,
          uid: null,
          title: "Orphan Booking",
          createdAt: new Date("2024-02-03T10:00:00Z"),
          timeStatus: "upcoming",
          eventTypeId: null,
          eventLength: 45,
          startTime: new Date("2024-02-03T15:00:00Z"),
          endTime: new Date("2024-02-03T15:45:00Z"),
          paid: false,
          userEmail: "user@company.com",
          userUsername: "user",
          rating: null,
          ratingFeedback: null,
          noShowHost: false,
        },
      ];

      const bookings: BookingWithAttendees[] = [
        {
          uid: "booking-1",
          eventTypeId: 1,
          attendees: [
            { name: "Client A", email: "clienta@example.com", phoneNumber: "+1234567890", noShow: false },
          ],
          seatsReferences: [],
          responses: {
            company: "Client Corp",
            budget: 25000,
            timeline: "Q2 2024",
          },
          eventType: {
            bookingFields: [
              { name: "company", type: "text", label: "Company" },
              { name: "budget", type: "number", label: "Budget" },
              { name: "timeline", type: "text", label: "Timeline" },
            ],
          },
        },
        {
          uid: "booking-2",
          eventTypeId: 2,
          attendees: [],
          seatsReferences: [
            {
              attendee: { name: "Participant 1", email: "p1@example.com", phoneNumber: null, noShow: false },
            },
            { attendee: { name: "Participant 2", email: "p2@example.com", phoneNumber: null, noShow: true } },
            {
              attendee: {
                name: "Participant 3",
                email: "p3@example.com",
                phoneNumber: "+9876543210",
                noShow: false,
              },
            },
          ],
          responses: {
            emergencyContact: "+5555555555",
          },
          eventType: {
            bookingFields: [{ name: "emergencyContact", type: "phone", label: "Emergency Contact" }],
          },
        },
      ];

      const result = transformBookingsForCsv(csvData, bookings, "UTC");

      expect(result).toMatchSnapshot();
    });

    it("should handle empty bookings array", () => {
      const csvData: BookingTimeStatusData[] = [
        {
          id: 1,
          uid: "booking-1",
          title: "Test",
          createdAt: new Date("2024-01-01T00:00:00Z"),
          timeStatus: "completed",
          eventTypeId: 1,
          eventLength: 30,
          startTime: new Date("2024-01-01T10:00:00Z"),
          endTime: new Date("2024-01-01T10:30:00Z"),
          paid: false,
          userEmail: "test@test.com",
          userUsername: "test",
          rating: null,
          ratingFeedback: null,
          noShowHost: false,
        },
      ];

      const result = transformBookingsForCsv(csvData, [], "UTC");

      expect(result).toHaveLength(1);
      expect(result[0].noShowGuests).toBe(null);
      expect(result[0].noShowGuestsCount).toBe(0);
    });

    it("should handle bookings with no matching csvData entries", () => {
      const csvData: BookingTimeStatusData[] = [];
      const bookings: BookingWithAttendees[] = [
        {
          uid: "booking-1",
          eventTypeId: 1,
          attendees: [{ name: "Test", email: "test@test.com", phoneNumber: null, noShow: false }],
          seatsReferences: [],
          responses: {},
          eventType: { bookingFields: [] },
        },
      ];

      const result = transformBookingsForCsv(csvData, bookings, "UTC");

      expect(result).toHaveLength(0);
    });
  });
});
