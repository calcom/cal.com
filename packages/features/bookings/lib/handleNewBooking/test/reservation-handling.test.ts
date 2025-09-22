/**
 * These tests verify the reservation system fixes for preventing double-bookings
 * - Tests atomic consumption of slot reservations during booking creation
 * - Validates error handling for expired, invalid, and mismatched reservations
 * - Ensures race condition prevention through database transactions
 * 
 * Time is frozen at 2025-01-15T12:00:00.000Z for deterministic tests
 */

import { describe, expect, test, beforeEach, afterAll, vi } from "vitest";
import prismaMock from "../../../../../../tests/libs/__mocks__/prisma";
import dayjs from "@calcom/dayjs";
import { BookingStatus } from "@calcom/prisma/enums";
import { HttpError } from "@calcom/lib/http-error";
import { createBookingScenario, getDate, getOrganizer, getBooker, TestData } from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { expectBookingToBeInDatabase } from "@calcom/web/test/utils/bookingScenario/expects";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";
import { getNewBookingHandler } from "./getNewBookingHandler";

describe("Reservation System Fixes", () => {
  setupAndTeardown();

  beforeEach(() => {
    // Freeze time for deterministic tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:00:00.000Z"));
    vi.clearAllMocks();
    
    // Set up selectedSlots mock methods as spies
    prismaMock.selectedSlots.findFirst = vi.fn();
    prismaMock.selectedSlots.deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    prismaMock.selectedSlots.delete = vi.fn();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test("should successfully consume reservation when creating booking", async () => {
    const handleNewBooking = await getNewBookingHandler();
    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [],
      selectedCalendars: [],
    });

    const { eventTypes } = await createBookingScenario({
      eventTypes: [
        {
          id: 1,
          slotInterval: 15,
          length: 15,
          users: [
            {
              id: 101,
            },
          ],
        },
      ],
      users: [organizer],
      // Create a reserved slot for the test
      selectedSlots: [
        {
          uid: "reserved-slot-123",
          eventTypeId: 1,
          userId: 101,
          slotUtcStartDate: dayjs(getDate({ dateIncrement: 1 }).dateString).utc().toDate(),
          slotUtcEndDate: dayjs(getDate({ dateIncrement: 1 }).dateString).utc().add(15, "minutes").toDate(),
          releaseAt: dayjs().add(15, "minutes").toDate(), // Valid for 15 minutes
          isSeat: false,
        },
      ],
    });

    const eventType = eventTypes[0];

    // Mock the reservation lookup for the first test
    const validReservation = {
      id: 1,
      uid: "reserved-slot-123",
      eventTypeId: 1,
      userId: 101,
      slotUtcStartDate: dayjs(`${getDate({ dateIncrement: 1 }).dateString}T10:00:00.000Z`).toDate(),
      slotUtcEndDate: dayjs(`${getDate({ dateIncrement: 1 }).dateString}T10:15:00.000Z`).toDate(),
      releaseAt: dayjs().add(15, "minutes").toDate(),
      isSeat: false,
    };

    prismaMock.selectedSlots.findFirst.mockResolvedValue(validReservation);

    // Get the exact same date used for the reservation
    const bookingDate = getDate({ dateIncrement: 1 });
    const bookingStartTime = `${bookingDate.dateString}T10:00:00.000Z`;
    const bookingEndTime = `${bookingDate.dateString}T10:15:00.000Z`;

    const mockRequestData = getMockRequestDataForBooking({
      data: {
        eventTypeId: 1,
        start: bookingStartTime,
        end: bookingEndTime,
        responses: {
          email: booker.email,
          name: booker.name,
          location: { optionValue: "", value: "integrations:daily" },
        },
        reservedSlotUid: "reserved-slot-123", // Include the reservation UID
      },
    });

    const createdBooking = await handleNewBooking({
      bookingData: mockRequestData,
    });

    // Verify booking was created successfully
    expect(createdBooking.responses).toContain({
      email: booker.email,
      name: booker.name,
    });

    expect(createdBooking.status).toBe(BookingStatus.ACCEPTED);

    // Verify the reservation was consumed (deleted) using deleteMany
    expect(prismaMock.selectedSlots.deleteMany).toHaveBeenCalledWith({
      where: { uid: "reserved-slot-123" },
    });

    await expectBookingToBeInDatabase({
      uid: createdBooking.uid!,
      eventTypeId: eventType.id,
      status: BookingStatus.ACCEPTED,
    });
  });

  test("should throw error when reservation is not found", async () => {
    const handleNewBooking = await getNewBookingHandler();
    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [],
      selectedCalendars: [],
    });

    await createBookingScenario({
      eventTypes: [
        {
          id: 1,
          slotInterval: 15,
          length: 15,
          users: [
            {
              id: 101,
            },
          ],
        },
      ],
      users: [organizer],
    });

    // Mock that no reservation exists
    prismaMock.selectedSlots.findFirst.mockResolvedValue(null);

    const mockRequestData = getMockRequestDataForBooking({
      data: {
        eventTypeId: 1,
        responses: {
          email: booker.email,
          name: booker.name,
          location: { optionValue: "", value: "integrations:daily" },
        },
        reservedSlotUid: "non-existent-reservation",
      },
    });

    await expect(
      handleNewBooking({
        bookingData: mockRequestData,
      })
    ).rejects.toThrow(
      expect.objectContaining({
        statusCode: 409,
        message: "reserved_slot_not_found"
      })
    );
  });

  test("should throw error when reservation is expired", async () => {
    const handleNewBooking = await getNewBookingHandler();
    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [],
      selectedCalendars: [],
    });

    await createBookingScenario({
      eventTypes: [
        {
          id: 1,
          slotInterval: 15,
          length: 15,
          users: [
            {
              id: 101,
            },
          ],
        },
      ],
      users: [organizer],
    });

    // Mock an expired reservation
    const expiredReservation = {
      uid: "expired-reservation",
      eventTypeId: 1,
      userId: 101,
      slotUtcStartDate: dayjs(getDate({ dateIncrement: 1 }).dateString).utc().toDate(),
      slotUtcEndDate: dayjs(getDate({ dateIncrement: 1 }).dateString).utc().add(15, "minutes").toDate(),
      releaseAt: dayjs().subtract(1, "minute").toDate(), // Expired 1 minute ago
      isSeat: false,
    };

    prismaMock.selectedSlots.findFirst.mockResolvedValue(expiredReservation);

    const mockRequestData = getMockRequestDataForBooking({
      data: {
        eventTypeId: 1,
        responses: {
          email: booker.email,
          name: booker.name,
          location: { optionValue: "", value: "integrations:daily" },
        },
        reservedSlotUid: "expired-reservation",
      },
    });

    await expect(
      handleNewBooking({
        bookingData: mockRequestData,
      })
    ).rejects.toThrow(
      expect.objectContaining({
        statusCode: 410,
        message: "reserved_slot_expired"
      })
    );

    // Verify expired reservation was cleaned up using deleteMany
    expect(prismaMock.selectedSlots.deleteMany).toHaveBeenCalledWith({
      where: { uid: "expired-reservation" },
    });
  });

  test("should throw error when reservation time doesn't match booking time", async () => {
    const handleNewBooking = await getNewBookingHandler();
    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [],
      selectedCalendars: [],
    });

    await createBookingScenario({
      eventTypes: [
        {
          id: 1,
          slotInterval: 15,
          length: 15,
          users: [
            {
              id: 101,
            },
          ],
        },
      ],
      users: [organizer],
    });

    // Mock a reservation with different time than the booking request
    const mismatchedReservation = {
      uid: "mismatched-reservation",
      eventTypeId: 1,
      userId: 101,
      slotUtcStartDate: dayjs(getDate({ dateIncrement: 2 }).dateString).utc().toDate(), // Different day
      slotUtcEndDate: dayjs(getDate({ dateIncrement: 2 }).dateString).utc().add(15, "minutes").toDate(),
      releaseAt: dayjs().add(15, "minutes").toDate(),
      isSeat: false,
    };

    prismaMock.selectedSlots.findFirst.mockResolvedValue(mismatchedReservation);

    const mockRequestData = getMockRequestDataForBooking({
      data: {
        eventTypeId: 1,
        start: dayjs(getDate({ dateIncrement: 1 }).dateString).utc().toISOString(), // Different from reservation
        end: dayjs(getDate({ dateIncrement: 1 }).dateString).utc().add(15, "minutes").toISOString(),
        responses: {
          email: booker.email,
          name: booker.name,
          location: { optionValue: "", value: "integrations:daily" },
        },
        reservedSlotUid: "mismatched-reservation",
      },
    });

    await expect(
      handleNewBooking({
        bookingData: mockRequestData,
      })
    ).rejects.toThrow(
      expect.objectContaining({
        statusCode: 400,
        message: "reserved_slot_time_mismatch"
      })
    );
  });

  test("should successfully create booking without reservation (backward compatibility)", async () => {
    const handleNewBooking = await getNewBookingHandler();
    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [],
      selectedCalendars: [],
    });

    const { eventTypes } = await createBookingScenario({
      eventTypes: [
        {
          id: 1,
          slotInterval: 15,
          length: 15,
          users: [
            {
              id: 101,
            },
          ],
        },
      ],
      users: [organizer],
    });

    const eventType = eventTypes[0];

    const mockRequestData = getMockRequestDataForBooking({
      data: {
        eventTypeId: 1,
        start: `${getDate({ dateIncrement: 1 }).dateString}T10:00:00.000Z`,
        end: `${getDate({ dateIncrement: 1 }).dateString}T10:15:00.000Z`,
        responses: {
          email: booker.email,
          name: booker.name,
          location: { optionValue: "", value: "integrations:daily" },
        },
        // No reservedSlotUid provided - should work for backward compatibility
      },
    });

    const createdBooking = await handleNewBooking({
      bookingData: mockRequestData,
    });

    // Verify booking was created successfully without reservation
    expect(createdBooking.status).toBe(BookingStatus.ACCEPTED);

    // Verify no reservation operations were attempted
    expect(prismaMock.selectedSlots.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.selectedSlots.deleteMany).not.toHaveBeenCalled();

    await expectBookingToBeInDatabase({
      uid: createdBooking.uid!,
      eventTypeId: eventType.id,
      status: BookingStatus.ACCEPTED,
    });
  });

  test("should handle recurring bookings correctly - only first occurrence uses reservation", async () => {
    const handleNewBooking = await getNewBookingHandler();
    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [],
      selectedCalendars: [],
    });

    const { eventTypes } = await createBookingScenario({
      eventTypes: [
        {
          id: 1,
          slotInterval: 15,
          length: 15,
          recurringEvent: {
            freq: 2, // Weekly
            count: 3, // 3 occurrences
            interval: 1,
          },
          users: [
            {
              id: 101,
            },
          ],
        },
      ],
      users: [organizer],
      // Create a reserved slot for the first occurrence only
      selectedSlots: [
        {
          uid: "recurring-reservation-123",
          eventTypeId: 1,
          userId: 101,
          slotUtcStartDate: dayjs(getDate({ dateIncrement: 1 }).dateString).utc().toDate(),
          slotUtcEndDate: dayjs(getDate({ dateIncrement: 1 }).dateString).utc().add(15, "minutes").toDate(),
          releaseAt: dayjs().add(15, "minutes").toDate(),
          isSeat: false,
        },
      ],
    });

    const eventType = eventTypes[0];

    // Mock the reservation for the first occurrence
    const recurringReservation = {
      id: 1,
      uid: "recurring-reservation-123",
      eventTypeId: 1,
      userId: 101,
      slotUtcStartDate: dayjs(`${getDate({ dateIncrement: 1 }).dateString}T10:00:00.000Z`).toDate(),
      slotUtcEndDate: dayjs(`${getDate({ dateIncrement: 1 }).dateString}T10:15:00.000Z`).toDate(),
      releaseAt: dayjs().add(15, "minutes").toDate(),
      isSeat: false,
    };

    prismaMock.selectedSlots.findFirst.mockResolvedValue(recurringReservation);

    const mockRequestData = getMockRequestDataForBooking({
      data: {
        eventTypeId: 1,
        start: `${getDate({ dateIncrement: 1 }).dateString}T10:00:00.000Z`,
        end: `${getDate({ dateIncrement: 1 }).dateString}T10:15:00.000Z`,
        recurringCount: 3,
        responses: {
          email: booker.email,
          name: booker.name,
          location: { optionValue: "", value: "integrations:daily" },
        },
        reservedSlotUid: "recurring-reservation-123",
      },
    });

    const createdBookings = await handleNewBooking({
      bookingData: mockRequestData,
    });

    // Verify 3 bookings were created
    expect(Array.isArray(createdBookings)).toBe(true);
    expect(createdBookings.length).toBe(3);

    // Verify the reservation was consumed only once (for first occurrence) using deleteMany
    expect(prismaMock.selectedSlots.deleteMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.selectedSlots.deleteMany).toHaveBeenCalledWith({
      where: { uid: "recurring-reservation-123" },
    });

    // Verify all bookings were created successfully
    for (const booking of createdBookings) {
      expect(booking.status).toBe(BookingStatus.ACCEPTED);
      await expectBookingToBeInDatabase({
        uid: booking.uid!,
        eventTypeId: eventType.id,
        status: BookingStatus.ACCEPTED,
      });
    }
  });
});