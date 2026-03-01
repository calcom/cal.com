import { describe, expect, it } from "vitest";
import { getBookingAccessService } from "./BookingAccessService";

describe("BookingAccessService DI Container Integration Tests", () => {
  describe("getBookingAccessService", () => {
    it("should return the cached service instance", () => {
      const service1 = getBookingAccessService();
      const service2 = getBookingAccessService();

      expect(service1).toBeDefined();
      expect(service2).toBeDefined();
      expect(service1).toBe(service2);
    });

    it("should return false for non-existent booking by uid", async () => {
      const service = getBookingAccessService();
      const hasAccess = await service.doesUserIdHaveAccessToBooking({
        userId: 999999,
        bookingUid: "non-existent-booking-uid-xyz",
      });

      expect(hasAccess).toBe(false);
    });

    it("should return false for non-existent booking by id", async () => {
      const service = getBookingAccessService();
      const hasAccess = await service.doesUserIdHaveAccessToBooking({
        userId: 999999,
        bookingId: 999999999,
      });

      expect(hasAccess).toBe(false);
    });

    it("should return false for non-existent booking in checkBookingAccessWithPBAC", async () => {
      const service = getBookingAccessService();
      const hasAccess = await service.checkBookingAccessWithPBAC({
        userId: 999999,
        bookingUid: "non-existent-booking-uid-xyz",
      });

      expect(hasAccess).toBe(false);
    });
  });
});
