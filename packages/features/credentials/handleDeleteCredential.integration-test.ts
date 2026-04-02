import handleDeleteCredential from "@calcom/features/credentials/handleDeleteCredential";
import prisma from "@calcom/prisma";
import type { Credential, EventType, User } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

describe("handleDeleteCredential Integration Tests - BookingReference Soft Delete", () => {
  let testUser: User;
  let testCredential: Credential;
  let testEventType: EventType;
  const createdBookingReferenceIds: number[] = [];
  const createdBookingIds: number[] = [];

  async function deleteCredentialWithMetadata(credentialId: number, userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true },
    });

    return handleDeleteCredential({
      userId,
      userMetadata: user?.metadata ?? {},
      credentialId,
    });
  }

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        email: "delete-credential-test@example.com",
        username: "delete-credential-test",
      },
    });

    testCredential = await prisma.credential.create({
      data: {
        type: "stripe_payment",
        key: { test_key: "test_value" },
        userId: testUser.id,
        appId: "stripe",
      },
    });

    testEventType = await prisma.eventType.create({
      data: {
        title: "Paid Event",
        slug: "paid-event-test",
        length: 30,
        userId: testUser.id,
        price: 1000, // $10
        currency: "usd",
      },
    });
  });

  afterEach(async () => {
    if (createdBookingReferenceIds.length > 0) {
      await prisma.bookingReference.deleteMany({
        where: {
          id: {
            in: createdBookingReferenceIds,
          },
        },
      });
      createdBookingReferenceIds.splice(0, createdBookingReferenceIds.length);
    }

    if (createdBookingIds.length > 0) {
      await prisma.attendee.deleteMany({
        where: {
          bookingId: {
            in: createdBookingIds,
          },
        },
      });

      await prisma.booking.deleteMany({
        where: {
          id: {
            in: createdBookingIds,
          },
        },
      });
      createdBookingIds.splice(0, createdBookingIds.length);
    }
  });

  afterAll(async () => {
    await prisma.eventType.delete({
      where: {
        id: testEventType.id,
      },
    });

    try {
      await prisma.credential.delete({
        where: {
          id: testCredential.id,
        },
      });
    } catch (error) {
      // Credential already deleted by test
      console.log("Credential deletion error:", error);
    }

    await prisma.user.delete({
      where: {
        id: testUser.id,
      },
    });
  });

  describe("Soft-delete bookingReferences when deleting payment credential", () => {
    it("should soft-delete booking references for unpaid bookings when credential is deleted", async () => {
      const unpaidBooking = await prisma.booking.create({
        data: {
          uid: "unpaid-booking-uid-123",
          title: "Unpaid Booking",
          startTime: new Date(Date.now() + 86400000), // Tomorrow
          endTime: new Date(Date.now() + 90000000),
          userId: testUser.id,
          eventTypeId: testEventType.id,
          status: BookingStatus.PENDING,
          paid: false,
          attendees: {
            create: [
              {
                email: "attendee@test.com",
                name: "Test Attendee",
                timeZone: "America/New_York",
              },
            ],
          },
          payment: {
            create: {
              uid: "payment-uid-123",
              appId: "stripe",
              amount: 1000,
              fee: 0,
              currency: "usd",
              success: false,
              refunded: false,
              data: {},
              externalId: "ext-payment-123",
            },
          },
        },
      });
      createdBookingIds.push(unpaidBooking.id);

      const bookingRef1 = await prisma.bookingReference.create({
        data: {
          type: "stripe_payment",
          uid: "stripe-ref-123",
          meetingId: "stripe-meeting-123",
          credentialId: testCredential.id,
          bookingId: unpaidBooking.id,
        },
      });
      createdBookingReferenceIds.push(bookingRef1.id);

      const bookingRef2 = await prisma.bookingReference.create({
        data: {
          type: "google_calendar",
          uid: "gcal-ref-123",
          meetingId: "gcal-meeting-123",
          credentialId: testCredential.id,
          bookingId: unpaidBooking.id,
        },
      });
      createdBookingReferenceIds.push(bookingRef2.id);

      const refsBeforeDeletion = await prisma.bookingReference.findMany({
        where: {
          bookingId: unpaidBooking.id,
        },
      });
      expect(refsBeforeDeletion).toHaveLength(2);
      expect(refsBeforeDeletion.every((ref) => ref.deleted === null)).toBe(true);

      await deleteCredentialWithMetadata(testCredential.id, testUser.id);

      const refsAfterDeletion = await prisma.bookingReference.findMany({
        where: {
          bookingId: unpaidBooking.id,
        },
      });

      expect(refsAfterDeletion).toHaveLength(2);
      expect(refsAfterDeletion.every((ref) => ref.deleted === true)).toBe(true);

      const cancelledBooking = await prisma.booking.findUnique({
        where: { id: unpaidBooking.id },
      });
      expect(cancelledBooking?.status).toBe(BookingStatus.CANCELLED);
    });

    it("should persist soft-deleted references in database", async () => {
      const newCredential = await prisma.credential.create({
        data: {
          type: "stripe_payment",
          key: { test_key: "test_value" },
          userId: testUser.id,
          appId: "stripe",
        },
      });

      const unpaidBooking = await prisma.booking.create({
        data: {
          uid: "unpaid-booking-uid-456",
          title: "Another Unpaid Booking",
          startTime: new Date(Date.now() + 86400000),
          endTime: new Date(Date.now() + 90000000),
          userId: testUser.id,
          eventTypeId: testEventType.id,
          status: BookingStatus.PENDING,
          paid: false,
          attendees: {
            create: [
              {
                email: "attendee2@test.com",
                name: "Test Attendee 2",
                timeZone: "America/New_York",
              },
            ],
          },
          payment: {
            create: {
              uid: "payment-uid-456",
              appId: "stripe",
              amount: 1000,
              fee: 0,
              currency: "usd",
              success: false,
              refunded: false,
              data: {},
              externalId: "ext-payment-456",
            },
          },
        },
      });
      createdBookingIds.push(unpaidBooking.id);

      const bookingRef = await prisma.bookingReference.create({
        data: {
          type: "stripe_payment",
          uid: "stripe-ref-456",
          meetingId: "stripe-meeting-456",
          meetingUrl: "https://example.com/meeting",
          credentialId: newCredential.id,
          bookingId: unpaidBooking.id,
        },
      });
      createdBookingReferenceIds.push(bookingRef.id);

      await deleteCredentialWithMetadata(newCredential.id, testUser.id);

      const deletedRef = await prisma.bookingReference.findUnique({
        where: { id: bookingRef.id },
      });

      expect(deletedRef).toBeDefined();
      expect(deletedRef?.deleted).toBe(true);
      expect(deletedRef?.uid).toBe("stripe-ref-456");
      expect(deletedRef?.meetingUrl).toBe("https://example.com/meeting");
      expect(deletedRef?.type).toBe("stripe_payment");
    });

    it("should soft-delete references for multiple unpaid bookings when credential is deleted", async () => {
      const newCredential = await prisma.credential.create({
        data: {
          type: "stripe_payment",
          key: { test_key: "test_value" },
          userId: testUser.id,
          appId: "stripe",
        },
      });

      const booking1 = await prisma.booking.create({
        data: {
          uid: "booking-1-uid",
          title: "Booking 1",
          startTime: new Date(Date.now() + 86400000),
          endTime: new Date(Date.now() + 90000000),
          userId: testUser.id,
          eventTypeId: testEventType.id,
          status: BookingStatus.PENDING,
          paid: false,
          attendees: {
            create: [
              {
                email: "attendee-b1@test.com",
                name: "Attendee B1",
                timeZone: "America/New_York",
              },
            ],
          },
          payment: {
            create: {
              uid: "payment-uid-b1",
              appId: "stripe",
              amount: 1000,
              fee: 0,
              currency: "usd",
              success: false,
              refunded: false,
              data: {},
              externalId: "ext-payment-b1",
            },
          },
        },
      });
      createdBookingIds.push(booking1.id);

      const booking2 = await prisma.booking.create({
        data: {
          uid: "booking-2-uid",
          title: "Booking 2",
          startTime: new Date(Date.now() + 172800000), // 2 days from now
          endTime: new Date(Date.now() + 176400000),
          userId: testUser.id,
          eventTypeId: testEventType.id,
          status: BookingStatus.PENDING,
          paid: false,
          attendees: {
            create: [
              {
                email: "attendee-b2@test.com",
                name: "Attendee B2",
                timeZone: "America/New_York",
              },
            ],
          },
          payment: {
            create: {
              uid: "payment-uid-b2",
              appId: "stripe",
              amount: 1000,
              fee: 0,
              currency: "usd",
              success: false,
              refunded: false,
              data: {},
              externalId: "ext-payment-b2",
            },
          },
        },
      });
      createdBookingIds.push(booking2.id);

      const ref1 = await prisma.bookingReference.create({
        data: {
          type: "stripe_payment",
          uid: "stripe-ref-b1",
          meetingId: "meeting-b1",
          credentialId: newCredential.id,
          bookingId: booking1.id,
        },
      });
      createdBookingReferenceIds.push(ref1.id);

      const ref2 = await prisma.bookingReference.create({
        data: {
          type: "stripe_payment",
          uid: "stripe-ref-b2",
          meetingId: "meeting-b2",
          credentialId: newCredential.id,
          bookingId: booking2.id,
        },
      });
      createdBookingReferenceIds.push(ref2.id);

      await deleteCredentialWithMetadata(newCredential.id, testUser.id);

      const allRefsAfter = await prisma.bookingReference.findMany({
        where: {
          id: {
            in: [ref1.id, ref2.id],
          },
        },
      });

      expect(allRefsAfter).toHaveLength(2);
      expect(allRefsAfter.every((ref) => ref.deleted === true)).toBe(true);
    });

    it("should not affect references of paid bookings when credential is deleted", async () => {
      const newCredential = await prisma.credential.create({
        data: {
          type: "stripe_payment",
          key: { test_key: "test_value" },
          userId: testUser.id,
          appId: "stripe",
        },
      });

      const paidBooking = await prisma.booking.create({
        data: {
          uid: "paid-booking-uid",
          title: "Paid Booking",
          startTime: new Date(Date.now() + 86400000),
          endTime: new Date(Date.now() + 90000000),
          userId: testUser.id,
          eventTypeId: testEventType.id,
          status: BookingStatus.ACCEPTED,
          paid: true,
          attendees: {
            create: [
              {
                email: "paid-attendee@test.com",
                name: "Paid Attendee",
                timeZone: "America/New_York",
              },
            ],
          },
        },
      });
      createdBookingIds.push(paidBooking.id);

      const paidBookingRef = await prisma.bookingReference.create({
        data: {
          type: "stripe_payment",
          uid: "stripe-paid-ref",
          meetingId: "stripe-paid-meeting",
          credentialId: newCredential.id,
          bookingId: paidBooking.id,
        },
      });
      createdBookingReferenceIds.push(paidBookingRef.id);

      await deleteCredentialWithMetadata(newCredential.id, testUser.id);

      const refAfter = await prisma.bookingReference.findUnique({
        where: { id: paidBookingRef.id },
      });

      expect(refAfter).toBeDefined();
      expect(refAfter?.deleted).toBe(null);

      const bookingAfter = await prisma.booking.findUnique({
        where: { id: paidBooking.id },
      });
      expect(bookingAfter?.status).toBe(BookingStatus.ACCEPTED);
    });
  });

  describe("Soft-delete behavior with queries after credential deletion", () => {
    it("should exclude soft-deleted references from regular queries", async () => {
      const newCredential = await prisma.credential.create({
        data: {
          type: "stripe_payment",
          key: { test_key: "test_value" },
          userId: testUser.id,
          appId: "stripe",
        },
      });

      const unpaidBooking = await prisma.booking.create({
        data: {
          uid: "query-test-booking-uid",
          title: "Query Test Booking",
          startTime: new Date(Date.now() + 86400000),
          endTime: new Date(Date.now() + 90000000),
          userId: testUser.id,
          eventTypeId: testEventType.id,
          status: BookingStatus.PENDING,
          paid: false,
          attendees: {
            create: [
              {
                email: "query-test@test.com",
                name: "Query Test",
                timeZone: "America/New_York",
              },
            ],
          },
          payment: {
            create: {
              uid: "payment-uid-query-test",
              appId: "stripe",
              amount: 1000,
              fee: 0,
              currency: "usd",
              success: false,
              refunded: false,
              data: {},
              externalId: "ext-payment-query-test",
            },
          },
        },
      });
      createdBookingIds.push(unpaidBooking.id);

      const ref = await prisma.bookingReference.create({
        data: {
          type: "stripe_payment",
          uid: "query-test-ref",
          meetingId: "query-test-meeting",
          credentialId: newCredential.id,
          bookingId: unpaidBooking.id,
        },
      });
      createdBookingReferenceIds.push(ref.id);

      await deleteCredentialWithMetadata(newCredential.id, testUser.id);

      const activeRefs = await prisma.bookingReference.findMany({
        where: {
          bookingId: unpaidBooking.id,
          deleted: null,
        },
      });

      expect(activeRefs).toHaveLength(0);

      const allRefs = await prisma.bookingReference.findMany({
        where: {
          bookingId: unpaidBooking.id,
        },
      });

      expect(allRefs).toHaveLength(1);
      expect(allRefs[0].deleted).toBe(true);
    });
  });
});
