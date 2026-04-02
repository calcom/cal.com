import prisma from "@calcom/prisma";
import type { Booking, Credential, EventType, User } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handler } from "../../pages/api/booking-references/_get";
import { patchHandler } from "../../pages/api/booking-references/[id]/_patch";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

describe("GET /api/booking-references - Soft-delete filtering", () => {
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

  it("should only return active booking references, excluding soft-deleted ones", async () => {
    const timestamp = Date.now();
    const activeRef = await prisma.bookingReference.create({
      data: {
        type: "google_calendar",
        uid: `api-active-ref-${timestamp}`,
        meetingId: `api-active-meeting-${timestamp}`,
        credentialId: testCredential.id,
        bookingId: testBooking.id,
      },
    });
    createdBookingReferenceIds.push(activeRef.id);

    const deletedRef = await prisma.bookingReference.create({
      data: {
        type: "google_calendar",
        uid: `api-deleted-ref-${timestamp}`,
        meetingId: `api-deleted-meeting-${timestamp}`,
        credentialId: testCredential.id,
        bookingId: testBooking.id,
        deleted: true,
      },
    });
    createdBookingReferenceIds.push(deletedRef.id);

    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
    });

    req.userId = testUser.id;

    const responseData = await handler(req);

    expect(responseData.booking_references).toBeDefined();
    expect(Array.isArray(responseData.booking_references)).toBe(true);

    const returnedActiveRef = responseData.booking_references.find(
      (ref: { id: number }) => ref.id === activeRef.id
    );
    const returnedDeletedRef = responseData.booking_references.find(
      (ref: { id: number }) => ref.id === deletedRef.id
    );

    expect(returnedActiveRef).toBeDefined();
    expect(returnedDeletedRef).toBeUndefined();
  });

  it("should filter booking references by user when not system admin", async () => {
    const timestamp = Date.now();
    const otherUser = await prisma.user.create({
      data: {
        email: `other-user-bookingreference-${timestamp}@example.com`,
        username: `other-user-bookingreference-${timestamp}`,
      },
    });

    const otherBooking = await prisma.booking.create({
      data: {
        uid: `other-user-booking-uid-${timestamp}`,
        title: "Other User Booking",
        startTime: new Date(Date.now() + 86400000),
        endTime: new Date(Date.now() + 90000000),
        userId: otherUser.id,
        eventTypeId: testEventType.id,
        status: BookingStatus.ACCEPTED,
      },
    });

    const otherUserRef = await prisma.bookingReference.create({
      data: {
        type: "zoom_video",
        uid: `other-user-ref-${timestamp}`,
        meetingId: `other-user-meeting-${timestamp}`,
        credentialId: testCredential.id,
        bookingId: otherBooking.id,
      },
    });
    createdBookingReferenceIds.push(otherUserRef.id);

    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
    });

    req.userId = testUser.id;

    const responseData = await handler(req);

    const userRefs = responseData.booking_references.filter(
      (ref: { id: number }) => ref.id === otherUserRef.id
    );

    expect(userRefs).toHaveLength(0);

    await prisma.booking.delete({ where: { id: otherBooking.id } });
    await prisma.user.delete({ where: { id: otherUser.id } });
  });

  it("should return only active booking references for user, not soft-deleted ones for system admin", async () => {
    const timestamp = Date.now();
    const activeRef1 = await prisma.bookingReference.create({
      data: {
        type: "daily_video",
        uid: `admin-active-ref-1-${timestamp}`,
        meetingId: `admin-active-meeting-1-${timestamp}`,
        credentialId: testCredential.id,
        bookingId: testBooking.id,
      },
    });
    createdBookingReferenceIds.push(activeRef1.id);

    const activeRef2 = await prisma.bookingReference.create({
      data: {
        type: "daily_video",
        uid: `admin-active-ref-2-${timestamp}`,
        meetingId: `admin-active-meeting-2-${timestamp}`,
        credentialId: testCredential.id,
        bookingId: testBooking.id,
      },
    });
    createdBookingReferenceIds.push(activeRef2.id);

    const deletedRef = await prisma.bookingReference.create({
      data: {
        type: "daily_video",
        uid: `admin-deleted-ref-${timestamp}`,
        meetingId: `admin-deleted-meeting-${timestamp}`,
        credentialId: testCredential.id,
        bookingId: testBooking.id,
        deleted: true,
      },
    });
    createdBookingReferenceIds.push(deletedRef.id);

    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
    });

    req.userId = testUser.id;

    const responseData = await handler(req);

    const activeRefs = responseData.booking_references.filter(
      (ref: { id: number }) => ref.id === activeRef1.id || ref.id === activeRef2.id
    );
    const returnedDeletedRef = responseData.booking_references.find(
      (ref: { id: number }) => ref.id === deletedRef.id
    );

    expect(activeRefs.length).toBe(2);
    expect(returnedDeletedRef).toBeUndefined();
  });

  it("should verify soft-deleted references are never returned through the API", async () => {
    const timestamp = Date.now();
    const activeRef = await prisma.bookingReference.create({
      data: {
        type: "office365_calendar",
        uid: `never-return-active-${timestamp}`,
        meetingId: `never-return-active-meeting-${timestamp}`,
        credentialId: testCredential.id,
        bookingId: testBooking.id,
      },
    });
    createdBookingReferenceIds.push(activeRef.id);

    await prisma.bookingReference.update({
      where: { id: activeRef.id },
      data: { deleted: true },
    });

    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
    });

    req.userId = testUser.id;

    const responseData = await handler(req);

    const softDeletedRef = responseData.booking_references.find(
      (ref: { id: number }) => ref.id === activeRef.id
    );

    expect(softDeletedRef).toBeUndefined();

    const refInDb = await prisma.bookingReference.findUnique({
      where: { id: activeRef.id },
    });
    expect(refInDb).toBeDefined();
    expect(refInDb?.deleted).toBe(true);
  });
});

