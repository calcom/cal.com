import { vi, describe, it, beforeEach, expect } from "vitest";

import type {
  CreateInstantBookingData,
  CreateRecurringBookingData,
} from "@calcom/features/bookings/lib/dto/types";
import type { BookingCreateService } from "@calcom/features/bookings/lib/service/BookingCreateService";
import type { InstantBookingCreateService } from "@calcom/features/bookings/lib/service/InstantBookingCreateService";
import type { RecurringBookingCreateService } from "@calcom/features/bookings/lib/service/RecurringBookingCreateService";

import { BookingCreateFactory } from "./BookingCreateFactory";

vi.mock("@calcom/features/instant-meeting/handleInstantMeeting", () => ({
  default: vi.fn(),
}));

describe("BookingCreateFactory", () => {
  let factory: BookingCreateFactory;
  let mockBookingCreateService: BookingCreateService;
  let mockRecurringBookingCreateService: RecurringBookingCreateService;
  let mockInstantBookingCreateService: InstantBookingCreateService;

  beforeEach(() => {
    // Create a mock BookingCreateService with a create method
    mockBookingCreateService = {
      create: vi.fn(),
    } as unknown as BookingCreateService;

    mockRecurringBookingCreateService = {
      create: vi.fn(),
    } as unknown as RecurringBookingCreateService;

    mockInstantBookingCreateService = {
      create: vi.fn(),
    } as unknown as InstantBookingCreateService;
    // Create the factory with the mocked dependency
    factory = new BookingCreateFactory({
      bookingCreateService: mockBookingCreateService,
      recurringBookingCreateService: mockRecurringBookingCreateService,
      instantBookingCreateService: mockInstantBookingCreateService,
    });

    vi.resetAllMocks();
  });

  describe("createInstantBooking", () => {
    it("should call handleInstantMeeting with correct parameters", async () => {
      const mockBookingData: CreateInstantBookingData = {
        start: "2024-01-01T10:00:00Z",
        eventTypeId: 123,
        timeZone: "UTC",
        language: "en",
        metadata: {},
        instant: true,
      };

      await factory.createInstantBooking({
        bookingData: mockBookingData,
      });

      expect(mockInstantBookingCreateService.create).toHaveBeenCalledWith(mockBookingData);
    });
  });

  describe("createRecurringBooking", () => {
    it("should call handleNewRecurringBooking with correct parameters", async () => {
      const mockBookingData: CreateRecurringBookingData = [
        {
          eventTypeId: 123,
          start: "2024-01-01T10:00:00Z",
          end: "2024-01-01T11:00:00Z",
          timeZone: "UTC",
          language: "en",
          metadata: {},
        },
      ];

      await factory.createRecurringBooking({
        bookingData: mockBookingData,
      });

      expect(mockRecurringBookingCreateService.create).toHaveBeenCalledWith({ bookingData: mockBookingData });
    });
  });
});
