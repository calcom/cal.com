import { ErrorCode } from "@calcom/lib/errorCodes";
import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { addSeatToBooking } from "./createNewSeat";

// Track resources to clean up
const createdBookingIds: number[] = [];
let testUserId: number;
let testEventTypeId: number;

async function clearTestData() {
  if (createdBookingIds.length > 0) {
    await prisma.bookingSeat.deleteMany({
      where: { bookingId: { in: createdBookingIds } },
    });
    await prisma.attendee.deleteMany({
      where: { bookingId: { in: createdBookingIds } },
    });
    await prisma.booking.deleteMany({
      where: { id: { in: createdBookingIds } },
    });
    createdBookingIds.length = 0;
  }
}

describe("createNewSeat Race Condition Prevention (Integration)", () => {
  beforeAll(async () => {
    // Use existing seed user
    const testUser = await prisma.user.findFirstOrThrow({
      where: { email: "member0-acme@example.com" },
    });
    testUserId = testUser.id;

    // Find or create a test event type with seats
    let eventType = await prisma.eventType.findFirst({
      where: {
        userId: testUserId,
        seatsPerTimeSlot: { not: null },
      },
    });

    if (!eventType) {
      eventType = await prisma.eventType.create({
        data: {
          title: "Seated Test Event",
          slug: `seated-test-event-${Date.now()}`,
          length: 30,
          userId: testUserId,
          seatsPerTimeSlot: 2,
          seatsShowAttendees: false,
        },
      });
    }
    testEventTypeId = eventType.id;
  });

  afterEach(async () => {
    await clearTestData();
  });

  it("should prevent overbooking when concurrent requests race for the last seat", async () => {
    const bookingUid = `race-test-${Date.now()}`;
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
    const seatsPerTimeSlot = 2;

    // Create a booking first
    const booking = await prisma.booking.create({
      data: {
        uid: bookingUid,
        userId: testUserId,
        eventTypeId: testEventTypeId,
        status: BookingStatus.ACCEPTED,
        startTime,
        endTime,
        title: "Race Condition Test Booking",
      },
    });

    createdBookingIds.push(booking.id);

    // Create 1 existing seat (out of 2)
    const attendee = await prisma.attendee.create({
      data: {
        email: "existing-seat@test.com",
        name: "Existing Seat",
        timeZone: "UTC",
        locale: "en",
        bookingId: booking.id,
      },
    });

    await prisma.bookingSeat.create({
      data: {
        referenceUid: `existing-seat-${Date.now()}`,
        data: {},
        bookingId: booking.id,
        attendeeId: attendee.id,
      },
    });

    // Fire 2 concurrent requests for the last seat using the actual addSeatToBooking function
    const results = await Promise.allSettled([
      addSeatToBooking({
        bookingUid,
        bookingId: booking.id,
        bookingStatus: BookingStatus.ACCEPTED,
        seatsPerTimeSlot,
        attendee: {
          email: "racer1@test.com",
          name: "Racer 1",
          timeZone: "UTC",
          locale: "en",
        },
        seatData: {},
      }),
      addSeatToBooking({
        bookingUid,
        bookingId: booking.id,
        bookingStatus: BookingStatus.ACCEPTED,
        seatsPerTimeSlot,
        attendee: {
          email: "racer2@test.com",
          name: "Racer 2",
          timeZone: "UTC",
          locale: "en",
        },
        seatData: {},
      }),
    ]);

    // Count successes and failures
    const successes = results.filter((r) => r.status === "fulfilled");
    const failures = results.filter(
      (r) => r.status === "rejected" && (r.reason as Error).message === ErrorCode.BookingSeatsFull
    );

    // Exactly 1 should succeed, 1 should fail with BookingSeatsFull
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

    // Verify final seat count is exactly 2 (1 existing + 1 new)
    const finalBooking = await prisma.booking.findUnique({
      where: { uid: bookingUid },
      select: {
        attendees: {
          select: {
            id: true,
            bookingSeat: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    const finalSeatCount = finalBooking?.attendees.filter((a) => !!a.bookingSeat).length;
    expect(finalSeatCount).toBe(2);
  });

  it("should allow both bookings when enough seats are available", async () => {
    const bookingUid = `multi-seat-test-${Date.now()}`;
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
    const seatsPerTimeSlot = 3; // 3 seats available

    // Create a booking with no seats taken yet
    const booking = await prisma.booking.create({
      data: {
        uid: bookingUid,
        userId: testUserId,
        eventTypeId: testEventTypeId,
        status: BookingStatus.ACCEPTED,
        startTime,
        endTime,
        title: "Multi Seat Test Booking",
      },
    });

    createdBookingIds.push(booking.id);

    // Fire 2 concurrent requests when there are 3 seats available
    const results = await Promise.allSettled([
      addSeatToBooking({
        bookingUid,
        bookingId: booking.id,
        bookingStatus: BookingStatus.ACCEPTED,
        seatsPerTimeSlot,
        attendee: {
          email: "booker1@test.com",
          name: "Booker 1",
          timeZone: "UTC",
          locale: "en",
        },
        seatData: {},
      }),
      addSeatToBooking({
        bookingUid,
        bookingId: booking.id,
        bookingStatus: BookingStatus.ACCEPTED,
        seatsPerTimeSlot,
        attendee: {
          email: "booker2@test.com",
          name: "Booker 2",
          timeZone: "UTC",
          locale: "en",
        },
        seatData: {},
      }),
    ]);

    // Both should succeed
    const successes = results.filter((r) => r.status === "fulfilled");
    expect(successes.length).toBe(2);

    // Verify final seat count is 2
    const finalBooking = await prisma.booking.findUnique({
      where: { uid: bookingUid },
      select: {
        attendees: {
          select: {
            id: true,
            bookingSeat: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    const finalSeatCount = finalBooking?.attendees.filter((a) => !!a.bookingSeat).length;
    expect(finalSeatCount).toBe(2);
  });

  it("should reject booking when event is already full", async () => {
    const bookingUid = `full-event-test-${Date.now()}`;
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
    const seatsPerTimeSlot = 2;

    // Create a booking first
    const booking = await prisma.booking.create({
      data: {
        uid: bookingUid,
        userId: testUserId,
        eventTypeId: testEventTypeId,
        status: BookingStatus.ACCEPTED,
        startTime,
        endTime,
        title: "Full Event Test Booking",
      },
    });

    createdBookingIds.push(booking.id);

    // Create 2 seats (filling all available seats)
    const attendee1 = await prisma.attendee.create({
      data: {
        email: "seat1@test.com",
        name: "Seat 1",
        timeZone: "UTC",
        locale: "en",
        bookingId: booking.id,
      },
    });

    await prisma.bookingSeat.create({
      data: {
        referenceUid: `seat1-${Date.now()}`,
        data: {},
        bookingId: booking.id,
        attendeeId: attendee1.id,
      },
    });

    const attendee2 = await prisma.attendee.create({
      data: {
        email: "seat2@test.com",
        name: "Seat 2",
        timeZone: "UTC",
        locale: "en",
        bookingId: booking.id,
      },
    });

    await prisma.bookingSeat.create({
      data: {
        referenceUid: `seat2-${Date.now()}`,
        data: {},
        bookingId: booking.id,
        attendeeId: attendee2.id,
      },
    });

    // Try to add another seat - should fail
    await expect(
      addSeatToBooking({
        bookingUid,
        bookingId: booking.id,
        bookingStatus: BookingStatus.ACCEPTED,
        seatsPerTimeSlot,
        attendee: {
          email: "latecomer@test.com",
          name: "Late Comer",
          timeZone: "UTC",
          locale: "en",
        },
        seatData: {},
      })
    ).rejects.toThrow(ErrorCode.BookingSeatsFull);

    // Verify seat count is still 2
    const finalBooking = await prisma.booking.findUnique({
      where: { uid: bookingUid },
      select: {
        attendees: {
          select: {
            id: true,
            bookingSeat: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    const finalSeatCount = finalBooking?.attendees.filter((a) => !!a.bookingSeat).length;
    expect(finalSeatCount).toBe(2);
  });

  it("should allow booking when seatsPerTimeSlot is 0 (falsy)", async () => {
    // This tests the fix for the bug where null/undefined seatsPerTimeSlot
    // would fallback to 0 and incorrectly reject all bookings because
    // 0 <= currentSeatCount was always true
    const bookingUid = `zero-seats-test-${Date.now()}`;
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
    const seatsPerTimeSlot = 0; // Simulates null/undefined fallback

    // Create a booking
    const booking = await prisma.booking.create({
      data: {
        uid: bookingUid,
        userId: testUserId,
        eventTypeId: testEventTypeId,
        status: BookingStatus.ACCEPTED,
        startTime,
        endTime,
        title: "Zero Seats Test Booking",
      },
    });

    createdBookingIds.push(booking.id);

    // Add a seat with seatsPerTimeSlot = 0 - should succeed
    const result = await addSeatToBooking({
      bookingUid,
      bookingId: booking.id,
      bookingStatus: BookingStatus.ACCEPTED,
      seatsPerTimeSlot,
      attendee: {
        email: "booker@test.com",
        name: "Booker",
        timeZone: "UTC",
        locale: "en",
      },
      seatData: {},
    });

    expect(result).toBeDefined();
    expect(result?.referenceUid).toBeDefined();

    // Verify the seat was created
    const finalBooking = await prisma.booking.findUnique({
      where: { uid: bookingUid },
      select: {
        attendees: {
          select: {
            id: true,
            bookingSeat: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    const finalSeatCount = finalBooking?.attendees.filter((a) => !!a.bookingSeat).length;
    expect(finalSeatCount).toBe(1);
  });

  it("should allow multiple bookings when seatsPerTimeSlot is 0 (no limit)", async () => {
    const bookingUid = `zero-seats-multi-test-${Date.now()}`;
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
    const seatsPerTimeSlot = 0; // No limit enforced

    // Create a booking
    const booking = await prisma.booking.create({
      data: {
        uid: bookingUid,
        userId: testUserId,
        eventTypeId: testEventTypeId,
        status: BookingStatus.ACCEPTED,
        startTime,
        endTime,
        title: "Zero Seats Multi Test Booking",
      },
    });

    createdBookingIds.push(booking.id);

    // Create existing seats
    const attendee1 = await prisma.attendee.create({
      data: {
        email: "existing1@test.com",
        name: "Existing 1",
        timeZone: "UTC",
        locale: "en",
        bookingId: booking.id,
      },
    });

    await prisma.bookingSeat.create({
      data: {
        referenceUid: `existing1-${Date.now()}`,
        data: {},
        bookingId: booking.id,
        attendeeId: attendee1.id,
      },
    });

    const attendee2 = await prisma.attendee.create({
      data: {
        email: "existing2@test.com",
        name: "Existing 2",
        timeZone: "UTC",
        locale: "en",
        bookingId: booking.id,
      },
    });

    await prisma.bookingSeat.create({
      data: {
        referenceUid: `existing2-${Date.now()}`,
        data: {},
        bookingId: booking.id,
        attendeeId: attendee2.id,
      },
    });

    // Add another seat with seatsPerTimeSlot = 0 - should succeed even with existing seats
    const result = await addSeatToBooking({
      bookingUid,
      bookingId: booking.id,
      bookingStatus: BookingStatus.ACCEPTED,
      seatsPerTimeSlot,
      attendee: {
        email: "new-booker@test.com",
        name: "New Booker",
        timeZone: "UTC",
        locale: "en",
      },
      seatData: {},
    });

    expect(result).toBeDefined();
    expect(result?.referenceUid).toBeDefined();

    // Verify total seat count is 3 (2 existing + 1 new)
    const finalBooking = await prisma.booking.findUnique({
      where: { uid: bookingUid },
      select: {
        attendees: {
          select: {
            id: true,
            bookingSeat: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    const finalSeatCount = finalBooking?.attendees.filter((a) => !!a.bookingSeat).length;
    expect(finalSeatCount).toBe(3);
  });
});
