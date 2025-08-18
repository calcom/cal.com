import { vi, describe, it, beforeEach, expect } from "vitest";

import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import { handleNewRecurringBooking } from "@calcom/features/bookings/lib/handleNewRecurringBooking";
import handleInstantMeeting from "@calcom/features/instant-meeting/handleInstantMeeting";
import { CreateBookingInput_2024_08_13, CreateRecurringBookingInput_2024_08_13, CreateInstantBookingInput_2024_08_13 } from "@calcom/platform-types";

import { BookingCreateService } from "./BookingCreateService";

vi.mock("@calcom/features/bookings/lib/handleNewBooking", () => ({
  default: vi.fn(),
}));

vi.mock("@calcom/features/bookings/lib/handleNewRecurringBooking", () => ({
  handleNewRecurringBooking: vi.fn(),
}));

vi.mock("@calcom/features/instant-meeting/handleInstantMeeting", () => ({
  default: vi.fn(),
}));

describe("BookingCreateService", () => {
  let service: BookingCreateService;

  beforeEach(() => {
    service = new BookingCreateService();
    vi.resetAllMocks();
  });

  describe("createBooking", () => {
    it("should call handleNewBooking with correct parameters", async () => {
      const mockBookingData: CreateBookingInput_2024_08_13 = {
        start: "2024-01-01T10:00:00Z",
        eventTypeId: 123,
        attendee: {
          name: "John Doe",
          email: "john@example.com",
          timeZone: "UTC",
        },
      };
      const mockActor = { id: 1, email: "admin@example.com" };
      const mockResult = { booking: { id: 1, uid: "booking-uid" } };

      vi.mocked(handleNewBooking).mockResolvedValue(mockResult);

      const result = await service.createBooking({
        bookingData: mockBookingData,
        actor: mockActor,
      });

      expect(handleNewBooking).toHaveBeenCalledWith(mockBookingData);
      expect(result).toEqual(mockResult);
    });

    it("should work without actor parameter", async () => {
      const mockBookingData: CreateBookingInput_2024_08_13 = {
        start: "2024-01-01T10:00:00Z",
        eventTypeId: 123,
        attendee: {
          name: "John Doe",
          email: "john@example.com",
          timeZone: "UTC",
        },
      };
      const mockResult = { booking: { id: 1, uid: "booking-uid" } };

      vi.mocked(handleNewBooking).mockResolvedValue(mockResult);

      const result = await service.createBooking({ bookingData: mockBookingData });

      expect(handleNewBooking).toHaveBeenCalledWith(mockBookingData);
      expect(result).toEqual(mockResult);
    });
  });

  describe("createRecurringBooking", () => {
    it("should call handleNewRecurringBooking with correct parameters", async () => {
      const mockBookingData: CreateRecurringBookingInput_2024_08_13 = {
        start: "2024-01-01T10:00:00Z",
        eventTypeId: 123,
        attendee: {
          name: "John Doe",
          email: "john@example.com",
          timeZone: "UTC",
        },
        recurringCount: 5,
      };
      const mockActor = { id: 1, email: "admin@example.com" };
      const mockResult = [
        { booking: { id: 1, uid: "booking-uid-1" } },
        { booking: { id: 2, uid: "booking-uid-2" } },
      ];

      vi.mocked(handleNewRecurringBooking).mockResolvedValue(mockResult);

      const result = await service.createRecurringBooking({
        bookingData: mockBookingData,
        actor: mockActor,
      });

      expect(handleNewRecurringBooking).toHaveBeenCalledWith(mockBookingData);
      expect(result).toEqual(mockResult);
    });
  });

  describe("createInstantBooking", () => {
    it("should call handleInstantMeeting with correct parameters", async () => {
      const mockBookingData: CreateInstantBookingInput_2024_08_13 = {
        eventTypeId: 123,
        attendee: {
          name: "John Doe",
          email: "john@example.com",
          timeZone: "UTC",
        },
      };
      const mockActor = { id: 1, email: "admin@example.com" };
      const mockResult = { booking: { id: 1, uid: "instant-booking-uid" } };

      vi.mocked(handleInstantMeeting).mockResolvedValue(mockResult);

      const result = await service.createInstantBooking({
        bookingData: mockBookingData,
        actor: mockActor,
      });

      expect(handleInstantMeeting).toHaveBeenCalledWith(mockBookingData);
      expect(result).toEqual(mockResult);
    });
  });

  describe("createSeatedBooking", () => {
    it("should call handleNewBooking for seated bookings", async () => {
      const mockBookingData: CreateBookingInput_2024_08_13 = {
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

      vi.mocked(handleNewBooking).mockResolvedValue(mockResult);

      const result = await service.createSeatedBooking({ bookingData: mockBookingData });

      expect(handleNewBooking).toHaveBeenCalledWith(mockBookingData);
      expect(result).toEqual(mockResult);
    });
  });

  describe("create (auto-routing)", () => {
    it("should route to createRecurringBooking when recurringCount is present", async () => {
      const mockBookingData: CreateRecurringBookingInput_2024_08_13 = {
        start: "2024-01-01T10:00:00Z",
        eventTypeId: 123,
        attendee: {
          name: "John Doe",
          email: "john@example.com",
          timeZone: "UTC",
        },
        recurringCount: 5,
      };
      const mockResult = [
        { booking: { id: 1, uid: "booking-uid-1" } },
      ];

      vi.mocked(handleNewRecurringBooking).mockResolvedValue(mockResult);

      const result = await service.create({ bookingData: mockBookingData });

      expect(handleNewRecurringBooking).toHaveBeenCalledWith(mockBookingData);
      expect(handleNewBooking).not.toHaveBeenCalled();
      expect(handleInstantMeeting).not.toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it("should route to createInstantBooking when start time is not present", async () => {
      const mockBookingData: CreateInstantBookingInput_2024_08_13 = {
        eventTypeId: 123,
        attendee: {
          name: "John Doe",
          email: "john@example.com",
          timeZone: "UTC",
        },
      };
      const mockResult = { booking: { id: 1, uid: "instant-booking-uid" } };

      vi.mocked(handleInstantMeeting).mockResolvedValue(mockResult);

      const result = await service.create({ bookingData: mockBookingData });

      expect(handleInstantMeeting).toHaveBeenCalledWith(mockBookingData);
      expect(handleNewBooking).not.toHaveBeenCalled();
      expect(handleNewRecurringBooking).not.toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it("should route to createSeatedBooking when bookingUid is present", async () => {
      const mockBookingData: CreateBookingInput_2024_08_13 = {
        start: "2024-01-01T10:00:00Z",
        eventTypeId: 123,
        attendee: {
          name: "John Doe",
          email: "john@example.com",
          timeZone: "UTC",
        },
        bookingUid: "existing-booking-uid",
      };
      const mockResult = { booking: { id: 1, uid: "booking-uid" } };

      vi.mocked(handleNewBooking).mockResolvedValue(mockResult);

      const result = await service.create({ bookingData: mockBookingData });

      expect(handleNewBooking).toHaveBeenCalledWith(mockBookingData);
      expect(handleNewRecurringBooking).not.toHaveBeenCalled();
      expect(handleInstantMeeting).not.toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it("should route to createBooking for standard bookings", async () => {
      const mockBookingData: CreateBookingInput_2024_08_13 = {
        start: "2024-01-01T10:00:00Z",
        eventTypeId: 123,
        attendee: {
          name: "John Doe",
          email: "john@example.com",
          timeZone: "UTC",
        },
      };
      const mockResult = { booking: { id: 1, uid: "booking-uid" } };

      vi.mocked(handleNewBooking).mockResolvedValue(mockResult);

      const result = await service.create({ bookingData: mockBookingData });

      expect(handleNewBooking).toHaveBeenCalledWith(mockBookingData);
      expect(handleNewRecurringBooking).not.toHaveBeenCalled();
      expect(handleInstantMeeting).not.toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe("audit logging", () => {
    it("should log audit events when actor is provided", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      
      const mockBookingData: CreateBookingInput_2024_08_13 = {
        start: "2024-01-01T10:00:00Z",
        eventTypeId: 123,
        attendee: {
          name: "John Doe",
          email: "john@example.com",
          timeZone: "UTC",
        },
      };
      const mockActor = { id: 1, email: "admin@example.com" };
      const mockResult = { booking: { id: 1, uid: "booking-uid" } };

      vi.mocked(handleNewBooking).mockResolvedValue(mockResult);

      await service.createBooking({
        bookingData: mockBookingData,
        actor: mockActor,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[AUDIT] Booking created by actor:"),
        expect.objectContaining(mockActor)
      );

      consoleSpy.mockRestore();
    });

    it("should not log audit events when actor is not provided", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      
      const mockBookingData: CreateBookingInput_2024_08_13 = {
        start: "2024-01-01T10:00:00Z",
        eventTypeId: 123,
        attendee: {
          name: "John Doe",
          email: "john@example.com",
          timeZone: "UTC",
        },
      };
      const mockResult = { booking: { id: 1, uid: "booking-uid" } };

      vi.mocked(handleNewBooking).mockResolvedValue(mockResult);

      await service.createBooking({ bookingData: mockBookingData });

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("[AUDIT]"),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });
  });
});