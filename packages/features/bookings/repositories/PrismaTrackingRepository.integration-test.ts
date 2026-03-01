import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaTrackingRepository } from "./PrismaTrackingRepository";

const testRunId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

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

async function createTestBookingWithTracking(
  uid: string,
  trackingData: {
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_term?: string | null;
    utm_content?: string | null;
  }
) {
  const offset = bookingTimeOffset++;
  const booking = await prisma.booking.create({
    data: {
      uid: `tracking-repo-test-${testRunId}-${uid}`,
      title: "Tracking Test Booking",
      startTime: new Date(`2025-06-01T${String(10 + offset).padStart(2, "0")}:00:00.000Z`),
      endTime: new Date(`2025-06-01T${String(11 + offset).padStart(2, "0")}:00:00.000Z`),
      userId: testUserId,
      eventTypeId: testEventTypeId,
      status: BookingStatus.ACCEPTED,
    },
  });
  createdBookingIds.push(booking.id);

  await prisma.tracking.create({
    data: {
      bookingId: booking.id,
      ...trackingData,
    },
  });

  return booking;
}

describe("PrismaTrackingRepository (Integration Tests)", () => {
  let repo: PrismaTrackingRepository;

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
          title: "Tracking Repo Test Event",
          slug: `tracking-repo-test-${testRunId}`,
          length: 30,
          userId: testUserId,
        },
      });
      createdEventType = true;
    }
    testEventTypeId = eventType.id;

    repo = new PrismaTrackingRepository(prisma);
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

  describe("findByBookingUid", () => {
    it("returns tracking record when found", async () => {
      const booking = await createTestBookingWithTracking("find-1", {
        utm_source: "google",
        utm_medium: "cpc",
        utm_campaign: "summer-sale",
        utm_term: null,
        utm_content: null,
      });

      const result = await repo.findByBookingUid(booking.uid);

      expect(result).not.toBeNull();
      expect(result?.bookingId).toBe(booking.id);
      expect(result?.utm_source).toBe("google");
      expect(result?.utm_medium).toBe("cpc");
      expect(result?.utm_campaign).toBe("summer-sale");
      expect(result?.utm_term).toBeNull();
      expect(result?.utm_content).toBeNull();
    });

    it("returns null when no tracking record exists", async () => {
      const result = await repo.findByBookingUid("nonexistent-booking-uid");

      expect(result).toBeNull();
    });

    it("returns tracking with all UTM fields populated", async () => {
      const booking = await createTestBookingWithTracking("find-all-utm", {
        utm_source: "newsletter",
        utm_medium: "email",
        utm_campaign: "spring",
        utm_term: "booking",
        utm_content: "cta-button",
      });

      const result = await repo.findByBookingUid(booking.uid);

      expect(result).not.toBeNull();
      expect(result?.utm_source).toBe("newsletter");
      expect(result?.utm_medium).toBe("email");
      expect(result?.utm_campaign).toBe("spring");
      expect(result?.utm_term).toBe("booking");
      expect(result?.utm_content).toBe("cta-button");
    });

    it("returns null for booking without tracking data", async () => {
      const booking = await prisma.booking.create({
        data: {
          uid: `tracking-repo-test-${testRunId}-no-tracking`,
          title: "No Tracking Booking",
          startTime: new Date("2025-06-01T10:00:00.000Z"),
          endTime: new Date("2025-06-01T11:00:00.000Z"),
          userId: testUserId,
          eventTypeId: testEventTypeId,
          status: BookingStatus.ACCEPTED,
        },
      });
      createdBookingIds.push(booking.id);

      const result = await repo.findByBookingUid(booking.uid);

      expect(result).toBeNull();
    });
  });
});
