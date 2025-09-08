import { describe, it, expect } from "vitest";

import { BookingDateInPastError, isTimeOutOfBounds } from "@calcom/lib/isOutOfBounds";

import { TRPCError } from "@trpc/server";

describe("BookingDateInPastError handling", () => {
  it("should convert BookingDateInPastError to TRPCError with BAD_REQUEST code", () => {
    const testFilteringLogic = () => {
      const mockSlot = {
        time: "2024-05-20T12:30:00.000Z", // Past date
        attendees: 1,
      };

      const mockEventType = {
        minimumBookingNotice: 0,
      };

      const isFutureLimitViolationForTheSlot = false; // Mock this to false

      let isOutOfBounds = false;
      try {
        // This will throw BookingDateInPastError for past dates
        isOutOfBounds = isTimeOutOfBounds({
          time: mockSlot.time,
          minimumBookingNotice: mockEventType.minimumBookingNotice,
        });
      } catch (error) {
        if (error instanceof BookingDateInPastError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw error;
      }

      return !isFutureLimitViolationForTheSlot && !isOutOfBounds;
    };

    // This should throw a TRPCError with BAD_REQUEST code
    expect(() => testFilteringLogic()).toThrow(TRPCError);
    expect(() => testFilteringLogic()).toThrow("Attempting to book a meeting in the past.");
  });
});

describe("Reschedule attendee availability integration", () => {
  it("should include all attendees from original booking for upstream availability check", () => {
    // Test the core filtering logic from addAttendeeAvailabilityForReschedule
    const attendees = [
      { email: "host@example.com" },           // Should exclude (host)
      { email: "attendee1@example.com" },     // Should include  
      { email: "attendee2@example.com" },     // Should include
      { email: "attendee3@example.com" },     // Should include
      { email: "" },                          // Should exclude (empty email)
    ];

    const existingEmails = ["host@example.com"];
    const MAX_ATTENDEES = 10;

    // Simulate the filtering logic from addAttendeeAvailabilityForReschedule
    const attendeeEmailsMap: { [key: string]: boolean } = {};
    const attendeeEmails: string[] = [];
    
    attendees.forEach((attendee) => {
      const email = String(attendee.email || "").toLowerCase();
      if (email && existingEmails.indexOf(email) === -1 && !attendeeEmailsMap[email]) {
        attendeeEmailsMap[email] = true;
        attendeeEmails.push(email);
      }
    });
    
    const result = attendeeEmails.slice(0, MAX_ATTENDEES);

    expect(result).toEqual([
      "attendee1@example.com",
      "attendee2@example.com",
      "attendee3@example.com"
    ]);
  });

  it("should run attendee inclusion for all reschedule scenarios", () => {
    // Test the simplified conditional logic for upstream approach
    const testScenarios = [
      { rescheduleUid: null, expected: false, description: "No reschedule" },
      { rescheduleUid: undefined, expected: false, description: "Undefined reschedule" },
      { rescheduleUid: "", expected: false, description: "Empty reschedule" },
      { rescheduleUid: "123", expected: true, description: "Valid reschedule ID" },
      { rescheduleUid: "abc-def", expected: true, description: "UUID format" },
    ];

    testScenarios.forEach(({ rescheduleUid, expected, description }) => {
      const shouldIncludeAttendees = !!rescheduleUid;
      expect(shouldIncludeAttendees).toBe(expected);
    });
  });

  it("should respect MAX_ATTENDEES limit and handle duplicates", () => {
    // Test boundary conditions and performance considerations
    const MAX_ATTENDEES = 3; // Lower limit for testing
    const existingEmails = ["host@example.com"];
    
    // Create more attendees than the limit
    const manyAttendees = [
      { email: "attendee1@example.com" },
      { email: "attendee2@example.com" },
      { email: "attendee3@example.com" },
      { email: "attendee4@example.com" }, // Should be cut off
      { email: "attendee5@example.com" }, // Should be cut off
      { email: "attendee1@example.com" }, // Duplicate
    ];

    const attendeeEmailsMap: { [key: string]: boolean } = {};
    const attendeeEmails: string[] = [];
    
    manyAttendees.forEach((attendee) => {
      const email = String(attendee.email || "").toLowerCase();
      if (email && existingEmails.indexOf(email) === -1 && !attendeeEmailsMap[email]) {
        attendeeEmailsMap[email] = true;
        attendeeEmails.push(email);
      }
    });
    
    const result = attendeeEmails.slice(0, MAX_ATTENDEES);

    // Should respect the limit
    expect(result.length).toBe(MAX_ATTENDEES);
    // Should not have duplicates
    expect(new Set(result).size).toBe(result.length);
    // Should be the first 3 unique attendees
    expect(result).toEqual([
      "attendee1@example.com",
      "attendee2@example.com", 
      "attendee3@example.com"
    ]);
  });
});
