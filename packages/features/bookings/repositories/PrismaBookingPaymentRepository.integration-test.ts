import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaBookingPaymentRepository } from "./PrismaBookingPaymentRepository";

const testRunId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

let testUserId: number;
let testEventTypeId: number | null = null;
let createdEventType = false;
const createdBookingIds: number[] = [];
const createdPaymentIds: number[] = [];
let bookingTimeOffset = 0;

async function cleanup() {
  if (createdPaymentIds.length > 0) {
    await prisma.payment.deleteMany({
      where: { id: { in: createdPaymentIds } },
    });
    createdPaymentIds.length = 0;
  }
  if (createdBookingIds.length > 0) {
    await prisma.payment.deleteMany({
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

async function createTestBooking(uid: string) {
  const offset = bookingTimeOffset++;
  const booking = await prisma.booking.create({
    data: {
      uid: `payment-repo-test-${testRunId}-${uid}`,
      title: "Payment Test Booking",
      startTime: new Date(`2025-06-01T${String(10 + offset).padStart(2, "0")}:00:00.000Z`),
      endTime: new Date(`2025-06-01T${String(11 + offset).padStart(2, "0")}:00:00.000Z`),
      userId: testUserId,
      eventTypeId: testEventTypeId,
      status: BookingStatus.ACCEPTED,
    },
  });
  createdBookingIds.push(booking.id);
  return booking;
}

describe("PrismaBookingPaymentRepository (Integration Tests)", () => {
  let repo: PrismaBookingPaymentRepository;

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
          title: "Payment Repo Test Event",
          slug: `payment-repo-test-${testRunId}`,
          length: 30,
          userId: testUserId,
        },
      });
      createdEventType = true;
    }
    testEventTypeId = eventType.id;

    repo = new PrismaBookingPaymentRepository(prisma);
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

  describe("createPaymentRecord", () => {
    it("creates a payment record and returns it", async () => {
      const booking = await createTestBooking("create-1");

      // Ensure the stripe_payment app exists
      const stripeApp = await prisma.app.findUnique({ where: { slug: "stripe" } });

      const paymentData = {
        uid: `payment-uid-${testRunId}-1`,
        ...(stripeApp ? { app: { connect: { slug: "stripe" } } } : {}),
        booking: { connect: { id: booking.id } },
        amount: 5000,
        fee: 100,
        externalId: `ext-${testRunId}-1`,
        refunded: false,
        success: true,
        currency: "usd",
        data: { paymentIntentId: `pi_${testRunId}` },
      };

      const result = await repo.createPaymentRecord(paymentData);
      createdPaymentIds.push(result.id);

      expect(result).toHaveProperty("id");
      expect(result.uid).toBe(paymentData.uid);
      expect(result.amount).toBe(5000);
      expect(result.fee).toBe(100);
      expect(result.success).toBe(true);
      expect(result.currency).toBe("usd");
      expect(result.externalId).toBe(paymentData.externalId);
    });
  });

  describe("findByExternalIdIncludeBookingUserCredentials", () => {
    it("returns payment with booking and user credentials when found", async () => {
      const booking = await createTestBooking("find-ext-1");

      const payment = await prisma.payment.create({
        data: {
          uid: `payment-uid-${testRunId}-find-1`,
          bookingId: booking.id,
          amount: 1000,
          fee: 50,
          externalId: `ext-find-${testRunId}-1`,
          refunded: false,
          success: true,
          currency: "usd",
          data: {},
        },
      });
      createdPaymentIds.push(payment.id);

      const result = await repo.findByExternalIdIncludeBookingUserCredentials(
        payment.externalId,
        "google_calendar"
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe(payment.id);
      expect(result?.amount).toBe(1000);
      expect(result?.success).toBe(true);
      expect(result?.bookingId).toBe(booking.id);
    });

    it("returns null when no payment matches the external id", async () => {
      const result = await repo.findByExternalIdIncludeBookingUserCredentials(
        "nonexistent-external-id",
        "stripe_payment"
      );

      expect(result).toBeNull();
    });
  });

  describe("findByIdForAwaitingPaymentEmail", () => {
    it("returns payment details needed for awaiting payment email", async () => {
      const booking = await createTestBooking("awaiting-1");

      const payment = await prisma.payment.create({
        data: {
          uid: `payment-uid-${testRunId}-await-1`,
          bookingId: booking.id,
          amount: 2500,
          fee: 75,
          externalId: `ext-await-${testRunId}-1`,
          refunded: false,
          success: false,
          currency: "usd",
          data: {},
        },
      });
      createdPaymentIds.push(payment.id);

      const result = await repo.findByIdForAwaitingPaymentEmail(payment.id);

      expect(result).not.toBeNull();
      expect(result?.success).toBe(false);
      expect(result?.amount).toBe(2500);
      expect(result?.currency).toBe("usd");
      expect(result?.uid).toBe(payment.uid);
    });

    it("returns null when payment not found", async () => {
      const result = await repo.findByIdForAwaitingPaymentEmail(999999);

      expect(result).toBeNull();
    });
  });
});
