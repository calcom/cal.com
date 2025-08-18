import { vi, describe, it, beforeEach, expect } from "vitest";

import type { HandleNewBookingService } from "@calcom/features/bookings/lib/handleNewBooking";
import handleInstantMeeting from "@calcom/features/instant-meeting/handleInstantMeeting";

import { BookingCreateService } from "./BookingCreateService";
import type {
  CreateBookingData,
  CreateInstantBookingData,
  CreateSeatedBookingInput,
} from "./BookingCreateTypes";

vi.mock("@calcom/features/instant-meeting/handleInstantMeeting", () => ({
  default: vi.fn(),
}));

describe("BookingCreateService", () => {
  let service: BookingCreateService;
  let mockHandleNewBookingService: HandleNewBookingService;

  beforeEach(() => {
    // Create a mock HandleNewBookingService with a handle method
    mockHandleNewBookingService = {
      handle: vi.fn(),
    } as unknown as HandleNewBookingService;

    // Create the service with the mocked dependency
    service = new BookingCreateService({
      handleNewBookingService: mockHandleNewBookingService,
    });

    vi.resetAllMocks();
  });

  describe("createBooking", () => {
    it("should call handleNewBookingService.handle with correct parameters", async () => {
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

      vi.mocked(mockHandleNewBookingService.handle).mockResolvedValue(mockResult);

      const result = await service.createBooking({
        bookingData: mockBookingData,
      });

      expect(mockHandleNewBookingService.handle).toHaveBeenCalledWith(
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

      vi.mocked(mockHandleNewBookingService.handle).mockResolvedValue(mockResult);

      const mockSchemaGetter = vi.fn();
      const result = await service.createBooking({
        bookingData: mockBookingData,
        schemaGetter: mockSchemaGetter,
      });

      expect(mockHandleNewBookingService.handle).toHaveBeenCalledWith(
        { bookingData: mockBookingData },
        mockSchemaGetter
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("createRecurringBooking", () => {});

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

      const result = await service.createInstantBooking({
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

      vi.mocked(mockHandleNewBookingService.handle).mockResolvedValue(mockResult);

      const result = await service.createSeatedBooking({ bookingData: mockBookingData });

      expect(mockHandleNewBookingService.handle).toHaveBeenCalledWith({ bookingData: mockBookingData });
      expect(result).toEqual(mockResult);
    });
  });
});
