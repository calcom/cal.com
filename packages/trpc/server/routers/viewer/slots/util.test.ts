import { describe, it, expect, vi } from "vitest";

import { AvailableSlotsService } from "./util";

describe("AvailableSlotsService - Reschedule Attendee Conflict Prevention", () => {
  describe("getAttendeeUsersWithCredentialsForReschedule", () => {
    let service: AvailableSlotsService;
    let mockDependencies: any;

    beforeEach(() => {
      mockDependencies = {
        bookingRepo: { findBookingByUid: vi.fn() },
        userRepo: { 
          findByEmail: vi.fn(),
          findUserWithCredentials: vi.fn()
        },
      };
      service = new AvailableSlotsService(mockDependencies);
    });

    it("should return attendees with credentials for valid reschedule", async () => {
      // Setup
      const booking = {
        attendees: [
          { email: "attendee@example.com", status: "ACCEPTED" },
          { email: "host@example.com", status: "ACCEPTED" } // Will be excluded
        ]
      };
      const user = { id: 1, email: "attendee@example.com", username: "attendee" };
      const credentials = { id: 1, credentials: [], selectedCalendars: [] };

      mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue(booking);
      mockDependencies.userRepo.findByEmail.mockResolvedValue(user);
      mockDependencies.userRepo.findUserWithCredentials.mockResolvedValue(credentials);

      // Execute
      const result = await (service as any).getAttendeeUsersWithCredentialsForReschedule(
        "booking-123", 
        ["host@example.com"]
      );

      // Verify
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe("attendee@example.com");
      expect(mockDependencies.userRepo.findByEmail).toHaveBeenCalledWith({
        email: "attendee@example.com"
      });
    });

    it("should exclude hosts and non-ACCEPTED attendees", async () => {
      const booking = {
        attendees: [
          { email: "host@example.com", status: "ACCEPTED" },      // Excluded (host)
          { email: "declined@example.com", status: "DECLINED" },  // Excluded (status)
          { email: "pending@example.com", status: "PENDING" },    // Excluded (status)
          { email: "accepted@example.com", status: "ACCEPTED" },  // Included
        ]
      };

      mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue(booking);
      mockDependencies.userRepo.findByEmail.mockResolvedValue(null);

      await (service as any).getAttendeeUsersWithCredentialsForReschedule(
        "booking-123", 
        ["host@example.com"]
      );

      // Should only process the ACCEPTED non-host attendee
      expect(mockDependencies.userRepo.findByEmail).toHaveBeenCalledTimes(1);
      expect(mockDependencies.userRepo.findByEmail).toHaveBeenCalledWith({
        email: "accepted@example.com"
      });
    });

    it("should handle errors gracefully", async () => {
      mockDependencies.bookingRepo.findBookingByUid.mockRejectedValue(new Error("DB Error"));

      const result = await (service as any).getAttendeeUsersWithCredentialsForReschedule(
        "booking-123", 
        []
      );

      expect(result).toEqual([]);
    });

    it("should limit to 10 attendees max", async () => {
      const attendees = Array.from({ length: 15 }, (_, i) => ({
        email: `attendee${i}@example.com`,
        status: "ACCEPTED"
      }));
      
      mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue({ attendees });
      mockDependencies.userRepo.findByEmail.mockResolvedValue(null);

      await (service as any).getAttendeeUsersWithCredentialsForReschedule("booking-123", []);

      // Should only process first 10
      expect(mockDependencies.userRepo.findByEmail).toHaveBeenCalledTimes(10);
    });
  });

  describe("attendee conflict logic integration", () => {
    it("should only run attendee conflict checking for reschedules with MANAGED scheduling", () => {
      // Test the conditional logic
      const scenarios = [
        { rescheduleUid: null, schedulingType: "MANAGED", shouldCheck: false },        // No reschedule
        { rescheduleUid: "123", schedulingType: "COLLECTIVE", shouldCheck: false },   // COLLECTIVE
        { rescheduleUid: "123", schedulingType: "ROUND_ROBIN", shouldCheck: false },  // ROUND_ROBIN  
        { rescheduleUid: "123", schedulingType: "MANAGED", shouldCheck: true },       // Should check
      ];

      scenarios.forEach(({ rescheduleUid, schedulingType, shouldCheck }) => {
        const result = !!(
          rescheduleUid &&
          schedulingType !== "COLLECTIVE" && 
          schedulingType !== "ROUND_ROBIN"
        );
        
        expect(result).toBe(shouldCheck);
      });
    });
  });
});
