import { randomString } from "@calcom/lib/random";
import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { BookingDetailsService } from "./BookingDetailsService";

let testUserId: number;
let testEventTypeId: number | null = null;
let createdEventType = false;
const createdBookingIds: number[] = [];
let bookingTimeOffset = 0;

async function cleanup() {
  if (createdBookingIds.length > 0) {
    await prisma.tracking.deleteMany({
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

async function createTestBooking(
  uid: string,
  overrides?: {
    rescheduled?: boolean;
    fromReschedule?: string | null;
  }
) {
  const offset = bookingTimeOffset++;
  const booking = await prisma.booking.create({
    data: {
      uid: `booking-uid-${randomString()}`,
      title: "Details Service Test Booking",
      startTime: new Date(`2025-06-01T${String(10 + offset).padStart(2, "0")}:00:00.000Z`),
      endTime: new Date(`2025-06-01T${String(11 + offset).padStart(2, "0")}:00:00.000Z`),
      userId: testUserId,
      eventTypeId: testEventTypeId,
      status: BookingStatus.ACCEPTED,
      rescheduled: overrides?.rescheduled ?? false,
      fromReschedule: overrides?.fromReschedule ?? null,
    },
  });
  createdBookingIds.push(booking.id);
  return booking;
}

describe("BookingDetailsService (Integration Tests)", () => {
  let service: BookingDetailsService;

  beforeAll(async () => {
    const testUser = await prisma.user.findFirstOrThrow({
      where: { email: "member0-acme@example.com" },
    });
    testUserId = testUser.id;

    let eventType = await prisma.eventType.findFirst({
      where: { userId: testUserId },
    });

    if (!eventType) {
      eventType = await prisma.eventType.create({
        data: {
          title: "Details Svc Test Event",
          slug: `details-svc-test-${randomString()}`,
          length: 30,
          userId: testUserId,
        },
      });
      createdEventType = true;
    }
    testEventTypeId = eventType.id;

    service = new BookingDetailsService(prisma);
  });

  afterAll(async () => {
    await cleanup();
    if (createdEventType && testEventTypeId) {
      await prisma.eventType.delete({ where: { id: testEventTypeId } }).catch(() => {});
    }
  });

  afterEach(async () => {
    await cleanup();
  });

  describe("getBookingDetails", () => {
    it("returns booking details when user is the owner", async () => {
      const booking = await createTestBooking("owner-access");

      await prisma.tracking.create({
        data: {
          bookingId: booking.id,
          utm_source: "test-source",
          utm_medium: "test-medium",
        },
      });

      const result = await service.getBookingDetails({
        userId: testUserId,
        bookingUid: booking.uid,
      });

      expect(result).toHaveProperty("tracking");
      expect(result).toHaveProperty("rescheduledToBooking");
      expect(result).toHaveProperty("previousBooking");
      expect(result.tracking).not.toBeNull();
    });

    it("throws Forbidden error when user does not have access", async () => {
      const booking = await createTestBooking("no-access");

      await expect(
        service.getBookingDetails({
          userId: 999999,
          bookingUid: booking.uid,
        })
      ).rejects.toThrow("You do not have permission to view this booking");
    });

    it("throws BookingNotFound when booking does not exist", async () => {
      await expect(
        service.getBookingDetails({
          userId: testUserId,
          bookingUid: "nonexistent-booking-uid",
        })
      ).rejects.toThrow();
    });

    it("returns null rescheduledToBooking for non-rescheduled booking", async () => {
      const booking = await createTestBooking("no-reschedule");

      const result = await service.getBookingDetails({
        userId: testUserId,
        bookingUid: booking.uid,
      });

      expect(result.rescheduledToBooking).toBeNull();
    });

    it("returns rescheduledToBooking when booking was rescheduled", async () => {
      const oldBooking = await createTestBooking("old-rescheduled", { rescheduled: true });

      const newOffset = bookingTimeOffset++;
      const newBooking = await prisma.booking.create({
        data: {
          uid: `booking-uid-${randomString()}`,
          title: "Rescheduled Booking",
          startTime: new Date(`2025-06-02T${String(10 + newOffset).padStart(2, "0")}:00:00.000Z`),
          endTime: new Date(`2025-06-02T${String(11 + newOffset).padStart(2, "0")}:00:00.000Z`),
          userId: testUserId,
          eventTypeId: testEventTypeId,
          status: BookingStatus.ACCEPTED,
          fromReschedule: oldBooking.uid,
        },
      });
      createdBookingIds.push(newBooking.id);

      const result = await service.getBookingDetails({
        userId: testUserId,
        bookingUid: oldBooking.uid,
      });

      expect(result.rescheduledToBooking).not.toBeNull();
      expect(result.rescheduledToBooking?.uid).toBe(newBooking.uid);
    });

    it("returns previousBooking when booking is from reschedule", async () => {
      const previousBooking = await createTestBooking("previous", { rescheduled: true });

      const curOffset = bookingTimeOffset++;
      const currentBooking = await prisma.booking.create({
        data: {
          uid: `booking-uid-${randomString()}`,
          title: "Current Booking",
          startTime: new Date(`2025-06-02T${String(10 + curOffset).padStart(2, "0")}:00:00.000Z`),
          endTime: new Date(`2025-06-02T${String(11 + curOffset).padStart(2, "0")}:00:00.000Z`),
          userId: testUserId,
          eventTypeId: testEventTypeId,
          status: BookingStatus.ACCEPTED,
          fromReschedule: previousBooking.uid,
        },
      });
      createdBookingIds.push(currentBooking.id);

      const result = await service.getBookingDetails({
        userId: testUserId,
        bookingUid: currentBooking.uid,
      });

      expect(result.previousBooking).not.toBeNull();
    });

    it("returns null tracking when no tracking data exists", async () => {
      const booking = await createTestBooking("no-tracking");

      const result = await service.getBookingDetails({
        userId: testUserId,
        bookingUid: booking.uid,
      });

      expect(result.tracking).toBeNull();
    });
  });
});
