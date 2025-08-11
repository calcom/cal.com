import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { OutputEventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/output-event-types.service";
import { ApiKeysRepository } from "@/modules/api-keys/api-keys.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { CreateRecurringBookingInput_2024_08_13 } from "@calcom/platform-types";

import { BookingSeatRepository } from "../booking-seat.repository";
import { BookingsRepository_2024_08_13 } from "../bookings.repository";
import { PlatformBookingsService } from "../services/platform-bookings.service";
import { InputBookingsService_2024_08_13 } from "./input.service";

describe("InputBookingsService_2024_08_13", () => {
  let service: InputBookingsService_2024_08_13;

  const mockEventTypesRepository = {
    findByIdWithSeats: jest.fn(),
  };

  const mockBookingsRepository = {
    findByUidOrRecurringEventId: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockApiKeysRepository = {};
  const mockBookingSeatRepository = {};
  const mockOutputEventTypesService = {};
  const mockPlatformBookingsService = {};
  const mockUsersRepository = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InputBookingsService_2024_08_13,
        { provide: EventTypesRepository_2024_06_14, useValue: mockEventTypesRepository },
        { provide: BookingsRepository_2024_08_13, useValue: mockBookingsRepository },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ApiKeysRepository, useValue: mockApiKeysRepository },
        { provide: BookingSeatRepository, useValue: mockBookingSeatRepository },
        { provide: OutputEventTypesService_2024_06_14, useValue: mockOutputEventTypesService },
        { provide: PlatformBookingsService, useValue: mockPlatformBookingsService },
        { provide: UsersRepository, useValue: mockUsersRepository },
      ],
    }).compile();

    service = module.get<InputBookingsService_2024_08_13>(InputBookingsService_2024_08_13);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("transformInputCreateRecurringBooking", () => {
    const mockEventType = {
      id: 1,
      length: 15,
      metadata: { multipleDuration: [15, 30, 60] },
      recurringEvent: { freq: 2, count: 3, interval: 1 }, // Weekly, 3 times, every 1 week
    };

    it("should use default length when no lengthInMinutes provided", async () => {
      const input: CreateRecurringBookingInput_2024_08_13 = {
        start: "2030-01-01T10:00:00Z",
        eventTypeId: 1,
        recurrenceCount: 2,
        attendee: {
          name: "Test User",
          email: "test@example.com",
          timeZone: "UTC",
        },
      };

      const result = await service.transformInputCreateRecurringBooking(input, mockEventType as any);

      expect(result).toHaveLength(2);
      expect(result[0].end).toBe("2030-01-01T10:15:00.000Z"); // 15 minutes after start (default length)
      expect(result[1].end).toBe("2030-01-08T10:15:00.000Z"); // One week later, 15 minutes duration
    });

    it("should use custom lengthInMinutes when provided (30 minutes)", async () => {
      const input: CreateRecurringBookingInput_2024_08_13 = {
        start: "2030-01-01T10:00:00Z",
        eventTypeId: 1,
        lengthInMinutes: 30,
        recurrenceCount: 2,
        attendee: {
          name: "Test User",
          email: "test@example.com",
          timeZone: "UTC",
        },
      };

      const result = await service.transformInputCreateRecurringBooking(input, mockEventType as any);

      expect(result).toHaveLength(2);
      expect(result[0].end).toBe("2030-01-01T10:30:00.000Z"); // 30 minutes after start (custom length)
      expect(result[1].end).toBe("2030-01-08T10:30:00.000Z"); // One week later, 30 minutes duration
    });

    it("should use custom lengthInMinutes when provided (60 minutes)", async () => {
      const input: CreateRecurringBookingInput_2024_08_13 = {
        start: "2030-01-01T14:00:00Z",
        eventTypeId: 1,
        lengthInMinutes: 60,
        recurrenceCount: 3,
        attendee: {
          name: "Test User",
          email: "test@example.com",
          timeZone: "UTC",
        },
      };

      const result = await service.transformInputCreateRecurringBooking(input, mockEventType as any);

      expect(result).toHaveLength(3);
      expect(result[0].end).toBe("2030-01-01T15:00:00.000Z"); // 60 minutes after start
      expect(result[1].end).toBe("2030-01-08T15:00:00.000Z"); // One week later, 60 minutes duration
      expect(result[2].end).toBe("2030-01-15T15:00:00.000Z"); // Two weeks later, 60 minutes duration
    });

    it("should throw error for invalid lengthInMinutes", async () => {
      const input: CreateRecurringBookingInput_2024_08_13 = {
        start: "2030-01-01T10:00:00Z",
        eventTypeId: 1,
        lengthInMinutes: 45, // Not in allowed [15, 30, 60]
        recurrenceCount: 2,
        attendee: {
          name: "Test User",
          email: "test@example.com",
          timeZone: "UTC",
        },
      };

      await expect(service.transformInputCreateRecurringBooking(input, mockEventType as any)).rejects.toThrow(
        BadRequestException
      );
    });

    it("should throw error for lengthInMinutes on non-variable-length event type", async () => {
      const nonVariableEventType = {
        id: 1,
        length: 15,
        metadata: {}, // No multipleDuration
        recurringEvent: { freq: 2, count: 3, interval: 1 },
      };

      const input: CreateRecurringBookingInput_2024_08_13 = {
        start: "2030-01-01T10:00:00Z",
        eventTypeId: 1,
        lengthInMinutes: 30,
        recurrenceCount: 2,
        attendee: {
          name: "Test User",
          email: "test@example.com",
          timeZone: "UTC",
        },
      };

      await expect(
        service.transformInputCreateRecurringBooking(input, nonVariableEventType as any)
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw error for non-recurring event type", async () => {
      const nonRecurringEventType = {
        id: 1,
        length: 15,
        metadata: { multipleDuration: [15, 30, 60] },
        recurringEvent: null, // Not a recurring event
      };

      const input: CreateRecurringBookingInput_2024_08_13 = {
        start: "2030-01-01T10:00:00Z",
        eventTypeId: 1,
        recurrenceCount: 2,
        attendee: {
          name: "Test User",
          email: "test@example.com",
          timeZone: "UTC",
        },
      };

      await expect(
        service.transformInputCreateRecurringBooking(input, nonRecurringEventType as any)
      ).rejects.toThrow(NotFoundException);
    });

    it("should generate correct recurring events with proper spacing", async () => {
      const input: CreateRecurringBookingInput_2024_08_13 = {
        start: "2030-01-01T10:00:00Z",
        eventTypeId: 1,
        lengthInMinutes: 30,
        recurrenceCount: 3,
        attendee: {
          name: "Test User",
          email: "test@example.com",
          timeZone: "UTC",
        },
      };

      const result = await service.transformInputCreateRecurringBooking(input, mockEventType as any);

      expect(result).toHaveLength(3);

      // Check all events have same recurringEventId
      const recurringEventId = result[0].recurringEventId;
      expect(result.every((event) => event.recurringEventId === recurringEventId)).toBe(true);

      // Check proper weekly spacing
      expect(result[0].start).toBe("2030-01-01T10:00:00.000Z");
      expect(result[1].start).toBe("2030-01-08T10:00:00.000Z"); // +1 week
      expect(result[2].start).toBe("2030-01-15T10:00:00.000Z"); // +2 weeks

      // Check all have 30-minute duration
      expect(result[0].end).toBe("2030-01-01T10:30:00.000Z");
      expect(result[1].end).toBe("2030-01-08T10:30:00.000Z");
      expect(result[2].end).toBe("2030-01-15T10:30:00.000Z");
    });
  });
});
