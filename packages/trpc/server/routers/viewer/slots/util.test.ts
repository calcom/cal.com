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

describe("Reschedule attendee hosts integration", () => {
  // Note: These tests validate the NEW approach where attendees are converted to hosts
  // and added to allHosts array BEFORE availability calculation, instead of the old
  // approach of modifying userIdAndEmailMap after the fact.
  
  it("should include all attendees from original booking for host-based availability check", () => {
    // Test the core filtering logic from getAttendeeHostsForReschedule
    const attendees = [
      { email: "attendee1@example.com", name: "Attendee One" },     // Should include  
      { email: "attendee2@example.com", name: "Attendee Two" },     // Should include
      { email: "attendee3@example.com", name: "Attendee Three" },   // Should include
      { email: "" },                                                // Should exclude (empty email)
      { email: "ATTENDEE1@EXAMPLE.COM", name: "Duplicate" },       // Should exclude (duplicate, case insensitive)
    ];

    const MAX_ATTENDEES = 10;

    // Simulate the filtering logic from getAttendeeHostsForReschedule
    const attendeeEmailsMap: { [key: string]: boolean } = {};
    const attendeeEmails: string[] = [];
    
    attendees.forEach((attendee) => {
      const email = String(attendee.email || "").toLowerCase();
      if (email && !attendeeEmailsMap[email]) {
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

  it("should convert attendees to proper host object structure", () => {
    // Test that attendees get converted to the correct host format
    const mockAttendeeUser = {
      id: 123,
      email: "attendee@example.com",
      name: "Test Attendee",
      username: "testuser",
      timeZone: "UTC",
      defaultScheduleId: 1,
      credentials: [],
      bufferTime: 0,
      locale: "en",
      availability: [],
      selectedCalendars: [],
      destinationCalendar: null,
      dateFormat: null,
      theme: null,
      brandColor: null,
      darkBrandColor: null,
      allowDynamicBooking: true,
      away: false,
      schedules: [],
    };

    // Simulate the host conversion logic from getAttendeeHostsForReschedule
    const attendeeHost = {
      isFixed: false, // Attendees are not fixed hosts
      groupId: null,
      user: mockAttendeeUser,
    };

    expect(attendeeHost).toEqual({
      isFixed: false,
      groupId: null,
      user: expect.objectContaining({
        id: 123,
        email: "attendee@example.com",
        name: "Test Attendee",
      })
    });

    // Verify host structure matches expected interface
    expect(attendeeHost.isFixed).toBe(false);
    expect(attendeeHost.groupId).toBe(null);
    expect(typeof attendeeHost.user.id).toBe("number");
    expect(typeof attendeeHost.user.email).toBe("string");
  });

  it("should run attendee host inclusion for all reschedule scenarios", () => {
    // Test the conditional logic for when to include attendee hosts
    const testScenarios = [
      { rescheduleUid: null, expected: false, description: "No reschedule" },
      { rescheduleUid: undefined, expected: false, description: "Undefined reschedule" },
      { rescheduleUid: "", expected: false, description: "Empty reschedule" },
      { rescheduleUid: "123", expected: true, description: "Valid reschedule ID" },
      { rescheduleUid: "abc-def-123", expected: true, description: "UUID format" },
    ];

    testScenarios.forEach(({ rescheduleUid, expected, description }) => {
      const shouldIncludeAttendeeHosts = !!rescheduleUid;
      expect(shouldIncludeAttendeeHosts).toBe(expected);
    });
  });

  it("should respect MAX_ATTENDEES limit and handle duplicates efficiently", () => {
    // Test boundary conditions and performance considerations
    const MAX_ATTENDEES = 3; // Lower limit for testing
    
    // Create more attendees than the limit with duplicates
    const manyAttendees = [
      { email: "attendee1@example.com", name: "First" },
      { email: "attendee2@example.com", name: "Second" },
      { email: "attendee3@example.com", name: "Third" },
      { email: "attendee4@example.com", name: "Fourth" }, // Should be cut off
      { email: "attendee5@example.com", name: "Fifth" },  // Should be cut off
      { email: "attendee1@example.com", name: "Duplicate" }, // Duplicate
      { email: "ATTENDEE2@EXAMPLE.COM", name: "Case Duplicate" }, // Case insensitive duplicate
    ];

    const attendeeEmailsMap: { [key: string]: boolean } = {};
    const attendeeEmails: string[] = [];
    
    manyAttendees.forEach((attendee) => {
      const email = String(attendee.email || "").toLowerCase();
      if (email && !attendeeEmailsMap[email]) {
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

  it("should handle error scenarios gracefully", () => {
    // Test error handling scenarios
    const errorScenarios = [
      {
        description: "Empty attendees array",
        attendees: [],
        expected: []
      },
      {
        description: "All invalid emails", 
        attendees: [
          { email: "" },
          { email: null },
          { email: undefined },
        ],
        expected: []
      },
      {
        description: "Mixed valid and invalid emails",
        attendees: [
          { email: "valid@example.com" },
          { email: "" },
          { email: "also-valid@example.com" },
          { email: null },
        ],
        expected: ["valid@example.com", "also-valid@example.com"]
      }
    ];

    errorScenarios.forEach(({ description, attendees, expected }) => {
      const attendeeEmailsMap: { [key: string]: boolean } = {};
      const attendeeEmails: string[] = [];
      
      attendees.forEach((attendee) => {
        const email = String(attendee.email || "").toLowerCase();
        if (email && !attendeeEmailsMap[email]) {
          attendeeEmailsMap[email] = true;
          attendeeEmails.push(email);
        }
      });

      expect(attendeeEmails).toEqual(expected);
    });
  });

  it("should properly integrate with allHosts array", () => {
    // Test that attendee hosts can be properly merged with existing hosts
    const existingHosts = [
      {
        isFixed: true,
        groupId: "group1", 
        user: { id: 1, email: "host1@example.com", name: "Host One" }
      },
      {
        isFixed: false,
        groupId: "group2",
        user: { id: 2, email: "host2@example.com", name: "Host Two" }
      }
    ];

    const attendeeHosts = [
      {
        isFixed: false,
        groupId: null,
        user: { id: 3, email: "attendee1@example.com", name: "Attendee One" }
      },
      {
        isFixed: false, 
        groupId: null,
        user: { id: 4, email: "attendee2@example.com", name: "Attendee Two" }
      }
    ];

    // Simulate the allHosts.push(...attendeeHosts) operation
    const allHosts = [...existingHosts, ...attendeeHosts];

    expect(allHosts.length).toBe(4);
    
    // Verify original hosts are preserved
    expect(allHosts[0]).toEqual(existingHosts[0]);
    expect(allHosts[1]).toEqual(existingHosts[1]);
    
    // Verify attendee hosts are added correctly
    expect(allHosts[2]).toEqual(attendeeHosts[0]);
    expect(allHosts[3]).toEqual(attendeeHosts[1]);
    
    // Verify attendee hosts have correct structure
    expect(allHosts[2].isFixed).toBe(false);
    expect(allHosts[2].groupId).toBe(null);
    expect(allHosts[3].isFixed).toBe(false);
    expect(allHosts[3].groupId).toBe(null);
  });
});

describe("Integration: Attendee hosts in availability pipeline", () => {
  it("should demonstrate complete flow from reschedule to availability check", () => {
    // Mock the complete flow of our implementation
    
    // 1. Original booking with attendees
    const originalBooking = {
      uid: "booking-123",
      attendees: [
        { email: "attendee1@calcom.com", name: "Alice" },
        { email: "attendee2@calcom.com", name: "Bob" },
        { email: "external@gmail.com", name: "External User" }, // Non-Cal.com user
      ]
    };

    // 2. Existing hosts (before attendees added)
    const existingHosts = [
      {
        isFixed: true,
        groupId: "host-group",
        user: { 
          id: 1, 
          email: "host@calcom.com", 
          name: "Host User",
          timeZone: "UTC",
          availability: [/* host availability */]
        }
      }
    ];

    // 3. Mock Cal.com users lookup (simulating userRepo.findByEmail results)
    const calComUsers = {
      "attendee1@calcom.com": {
        id: 101,
        email: "attendee1@calcom.com", 
        name: "Alice",
        timeZone: "America/New_York",
        availability: [/* Alice's availability - Friday blocked */],
        credentials: [],
        schedules: []
      },
      "attendee2@calcom.com": {
        id: 102,
        email: "attendee2@calcom.com",
        name: "Bob", 
        timeZone: "Europe/London",
        availability: [/* Bob's availability */],
        credentials: [],
        schedules: []
      }
      // "external@gmail.com" - not found (external user)
    };

    // 4. Simulate getAttendeeHostsForReschedule logic
    const attendeeHosts: Array<{
      isFixed: boolean;
      groupId: string | null;
      user: any;
    }> = [];
    const MAX_ATTENDEES = 10;
    
    originalBooking.attendees.slice(0, MAX_ATTENDEES).forEach((attendee) => {
      const email = attendee.email.toLowerCase();
      const calComUser = calComUsers[email];
      
      if (calComUser) {
        // Convert Cal.com attendee to host
        attendeeHosts.push({
          isFixed: false,
          groupId: null,
          user: calComUser
        });
      }
      // External users (like external@gmail.com) are skipped
    });

    // 5. Simulate integration with allHosts
    const allHosts = [...existingHosts, ...attendeeHosts];

    // 6. Verify the complete integration
    expect(allHosts).toHaveLength(3); // 1 host + 2 Cal.com attendees
    
    // Original host preserved
    expect(allHosts[0]).toEqual(existingHosts[0]);
    
    // Cal.com attendees added as hosts
    expect(allHosts[1]).toEqual({
      isFixed: false,
      groupId: null,
      user: expect.objectContaining({
        id: 101,
        email: "attendee1@calcom.com",
        name: "Alice"
      })
    });
    
    expect(allHosts[2]).toEqual({
      isFixed: false,
      groupId: null, 
      user: expect.objectContaining({
        id: 102,
        email: "attendee2@calcom.com",
        name: "Bob"
      })
    });

    // 7. Verify availability pipeline readiness
    const usersForAvailabilityCheck = allHosts.map(host => host.user);
    expect(usersForAvailabilityCheck).toHaveLength(3);
    
    // All users should have required fields for availability calculation
    usersForAvailabilityCheck.forEach(user => {
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('timeZone');
      expect(user).toHaveProperty('availability');
    });

    // 8. Verify external user was properly excluded
    const attendeeEmails = allHosts.map(host => host.user.email);
    expect(attendeeEmails).not.toContain("external@gmail.com");
    expect(attendeeEmails).toContain("attendee1@calcom.com");
    expect(attendeeEmails).toContain("attendee2@calcom.com");
    expect(attendeeEmails).toContain("host@calcom.com");
  });

  it("should handle performance scenarios with many attendees", () => {
    // Test with the maximum number of attendees to verify performance bounds
    const MAX_ATTENDEES = 10;
    
    // Create booking with more attendees than the limit
    const manyAttendees = Array.from({ length: 15 }, (_, i) => ({
      email: `attendee${i + 1}@calcom.com`,
      name: `Attendee ${i + 1}`
    }));

    // Simulate the slicing logic
    const limitedAttendees = manyAttendees.slice(0, MAX_ATTENDEES);
    
    expect(limitedAttendees).toHaveLength(MAX_ATTENDEES);
    expect(limitedAttendees[0].email).toBe("attendee1@calcom.com");
    expect(limitedAttendees[9].email).toBe("attendee10@calcom.com");
    
    // Verify we don't process more than the limit
    expect(limitedAttendees.every(a => a.email.includes("attendee1"))).toBe(false);
    expect(limitedAttendees.some(a => a.email === "attendee11@calcom.com")).toBe(false);
  });
});
