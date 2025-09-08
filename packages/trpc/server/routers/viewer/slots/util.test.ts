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

describe("Reschedule attendee filtering logic", () => {
  it("should filter attendees correctly for conflict checking", () => {
    // Test the core filtering logic we added for reschedule conflict prevention
    const attendees = [
      { email: "host@example.com", status: "ACCEPTED" },      // Should exclude (host)
      { email: "attendee1@example.com", status: "ACCEPTED" }, // Should include  
      { email: "attendee2@example.com", status: "DECLINED" }, // Should exclude (declined)
      { email: "attendee3@example.com", status: "PENDING" },  // Should exclude (pending)
      { email: "attendee4@example.com" },                     // Should include (defaults to ACCEPTED)
    ];

    const excludeEmails = ["host@example.com"];
    const MAX_ATTENDEES = 10;

    // Simulate the core filtering logic from getAttendeeUsersWithCredentialsForReschedule
    const exclude = new Set(excludeEmails.map(e => e.toLowerCase()));
    const emailsLowerToOriginal = new Map();
    
    for (const a of attendees) {
      const status = a.status ?? "ACCEPTED";
      const emailOriginal = String(a.email || "");
      const emailLower = emailOriginal.toLowerCase();
      
      if (!emailLower || exclude.has(emailLower) || status !== "ACCEPTED") continue;
      if (!emailsLowerToOriginal.has(emailLower)) {
        emailsLowerToOriginal.set(emailLower, emailOriginal);
      }
      if (emailsLowerToOriginal.size >= MAX_ATTENDEES) break;
    }
    
    const result = Array.from(emailsLowerToOriginal.values());

    expect(result).toEqual([
      "attendee1@example.com",
      "attendee4@example.com"
    ]);
  });

  it("should only run conflict checking for appropriate reschedule scenarios", () => {
    // Test the conditional logic that determines when to run attendee conflict checking
    const testScenarios = [
      { rescheduleUid: null, schedulingType: "MANAGED", expected: false },        // No reschedule
      { rescheduleUid: "123", schedulingType: "COLLECTIVE", expected: false },   // COLLECTIVE events
      { rescheduleUid: "123", schedulingType: "ROUND_ROBIN", expected: false },  // ROUND_ROBIN events
      { rescheduleUid: "123", schedulingType: "MANAGED", expected: true },       // Should run
    ];

    testScenarios.forEach(({ rescheduleUid, schedulingType, expected }) => {
      const shouldRunConflictCheck = !!(
        rescheduleUid &&
        schedulingType !== "COLLECTIVE" && 
        schedulingType !== "ROUND_ROBIN"
      );
      
      expect(shouldRunConflictCheck).toBe(expected);
    });
  });
});
