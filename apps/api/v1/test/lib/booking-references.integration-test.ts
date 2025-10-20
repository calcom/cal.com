import { describe, it, expect, beforeAll, afterAll } from "vitest";

import prisma from "@calcom/prisma";
import type { Booking, Credential, EventType, User } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";

describe("BookingReference Integration Tests - API v1", () => {
  let testUser: User;
  let testCredential: Credential;
  let testEventType: EventType;
  let testBooking: Booking;
  const createdBookingReferenceIds: number[] = [];

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        email: "api-bookingreference-test@example.com",
        username: "api-bookingreference-test",
      },
    });

    testCredential = await prisma.credential.create({
      data: {
        type: "google_calendar",
        key: {},
        userId: testUser.id,
      },
    });

    testEventType = await prisma.eventType.create({
      data: {
        title: "Test Event Type",
        slug: "api-test-event-type",
        length: 30,
        userId: testUser.id,
      },
    });

    testBooking = await prisma.booking.create({
      data: {
        uid: "api-test-booking-uid",
        title: "API Test Booking",
        startTime: new Date(Date.now() + 86400000),
        endTime: new Date(Date.now() + 90000000),
        userId: testUser.id,
        eventTypeId: testEventType.id,
        status: BookingStatus.ACCEPTED,
      },
    });
  });

  afterAll(async () => {
    if (createdBookingReferenceIds.length > 0) {
      await prisma.bookingReference.deleteMany({
        where: {
          id: {
            in: createdBookingReferenceIds,
          },
        },
      });
    }

    await prisma.booking.delete({
      where: {
        id: testBooking.id,
      },
    });

    await prisma.eventType.delete({
      where: {
        id: testEventType.id,
      },
    });

    await prisma.credential.delete({
      where: {
        id: testCredential.id,
      },
    });

    await prisma.user.delete({
      where: {
        id: testUser.id,
      },
    });
  });

  describe("Querying booking references with soft-delete filter", () => {
    it("should only return active booking references when filtering by deleted: null", async () => {
      const activeRef = await prisma.bookingReference.create({
        data: {
          type: "google_calendar",
          uid: "api-active-ref",
          meetingId: "api-active-meeting",
          credentialId: testCredential.id,
          bookingId: testBooking.id,
        },
      });
      createdBookingReferenceIds.push(activeRef.id);

      const deletedRef = await prisma.bookingReference.create({
        data: {
          type: "google_calendar",
          uid: "api-deleted-ref",
          meetingId: "api-deleted-meeting",
          credentialId: testCredential.id,
          bookingId: testBooking.id,
          deleted: true,
        },
      });
      createdBookingReferenceIds.push(deletedRef.id);

      const activeReferences = await prisma.bookingReference.findMany({
        where: {
          bookingId: testBooking.id,
          deleted: null,
        },
      });

      const refsWithoutDeletedRef = activeReferences.filter((ref) => ref.id !== deletedRef.id);
      expect(refsWithoutDeletedRef.find((ref) => ref.id === activeRef.id)).toBeDefined();
      expect(activeReferences.find((ref) => ref.id === deletedRef.id)).toBeUndefined();
    });

    it("should exclude soft-deleted references when querying bookings with references", async () => {
      await prisma.bookingReference.deleteMany({
        where: {
          id: {
            in: createdBookingReferenceIds,
          },
        },
      });
      createdBookingReferenceIds.splice(0, createdBookingReferenceIds.length);

      const activeRef = await prisma.bookingReference.create({
        data: {
          type: "zoom_video",
          uid: "api-zoom-active",
          meetingId: "api-zoom-active-meeting",
          credentialId: testCredential.id,
          bookingId: testBooking.id,
        },
      });
      createdBookingReferenceIds.push(activeRef.id);

      const deletedRef = await prisma.bookingReference.create({
        data: {
          type: "zoom_video",
          uid: "api-zoom-deleted",
          meetingId: "api-zoom-deleted-meeting",
          credentialId: testCredential.id,
          bookingId: testBooking.id,
          deleted: true,
        },
      });
      createdBookingReferenceIds.push(deletedRef.id);

      const booking = await prisma.booking.findUnique({
        where: {
          id: testBooking.id,
        },
        include: {
          references: {
            where: {
              deleted: null,
            },
          },
        },
      });

      expect(booking).toBeDefined();
      expect(booking?.references).toBeDefined();
      expect(booking?.references.find((ref) => ref.id === activeRef.id)).toBeDefined();
      expect(booking?.references.find((ref) => ref.id === deletedRef.id)).toBeUndefined();
    });

    it("should allow querying all references including soft-deleted when filter is not applied", async () => {
      const booking = await prisma.booking.findUnique({
        where: {
          id: testBooking.id,
        },
        include: {
          references: true,
        },
      });

      const allReferences = booking?.references || [];
      const softDeletedRefs = allReferences.filter((ref) => ref.deleted === true);
      const activeRefs = allReferences.filter((ref) => ref.deleted === null);

      expect(allReferences.length).toBeGreaterThan(0);
      expect(softDeletedRefs.length).toBeGreaterThan(0);
      expect(activeRefs.length).toBeGreaterThan(0);
    });

    it("should filter by type and deleted status simultaneously", async () => {
      const booking = await prisma.booking.findUnique({
        where: {
          id: testBooking.id,
        },
        include: {
          references: {
            where: {
              type: "zoom_video",
              deleted: null,
            },
          },
        },
      });

      const zoomRefs = booking?.references || [];
      expect(zoomRefs.every((ref) => ref.type === "zoom_video")).toBe(true);
      expect(zoomRefs.every((ref) => ref.deleted === null)).toBe(true);
    });
  });

  describe("Soft-delete persistence in database", () => {
    it("should persist all data fields of soft-deleted references", async () => {
      await prisma.bookingReference.deleteMany({
        where: {
          id: {
            in: createdBookingReferenceIds,
          },
        },
      });
      createdBookingReferenceIds.splice(0, createdBookingReferenceIds.length);

      const referenceData = {
        type: "daily_video",
        uid: "api-daily-persist-test",
        meetingId: "api-daily-meeting-persist",
        meetingUrl: "https://example.com/persist-test-meeting",
        meetingPassword: "test-password",
        credentialId: testCredential.id,
        bookingId: testBooking.id,
      };

      const ref = await prisma.bookingReference.create({
        data: referenceData,
      });
      createdBookingReferenceIds.push(ref.id);

      await prisma.bookingReference.update({
        where: { id: ref.id },
        data: { deleted: true },
      });

      const deletedRef = await prisma.bookingReference.findUnique({
        where: { id: ref.id },
      });

      expect(deletedRef).toBeDefined();
      expect(deletedRef?.deleted).toBe(true);
      expect(deletedRef?.type).toBe(referenceData.type);
      expect(deletedRef?.uid).toBe(referenceData.uid);
      expect(deletedRef?.meetingId).toBe(referenceData.meetingId);
      expect(deletedRef?.meetingUrl).toBe(referenceData.meetingUrl);
      expect(deletedRef?.meetingPassword).toBe(referenceData.meetingPassword);
    });

    it("should allow updating soft-deleted references back to active", async () => {
      const ref = await prisma.bookingReference.findFirst({
        where: {
          deleted: true,
          bookingId: testBooking.id,
        },
      });

      if (!ref) {
        throw new Error("No soft-deleted reference found for test");
      }

      await prisma.bookingReference.update({
        where: { id: ref.id },
        data: { deleted: null },
      });

      const reactivatedRef = await prisma.bookingReference.findUnique({
        where: { id: ref.id },
      });

      expect(reactivatedRef?.deleted).toBe(null);

      await prisma.bookingReference.update({
        where: { id: ref.id },
        data: { deleted: true },
      });
    });
  });

  describe("Batch operations with soft-delete", () => {
    it("should soft-delete multiple references at once", async () => {
      await prisma.bookingReference.deleteMany({
        where: {
          id: {
            in: createdBookingReferenceIds,
          },
        },
      });
      createdBookingReferenceIds.splice(0, createdBookingReferenceIds.length);

      const ref1 = await prisma.bookingReference.create({
        data: {
          type: "office365_calendar",
          uid: "api-batch-1",
          meetingId: "api-batch-meeting-1",
          credentialId: testCredential.id,
          bookingId: testBooking.id,
        },
      });
      createdBookingReferenceIds.push(ref1.id);

      const ref2 = await prisma.bookingReference.create({
        data: {
          type: "office365_calendar",
          uid: "api-batch-2",
          meetingId: "api-batch-meeting-2",
          credentialId: testCredential.id,
          bookingId: testBooking.id,
        },
      });
      createdBookingReferenceIds.push(ref2.id);

      await prisma.bookingReference.updateMany({
        where: {
          id: {
            in: [ref1.id, ref2.id],
          },
        },
        data: {
          deleted: true,
        },
      });

      const updatedRefs = await prisma.bookingReference.findMany({
        where: {
          id: {
            in: [ref1.id, ref2.id],
          },
        },
      });

      expect(updatedRefs).toHaveLength(2);
      expect(updatedRefs.every((ref) => ref.deleted === true)).toBe(true);
    });

    it("should count only active references when using count with filter", async () => {
      const activeCount = await prisma.bookingReference.count({
        where: {
          bookingId: testBooking.id,
          deleted: null,
        },
      });

      const deletedCount = await prisma.bookingReference.count({
        where: {
          bookingId: testBooking.id,
          deleted: true,
        },
      });

      const totalCount = await prisma.bookingReference.count({
        where: {
          bookingId: testBooking.id,
        },
      });

      expect(totalCount).toBe(activeCount + deletedCount);
      expect(activeCount).toBe(0);
      expect(deletedCount).toBeGreaterThan(0);
    });
  });
});