describe("PATCH /api/booking-references/[id] - Existing functionality", () => {
  let testUser: User;
  let testCredential: Credential;
  let testEventType: EventType;
  let testBooking: Booking;
  const createdBookingReferenceIds: number[] = [];

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        email: "api-bookingreference-patch-test@example.com",
        username: "api-bookingreference-patch-test",
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
        slug: "api-patch-test-event-type",
        length: 30,
        userId: testUser.id,
      },
    });

    testBooking = await prisma.booking.create({
      data: {
        uid: "api-patch-test-booking-uid",
        title: "API Patch Test Booking",
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

  it("should successfully update an active booking reference", async () => {
    const timestamp = Date.now();
    const activeRef = await prisma.bookingReference.create({
      data: {
        type: "google_calendar",
        uid: `patch-active-ref-${timestamp}`,
        meetingId: `patch-active-meeting-${timestamp}`,
        credentialId: testCredential.id,
        bookingId: testBooking.id,
      },
    });
    createdBookingReferenceIds.push(activeRef.id);

    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "PATCH",
      query: { id: activeRef.id.toString() },
      body: {
        meetingPassword: "new-password-123",
      },
    });

    req.userId = testUser.id;
    req.isSystemWideAdmin = false;

    const responseData = await patchHandler(req);

    expect(responseData.booking_reference).toBeDefined();
    expect(responseData.booking_reference.id).toBe(activeRef.id);
    expect(responseData.booking_reference.meetingPassword).toBe("new-password-123");

    const updatedRef = await prisma.bookingReference.findUnique({
      where: { id: activeRef.id },
    });
    expect(updatedRef?.meetingPassword).toBe("new-password-123");
  });

  it("should allow updating a soft-deleted booking reference (existing functionality)", async () => {
    const timestamp = Date.now();
    const deletedRef = await prisma.bookingReference.create({
      data: {
        type: "google_calendar",
        uid: `patch-deleted-ref-${timestamp}`,
        meetingId: `patch-deleted-meeting-${timestamp}`,
        credentialId: testCredential.id,
        bookingId: testBooking.id,
        deleted: true,
        meetingPassword: "original-password",
      },
    });
    createdBookingReferenceIds.push(deletedRef.id);

    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "PATCH",
      query: { id: deletedRef.id.toString() },
      body: {
        meetingPassword: "updated-password",
      },
    });

    req.userId = testUser.id;
    req.isSystemWideAdmin = false;

    const responseData = await patchHandler(req);

    expect(responseData.booking_reference).toBeDefined();
    expect(responseData.booking_reference.id).toBe(deletedRef.id);
    expect(responseData.booking_reference.meetingPassword).toBe("updated-password");

    const updatedRef = await prisma.bookingReference.findUnique({
      where: { id: deletedRef.id },
    });
    expect(updatedRef?.meetingPassword).toBe("updated-password");
    expect(updatedRef?.deleted).toBe(true);
  });

  it("should verify that booking references can be updated regardless of deleted status", async () => {
    const timestamp = Date.now();
    const activeRef = await prisma.bookingReference.create({
      data: {
        type: "zoom_video",
        uid: `patch-verify-active-${timestamp}`,
        meetingId: `patch-verify-active-meeting-${timestamp}`,
        credentialId: testCredential.id,
        bookingId: testBooking.id,
        meetingPassword: "original-password",
      },
    });
    createdBookingReferenceIds.push(activeRef.id);

    await prisma.bookingReference.update({
      where: { id: activeRef.id },
      data: { deleted: true },
    });

    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "PATCH",
      query: { id: activeRef.id.toString() },
      body: {
        meetingPassword: "updated-password",
      },
    });

    req.userId = testUser.id;
    req.isSystemWideAdmin = false;

    const responseData = await patchHandler(req);

    expect(responseData.booking_reference).toBeDefined();
    expect(responseData.booking_reference.meetingPassword).toBe("updated-password");

    const refInDb = await prisma.bookingReference.findUnique({
      where: { id: activeRef.id },
    });
    expect(refInDb?.meetingPassword).toBe("updated-password");
    expect(refInDb?.deleted).toBe(true);
  });
});
