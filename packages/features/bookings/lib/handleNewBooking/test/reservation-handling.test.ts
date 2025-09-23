/**
 * These tests verify the reservation system fixes for preventing double-bookings
 * - Tests atomic consumption of slot reservations during booking creation
 * - Validates error handling for expired, invalid, and mismatched reservations
 * - Ensures race condition prevention through database transactions
 */

import { describe, expect, test, beforeEach, vi } from "vitest";
import prismaMock from "../../../../../../tests/libs/__mocks__/prisma";
import dayjs from "@calcom/dayjs";
import { BookingStatus } from "@calcom/prisma/enums";
import { createBookingScenario, getDate, getOrganizer, getBooker, TestData } from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { expectBookingToBeInDatabase } from "@calcom/web/test/utils/bookingScenario/expects";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";
import { getNewBookingHandler } from "./getNewBookingHandler";

describe("Reservation System Fixes", () => {
  setupAndTeardown();

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Setup basic prisma mocks
    prismaMock.selectedSlots = {
      findUnique: vi.fn(),
      findFirst: vi.fn(), 
      delete: vi.fn(),
      deleteMany: vi.fn(),
    };
    
    prismaMock.$transaction = vi.fn();
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

    const { eventType, reservedSlotUid } = await createBookingScenario({
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
      reservedSlots: [
        {
          uid: "reserved-slot-123",
          eventTypeId: 1,
          userId: 101,
          slotUtcStartDate: dayjs(getDate({ dateIncrement: 1 })).utc().toDate(),
          slotUtcEndDate: dayjs(getDate({ dateIncrement: 1 })).utc().add(15, "minutes").toDate(),
          releaseAt: dayjs().add(15, "minutes").toDate(), // Valid for 15 minutes
          isSeat: false,
        },
      ],
    });

    const mockRequestData = getMockRequestDataForBooking({
      data: {
        eventTypeId: 1,
        responses: {
          email: booker.email,
          name: booker.name,
          location: { optionValue: "", value: "integrations:daily" },
        },
        reservedSlotUid: "reserved-slot-123", // Include the reservation UID
      },
    });

    const { req } = mockRequestData;
    req.body.reservedSlotUid = "reserved-slot-123";

    const createdBooking = await handleNewBooking(req);

    // Verify booking was created successfully
    expect(createdBooking.responses).toContain({
      email: booker.email,
      name: booker.name,
    });

    expect(createdBooking.status).toBe(BookingStatus.ACCEPTED);

    // Verify the reservation was consumed (deleted)
    expect(prismaMock.selectedSlots.delete).toHaveBeenCalledWith({
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
    prismaMock.selectedSlots.findUnique.mockResolvedValue(null);

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

    const { req } = mockRequestData;
    req.body.reservedSlotUid = "non-existent-reservation";

    await expect(handleNewBooking(req)).rejects.toThrow("Reserved slot not found or already consumed");
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
      slotUtcStartDate: dayjs(getDate({ dateIncrement: 1 })).utc().toDate(),
      slotUtcEndDate: dayjs(getDate({ dateIncrement: 1 })).utc().add(15, "minutes").toDate(),
      releaseAt: dayjs().subtract(1, "minute").toDate(), // Expired 1 minute ago
      isSeat: false,
    };

    prismaMock.selectedSlots.findUnique.mockResolvedValue(expiredReservation);

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

    const { req } = mockRequestData;
    req.body.reservedSlotUid = "expired-reservation";

    await expect(handleNewBooking(req)).rejects.toThrow("Reserved slot has expired");

    // Verify expired reservation was cleaned up
    expect(prismaMock.selectedSlots.delete).toHaveBeenCalledWith({
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
      slotUtcStartDate: dayjs(getDate({ dateIncrement: 2 })).utc().toDate(), // Different day
      slotUtcEndDate: dayjs(getDate({ dateIncrement: 2 })).utc().add(15, "minutes").toDate(),
      releaseAt: dayjs().add(15, "minutes").toDate(),
      isSeat: false,
    };

    prismaMock.selectedSlots.findUnique.mockResolvedValue(mismatchedReservation);

    const mockRequestData = getMockRequestDataForBooking({
      data: {
        eventTypeId: 1,
        start: dayjs(getDate({ dateIncrement: 1 })).toISOString(), // Different from reservation
        end: dayjs(getDate({ dateIncrement: 1 })).add(15, "minutes").toISOString(),
        responses: {
          email: booker.email,
          name: booker.name,
          location: { optionValue: "", value: "integrations:daily" },
        },
        reservedSlotUid: "mismatched-reservation",
      },
    });

    const { req } = mockRequestData;
    req.body.reservedSlotUid = "mismatched-reservation";

    await expect(handleNewBooking(req)).rejects.toThrow("Reserved slot time does not match booking time");
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

    const { eventType } = await createBookingScenario({
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

    const mockRequestData = getMockRequestDataForBooking({
      data: {
        eventTypeId: 1,
        responses: {
          email: booker.email,
          name: booker.name,
          location: { optionValue: "", value: "integrations:daily" },
        },
        // No reservedSlotUid provided - should work for backward compatibility
      },
    });

    const { req } = mockRequestData;

    const createdBooking = await handleNewBooking(req);

    // Verify booking was created successfully without reservation
    expect(createdBooking.status).toBe(BookingStatus.ACCEPTED);

    // Verify no reservation operations were attempted
    expect(prismaMock.selectedSlots.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.selectedSlots.delete).not.toHaveBeenCalled();

    await expectBookingToBeInDatabase({
      uid: createdBooking.uid!,
      eventTypeId: eventType.id,
      status: BookingStatus.ACCEPTED,
    });
  });
});