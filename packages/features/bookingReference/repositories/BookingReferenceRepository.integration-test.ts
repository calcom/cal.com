import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import prisma from "@calcom/prisma";
import type { Booking, Credential, User } from "@calcom/prisma/client";

import { BookingReferenceRepository } from "./BookingReferenceRepository";

describe("BookingReferenceRepository Integration Tests", () => {
  let testUser: User;
  let testCredential: Credential;
  let testBooking: Booking;
  const createdBookingReferenceIds: number[] = [];

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        email: "bookingreference-test@example.com",
        username: "bookingreference-test",
      },
    });

    testCredential = await prisma.credential.create({
      data: {
        type: "google_calendar",
        key: {},
        userId: testUser.id,
      },
    });

    testBooking = await prisma.booking.create({
      data: {
        uid: "test-booking-uid-123",
        title: "Test Booking",
        startTime: new Date(),
        endTime: new Date(),
        userId: testUser.id,
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
  });

  afterAll(async () => {
    await prisma.booking.delete({
      where: {
        id: testBooking.id,
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

  describe("replaceBookingReferences", () => {
    it("should soft-delete existing references and create new ones", async () => {
      const existingReference1 = await prisma.bookingReference.create({
        data: {
          type: "google_calendar",
          uid: "old-ref-1",
          meetingId: "old-meeting-1",
          credentialId: testCredential.id,
          bookingId: testBooking.id,
        },
      });
      createdBookingReferenceIds.push(existingReference1.id);

      const existingReference2 = await prisma.bookingReference.create({
        data: {
          type: "google_calendar",
          uid: "old-ref-2",
          meetingId: "old-meeting-2",
          credentialId: testCredential.id,
          bookingId: testBooking.id,
        },
      });
      createdBookingReferenceIds.push(existingReference2.id);

      const newReferences = [
        {
          type: "google_calendar",
          uid: "new-ref-1",
          meetingId: "new-meeting-1",
          credentialId: testCredential.id,
        },
        {
          type: "google_calendar",
          uid: "new-ref-2",
          meetingId: "new-meeting-2",
          credentialId: testCredential.id,
        },
      ];

      await BookingReferenceRepository.replaceBookingReferences({
        bookingId: testBooking.id,
        newReferencesToCreate: newReferences,
      });

      const allReferences = await prisma.bookingReference.findMany({
        where: {
          bookingId: testBooking.id,
        },
      });

      const oldReferences = allReferences.filter((ref) => ref.uid === "old-ref-1" || ref.uid === "old-ref-2");
      const newlyCreatedReferences = allReferences.filter(
        (ref) => ref.uid === "new-ref-1" || ref.uid === "new-ref-2"
      );

      expect(oldReferences).toHaveLength(2);
      expect(oldReferences.every((ref) => ref.deleted === true)).toBe(true);

      expect(newlyCreatedReferences).toHaveLength(2);
      expect(newlyCreatedReferences.every((ref) => ref.deleted === null)).toBe(true);

      newlyCreatedReferences.forEach((ref) => {
        createdBookingReferenceIds.push(ref.id);
      });
    });

    it("should only soft-delete references of the same type as new references being created", async () => {
      const googleRef = await prisma.bookingReference.create({
        data: {
          type: "google_calendar",
          uid: "google-ref",
          meetingId: "google-meeting",
          credentialId: testCredential.id,
          bookingId: testBooking.id,
        },
      });
      createdBookingReferenceIds.push(googleRef.id);

      const zoomRef = await prisma.bookingReference.create({
        data: {
          type: "zoom_video",
          uid: "zoom-ref",
          meetingId: "zoom-meeting",
          credentialId: testCredential.id,
          bookingId: testBooking.id,
        },
      });
      createdBookingReferenceIds.push(zoomRef.id);

      const newGoogleReferences = [
        {
          type: "google_calendar",
          uid: "new-google-ref",
          meetingId: "new-google-meeting",
          credentialId: testCredential.id,
        },
      ];

      await BookingReferenceRepository.replaceBookingReferences({
        bookingId: testBooking.id,
        newReferencesToCreate: newGoogleReferences,
      });

      const googleRefAfter = await prisma.bookingReference.findUnique({
        where: { id: googleRef.id },
      });
      expect(googleRefAfter?.deleted).toBe(true);

      const zoomRefAfter = await prisma.bookingReference.findUnique({
        where: { id: zoomRef.id },
      });
      expect(zoomRefAfter?.deleted).toBe(null);

      const newRef = await prisma.bookingReference.findFirst({
        where: {
          uid: "new-google-ref",
          bookingId: testBooking.id,
        },
      });
      expect(newRef).toBeDefined();
      expect(newRef?.deleted).toBe(null);
      if (newRef) {
        createdBookingReferenceIds.push(newRef.id);
      }
    });

    it("should persist soft-deleted records in database", async () => {
      const reference = await prisma.bookingReference.create({
        data: {
          type: "daily_video",
          uid: "daily-ref",
          meetingId: "daily-meeting",
          credentialId: testCredential.id,
          bookingId: testBooking.id,
        },
      });
      createdBookingReferenceIds.push(reference.id);

      const newReferences = [
        {
          type: "daily_video",
          uid: "new-daily-ref",
          meetingId: "new-daily-meeting",
          credentialId: testCredential.id,
        },
      ];

      await BookingReferenceRepository.replaceBookingReferences({
        bookingId: testBooking.id,
        newReferencesToCreate: newReferences,
      });

      const deletedRefInDb = await prisma.bookingReference.findUnique({
        where: { id: reference.id },
      });
      expect(deletedRefInDb).toBeDefined();
      expect(deletedRefInDb?.deleted).toBe(true);
      expect(deletedRefInDb?.uid).toBe("daily-ref");

      const newRef = await prisma.bookingReference.findFirst({
        where: {
          uid: "new-daily-ref",
          bookingId: testBooking.id,
        },
      });
      if (newRef) {
        createdBookingReferenceIds.push(newRef.id);
      }
    });
  });

  describe("findDailyVideoReferenceByRoomName", () => {
    it("should find active daily video references", async () => {
      const roomName = "test-daily-room-123";
      const dailyRef = await prisma.bookingReference.create({
        data: {
          type: "daily_video",
          uid: roomName,
          meetingId: roomName,
          credentialId: testCredential.id,
          bookingId: testBooking.id,
        },
      });
      createdBookingReferenceIds.push(dailyRef.id);

      const result = await BookingReferenceRepository.findDailyVideoReferenceByRoomName({
        roomName,
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe(dailyRef.id);
      expect(result?.uid).toBe(roomName);
      expect(result?.deleted).toBe(null);
    });

    it("should exclude soft-deleted daily video references", async () => {
      const roomName = "test-daily-room-deleted-456";
      const dailyRef = await prisma.bookingReference.create({
        data: {
          type: "daily_video",
          uid: roomName,
          meetingId: roomName,
          credentialId: testCredential.id,
          bookingId: testBooking.id,
          deleted: true,
        },
      });
      createdBookingReferenceIds.push(dailyRef.id);

      const result = await BookingReferenceRepository.findDailyVideoReferenceByRoomName({
        roomName,
      });

      expect(result).toBeNull();
    });

    it("should return null when room name does not exist", async () => {
      const result = await BookingReferenceRepository.findDailyVideoReferenceByRoomName({
        roomName: "non-existent-room",
      });

      expect(result).toBeNull();
    });

    it("should not return daily video references without a booking", async () => {
      const roomName = "test-daily-room-no-booking";
      const dailyRef = await prisma.bookingReference.create({
        data: {
          type: "daily_video",
          uid: roomName,
          meetingId: roomName,
          credentialId: testCredential.id,
          bookingId: null,
        },
      });
      createdBookingReferenceIds.push(dailyRef.id);

      const result = await BookingReferenceRepository.findDailyVideoReferenceByRoomName({
        roomName,
      });

      expect(result).toBeNull();
    });
  });

  describe("Soft-delete behavior verification", () => {
    it("should not return soft-deleted references in regular queries", async () => {
      const activeRef = await prisma.bookingReference.create({
        data: {
          type: "zoom_video",
          uid: "active-zoom",
          meetingId: "active-zoom-meeting",
          credentialId: testCredential.id,
          bookingId: testBooking.id,
        },
      });
      createdBookingReferenceIds.push(activeRef.id);

      const deletedRef = await prisma.bookingReference.create({
        data: {
          type: "zoom_video",
          uid: "deleted-zoom",
          meetingId: "deleted-zoom-meeting",
          credentialId: testCredential.id,
          bookingId: testBooking.id,
          deleted: true,
        },
      });
      createdBookingReferenceIds.push(deletedRef.id);

      const foundReferences = await prisma.bookingReference.findMany({
        where: {
          bookingId: testBooking.id,
          type: "zoom_video",
          deleted: null,
        },
      });

      expect(foundReferences).toHaveLength(1);
      expect(foundReferences[0].id).toBe(activeRef.id);
      expect(foundReferences[0].uid).toBe("active-zoom");
    });

    it("should allow querying soft-deleted references explicitly", async () => {
      const deletedRef = await prisma.bookingReference.create({
        data: {
          type: "office365_calendar",
          uid: "deleted-office365",
          meetingId: "deleted-office365-meeting",
          credentialId: testCredential.id,
          bookingId: testBooking.id,
          deleted: true,
        },
      });
      createdBookingReferenceIds.push(deletedRef.id);

      const foundDeletedReferences = await prisma.bookingReference.findMany({
        where: {
          bookingId: testBooking.id,
          deleted: true,
        },
      });

      expect(foundDeletedReferences.length).toBeGreaterThan(0);
      const ourDeletedRef = foundDeletedReferences.find((ref) => ref.id === deletedRef.id);
      expect(ourDeletedRef).toBeDefined();
      expect(ourDeletedRef?.uid).toBe("deleted-office365");
    });
  });
});
