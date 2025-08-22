import { vi, describe, it, beforeEach, expect } from "vitest";

import type {
  CreateBookingData,
  CreateInstantBookingData,
  CreateSeatedBookingInput,
} from "@calcom/features/bookings/lib/service/BookingCreateService/types";
import type { BookingCreateService } from "@calcom/features/bookings/lib/service/BookingCreateService/utils/handleNewBooking";
import handleInstantMeeting from "@calcom/features/instant-meeting/handleInstantMeeting";

import { BookingCreateFactory } from "./BookingCreateFactory";

vi.mock("@calcom/features/instant-meeting/handleInstantMeeting", () => ({
  default: vi.fn(),
}));

describe("BookingCreateFactory", () => {
  let factory: BookingCreateFactory;
  let mockBookingCreateService: BookingCreateService;

  beforeEach(() => {
    // Create a mock BookingCreateService with a handle method
    mockBookingCreateService = {
      handle: vi.fn(),
    } as unknown as BookingCreateService;

    // Create the factory with the mocked dependency
    factory = new BookingCreateFactory({
      bookingCreateService: mockBookingCreateService,
    });

    vi.resetAllMocks();
  });

  describe("createBooking", () => {
    it("should call bookingCreateService.handle with correct parameters", async () => {
      const mockBookingData: CreateBookingData = {
        start: "2024-01-01T10:00:00Z",
        eventTypeId: 123,
        attendee: {
          name: "John Doe",
          email: "john@example.com",
          timeZone: "UTC",
        },
      };
      const mockResult = { booking: { id: 1, uid: "booking-uid" } };

      vi.mocked(mockBookingCreateService.handle).mockResolvedValue(mockResult);

      const result = await factory.createBooking({
        bookingData: mockBookingData,
      });

      expect(mockBookingCreateService.handle).toHaveBeenCalledWith(
        { bookingData: mockBookingData },
        undefined
      );
      expect(result).toEqual(mockResult);
    });

    it("should pass schemaGetter when provided", async () => {
      const mockBookingData: CreateBookingData = {
        start: "2024-01-01T10:00:00Z",
        eventTypeId: 123,
        attendee: {
          name: "John Doe",
          email: "john@example.com",
          timeZone: "UTC",
        },
      };
      const mockResult = { booking: { id: 1, uid: "booking-uid" } };

      vi.mocked(mockBookingCreateService.handle).mockResolvedValue(mockResult);

      const mockSchemaGetter = vi.fn();
      const result = await factory.createBooking({
        bookingData: mockBookingData,
        schemaGetter: mockSchemaGetter,
      });

      expect(mockBookingCreateService.handle).toHaveBeenCalledWith(
        { bookingData: mockBookingData },
        mockSchemaGetter
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("createInstantBooking", () => {
    it("should call handleInstantMeeting with correct parameters", async () => {
      const mockBookingData: CreateInstantBookingData = {
        eventTypeId: 123,
        attendee: {
          name: "John Doe",
          email: "john@example.com",
          timeZone: "UTC",
        },
        instant: true,
      };
      const mockResult = { booking: { id: 1, uid: "instant-booking-uid" } };

      vi.mocked(handleInstantMeeting).mockResolvedValue(mockResult);

      const result = await factory.createInstantBooking({
        bookingData: mockBookingData,
      });

      expect(handleInstantMeeting).toHaveBeenCalledWith(mockBookingData);
      expect(result).toEqual(mockResult);
    });
  });

  describe("createSeatedBooking", () => {
    it("should call handleNewBookingService.handle for seated bookings", async () => {
      const mockBookingData: CreateSeatedBookingInput = {
        start: "2024-01-01T10:00:00Z",
        eventTypeId: 123,
        attendee: {
          name: "John Doe",
          email: "john@example.com",
          timeZone: "UTC",
        },
        bookingUid: "existing-booking-uid", // Indicates seated booking
      };
      const mockResult = { booking: { id: 1, uid: "booking-uid" } };

      vi.mocked(mockBookingCreateService.handle).mockResolvedValue(mockResult);

      const result = await factory.createSeatedBooking({ bookingData: mockBookingData });

      expect(mockBookingCreateService.handle).toHaveBeenCalledWith({ bookingData: mockBookingData });
      expect(result).toEqual(mockResult);
    });
  });
});
