import { describe, expect, it } from "vitest";

import {
  buildPlatformCancelLink,
  buildPlatformRescheduleLink,
  buildStandardCancelLink,
  buildStandardRescheduleLink,
  buildCancelLink,
  buildRescheduleLink,
} from "./LinkBuilder";

describe("LinkBuilder", () => {
  describe("buildPlatformCancelLink", () => {
    it("builds a cancel link with required params", () => {
      const result = buildPlatformCancelLink({
        platformCancelUrl: "https://platform.example.com/cancel",
        uid: "booking-123",
      });

      const url = new URL(result);
      expect(url.pathname).toBe("/cancel/booking-123");
      expect(url.searchParams.get("cancel")).toBe("true");
      expect(url.searchParams.get("allRemainingBookings")).toBe("false");
    });

    it("includes slug and username when provided", () => {
      const result = buildPlatformCancelLink({
        platformCancelUrl: "https://platform.example.com/cancel",
        uid: "booking-123",
        slug: "30min",
        username: "john",
      });

      const url = new URL(result);
      expect(url.searchParams.get("slug")).toBe("30min");
      expect(url.searchParams.get("username")).toBe("john");
    });

    it("sets allRemainingBookings to true for recurring events", () => {
      const result = buildPlatformCancelLink({
        platformCancelUrl: "https://platform.example.com/cancel",
        uid: "booking-123",
        isRecurring: true,
      });

      const url = new URL(result);
      expect(url.searchParams.get("allRemainingBookings")).toBe("true");
    });

    it("includes seatReferenceUid when provided", () => {
      const result = buildPlatformCancelLink({
        platformCancelUrl: "https://platform.example.com/cancel",
        uid: "booking-123",
        seatReferenceUid: "seat-456",
      });

      const url = new URL(result);
      expect(url.searchParams.get("seatReferenceUid")).toBe("seat-456");
    });

    it("includes teamId when provided", () => {
      const result = buildPlatformCancelLink({
        platformCancelUrl: "https://platform.example.com/cancel",
        uid: "booking-123",
        teamId: 42,
      });

      const url = new URL(result);
      expect(url.searchParams.get("teamId")).toBe("42");
    });
  });

  describe("buildPlatformRescheduleLink", () => {
    it("builds a reschedule link with required params", () => {
      const result = buildPlatformRescheduleLink({
        platformRescheduleUrl: "https://platform.example.com/reschedule",
        uid: "booking-123",
      });

      const url = new URL(result);
      expect(url.pathname).toBe("/reschedule/booking-123");
      expect(url.searchParams.get("reschedule")).toBe("true");
    });

    it("uses seatReferenceUid as uid when provided", () => {
      const result = buildPlatformRescheduleLink({
        platformRescheduleUrl: "https://platform.example.com/reschedule",
        uid: "booking-123",
        seatReferenceUid: "seat-456",
      });

      const url = new URL(result);
      expect(url.pathname).toBe("/reschedule/seat-456");
    });

    it("includes slug, username, and teamId", () => {
      const result = buildPlatformRescheduleLink({
        platformRescheduleUrl: "https://platform.example.com/reschedule",
        uid: "booking-123",
        slug: "30min",
        username: "john",
        teamId: 42,
      });

      const url = new URL(result);
      expect(url.searchParams.get("slug")).toBe("30min");
      expect(url.searchParams.get("username")).toBe("john");
      expect(url.searchParams.get("teamId")).toBe("42");
    });
  });

  describe("buildStandardCancelLink", () => {
    it("builds a cancel link with booking path", () => {
      const result = buildStandardCancelLink({
        bookerUrl: "https://cal.example.com",
        uid: "booking-123",
      });

      const url = new URL(result);
      expect(url.pathname).toBe("/booking/booking-123");
      expect(url.searchParams.get("cancel")).toBe("true");
      expect(url.searchParams.get("allRemainingBookings")).toBe("false");
    });

    it("includes cancelledBy when provided", () => {
      const result = buildStandardCancelLink({
        bookerUrl: "https://cal.example.com",
        uid: "booking-123",
        cancelledBy: "attendee@example.com",
      });

      const url = new URL(result);
      expect(url.searchParams.get("cancelledBy")).toBe("attendee@example.com");
    });

    it("includes seatReferenceUid when provided", () => {
      const result = buildStandardCancelLink({
        bookerUrl: "https://cal.example.com",
        uid: "booking-123",
        seatReferenceUid: "seat-456",
      });

      const url = new URL(result);
      expect(url.searchParams.get("seatReferenceUid")).toBe("seat-456");
    });

    it("sets allRemainingBookings to true for recurring events", () => {
      const result = buildStandardCancelLink({
        bookerUrl: "https://cal.example.com",
        uid: "booking-123",
        isRecurring: true,
      });

      const url = new URL(result);
      expect(url.searchParams.get("allRemainingBookings")).toBe("true");
    });
  });

  describe("buildStandardRescheduleLink", () => {
    it("builds a reschedule link with booking path", () => {
      const result = buildStandardRescheduleLink({
        bookerUrl: "https://cal.example.com",
        uid: "booking-123",
      });

      const url = new URL(result);
      expect(url.pathname).toBe("/reschedule/booking-123");
    });

    it("uses seatReferenceUid as uid when provided", () => {
      const result = buildStandardRescheduleLink({
        bookerUrl: "https://cal.example.com",
        uid: "booking-123",
        seatReferenceUid: "seat-456",
      });

      const url = new URL(result);
      expect(url.pathname).toBe("/reschedule/seat-456");
    });

    it("includes allowRescheduleForCancelledBooking param", () => {
      const result = buildStandardRescheduleLink({
        bookerUrl: "https://cal.example.com",
        uid: "booking-123",
        allowRescheduleForCancelledBooking: true,
      });

      const url = new URL(result);
      expect(url.searchParams.get("allowRescheduleForCancelledBooking")).toBe("true");
    });

    it("includes rescheduledBy when provided", () => {
      const result = buildStandardRescheduleLink({
        bookerUrl: "https://cal.example.com",
        uid: "booking-123",
        rescheduledBy: "attendee@example.com",
      });

      const url = new URL(result);
      expect(url.searchParams.get("rescheduledBy")).toBe("attendee@example.com");
    });

    it("includes seatReferenceUid as query param when provided", () => {
      const result = buildStandardRescheduleLink({
        bookerUrl: "https://cal.example.com",
        uid: "booking-123",
        seatReferenceUid: "seat-456",
      });

      const url = new URL(result);
      expect(url.searchParams.get("seatReferenceUid")).toBe("seat-456");
    });
  });

  describe("buildCancelLink", () => {
    it("returns platform cancel link when platformClientId and platformCancelUrl are set", () => {
      const result = buildCancelLink({
        platformClientId: "client-1",
        platformCancelUrl: "https://platform.example.com/cancel",
        uid: "booking-123",
        bookerUrl: "https://cal.example.com",
      });

      expect(result).toContain("platform.example.com");
      expect(result).not.toContain("cal.example.com");
    });

    it("returns standard cancel link when platformClientId is not set", () => {
      const result = buildCancelLink({
        uid: "booking-123",
        bookerUrl: "https://cal.example.com",
      });

      expect(result).toContain("cal.example.com");
      expect(result).toContain("/booking/booking-123");
    });

    it("returns standard cancel link when platformCancelUrl is not set", () => {
      const result = buildCancelLink({
        platformClientId: "client-1",
        uid: "booking-123",
        bookerUrl: "https://cal.example.com",
      });

      expect(result).toContain("cal.example.com");
    });
  });

  describe("buildRescheduleLink", () => {
    it("returns platform reschedule link when platformClientId and platformRescheduleUrl are set", () => {
      const result = buildRescheduleLink({
        platformClientId: "client-1",
        platformRescheduleUrl: "https://platform.example.com/reschedule",
        uid: "booking-123",
        bookerUrl: "https://cal.example.com",
      });

      expect(result).toContain("platform.example.com");
      expect(result).not.toContain("cal.example.com");
    });

    it("returns standard reschedule link when platformClientId is not set", () => {
      const result = buildRescheduleLink({
        uid: "booking-123",
        bookerUrl: "https://cal.example.com",
      });

      expect(result).toContain("cal.example.com");
      expect(result).toContain("/reschedule/booking-123");
    });

    it("returns standard reschedule link when platformRescheduleUrl is not set", () => {
      const result = buildRescheduleLink({
        platformClientId: "client-1",
        uid: "booking-123",
        bookerUrl: "https://cal.example.com",
      });

      expect(result).toContain("cal.example.com");
    });
  });
});
