/**
 * Unit tests for ErrorsBookingsService_2024_08_13.
 *
 * Ensures booking error mapping from platform errors to HTTP exceptions
 * (NotFound, BadRequest) is correct for createBooking flows.
 */
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ErrorsBookingsService_2024_08_13 } from "./errors.service";

describe("ErrorsBookingsService_2024_08_13", () => {
  let service: ErrorsBookingsService_2024_08_13;

  beforeEach(() => {
    service = new ErrorsBookingsService_2024_08_13();
    jest.spyOn(service["logger"], "error").mockImplementation(() => undefined);
  });

  describe("handleEventTypeToBeBookedNotFound", () => {
    it("throws NotFoundException for eventTypeId only", () => {
      expect(() =>
        service.handleEventTypeToBeBookedNotFound({
          eventTypeId: 1,
          start: "2025-06-01T14:00:00Z",
          end: "2025-06-01T14:30:00Z",
          timeZone: "UTC",
          language: "en",
          metadata: {},
          attendee: { email: "a@test.com", name: "A", timeZone: "UTC" },
          responses: {},
        } as any)
      ).toThrow(NotFoundException);
      expect(() =>
        service.handleEventTypeToBeBookedNotFound({
          eventTypeId: 1,
        } as any)
      ).toThrow(new NotFoundException("Event type with id 1 not found."));
    });

    it("throws NotFoundException with username and eventTypeSlug when no org", () => {
      expect(() =>
        service.handleEventTypeToBeBookedNotFound({
          username: "jane",
          eventTypeSlug: "30min",
          start: "",
          end: "",
          timeZone: "UTC",
          language: "en",
          metadata: {},
          attendee: { email: "", name: "", timeZone: "" },
          responses: {},
        } as any)
      ).toThrow(
        new NotFoundException(
          "Event type with slug 30min belonging to user jane not found."
        )
      );
    });

    it("throws NotFoundException with team and org slug", () => {
      expect(() =>
        service.handleEventTypeToBeBookedNotFound({
          teamSlug: "acme",
          eventTypeSlug: "30min",
          organizationSlug: "org1",
        } as any)
      ).toThrow(
        new NotFoundException(
          "Event type with slug 30min belonging to team acme within organization org1 not found."
        )
      );
    });
  });

  describe("handleBookingError", () => {
    it("maps no_available_users_found_error to BadRequest (team event)", () => {
      expect(() =>
        service.handleBookingError(new Error("no_available_users_found_error"), true)
      ).toThrow(BadRequestException);
      try {
        service.handleBookingError(new Error("no_available_users_found_error"), true);
      } catch (e: any) {
        expect(e.message).toContain("hosts");
      }
    });

    it("maps no_available_users_found_error to BadRequest (non-team)", () => {
      expect(() =>
        service.handleBookingError(new Error("no_available_users_found_error"), false)
      ).toThrow(BadRequestException);
      try {
        service.handleBookingError(new Error("no_available_users_found_error"), false);
      } catch (e: any) {
        expect(e.message).toContain("already has booking");
      }
    });

    it("maps booking_time_out_of_bounds_error to BadRequest", () => {
      expect(() =>
        service.handleBookingError(new Error("booking_time_out_of_bounds_error"), false)
      ).toThrow(BadRequestException);
      try {
        service.handleBookingError(new Error("booking_time_out_of_bounds_error"), false);
      } catch (e: any) {
        expect(e.message).toContain("can't be booked");
      }
    });

    it("maps booker_limit_exceeded_error to BadRequest", () => {
      expect(() =>
        service.handleBookingError(new Error("booker_limit_exceeded_error"), false)
      ).toThrow(BadRequestException);
      try {
        service.handleBookingError(new Error("booker_limit_exceeded_error"), false);
      } catch (e: any) {
        expect(e.message).toContain("maximum number of active bookings");
      }
    });

    it("rethrows unknown errors", () => {
      const err = new Error("custom");
      expect(() => service.handleBookingError(err, false)).toThrow(err);
    });
  });
});
