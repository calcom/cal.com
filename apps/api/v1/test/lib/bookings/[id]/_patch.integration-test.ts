import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

import prisma from "@calcom/prisma";

import handler from "../../../../pages/api/bookings/[id]/_patch";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

describe("PATCH /api/bookings", () => {
  let member1Booking: Awaited<ReturnType<typeof prisma.booking.create>>;
  let member0Booking: Awaited<ReturnType<typeof prisma.booking.create>>;
  const createdBookingIds: number[] = [];
  let testAdminUserId: number | null = null;

  beforeAll(async () => {
    const member1 = await prisma.user.findFirstOrThrow({
      where: { email: "member1-acme@example.com" },
    });

    const member0 = await prisma.user.findFirstOrThrow({
      where: { email: "member0-acme@example.com" },
    });

    // Create bookings for testing
    member1Booking = await prisma.booking.create({
      data: {
        uid: `test-member1-booking-${Date.now()}`,
        title: "Member 1 Test Booking",
        startTime: new Date(Date.now() + 86400000), // Tomorrow
        endTime: new Date(Date.now() + 90000000), // Tomorrow + 1 hour
        userId: member1.id,
        status: "ACCEPTED",
      },
    });
    createdBookingIds.push(member1Booking.id);

    member0Booking = await prisma.booking.create({
      data: {
        uid: `test-member0-booking-${Date.now()}`,
        title: "Member 0 Test Booking",
        startTime: new Date(Date.now() + 172800000), // Day after tomorrow
        endTime: new Date(Date.now() + 176400000), // Day after tomorrow + 1 hour
        userId: member0.id,
        status: "ACCEPTED",
      },
    });
    createdBookingIds.push(member0Booking.id);
  });

  afterAll(async () => {
    if (createdBookingIds.length > 0) {
      await prisma.booking.deleteMany({
        where: { id: { in: createdBookingIds } },
      });
    }

    // Clean up test admin user if created
    if (testAdminUserId) {
      await prisma.user.delete({
        where: { id: testAdminUserId },
      });
    }
  });
  it("Returns 403 when user has no permission to the booking", async () => {
    // Member2 tries to access Member0's booking - should fail
    const member2 = await prisma.user.findFirstOrThrow({ where: { email: "member2-acme@example.com" } });

    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "PATCH",
      body: {
        title: member0Booking.title,
        startTime: member0Booking.startTime.toISOString(),
        endTime: member0Booking.endTime.toISOString(),
        userId: member2.id,
      },
      query: {
        id: member0Booking.id,
      },
    });

    req.userId = member2.id;

    await handler(req, res);
    expect(res.statusCode).toBe(403);
  });

  it("Allows PATCH when user is system-wide admin", async () => {
    // Check if admin user already exists before upserting
    const existingAdmin = await prisma.user.findUnique({ where: { email: "test-admin@example.com" } });
    
    // Create a system-wide admin user for this test
    const adminUser = await prisma.user.upsert({
      where: { email: "test-admin@example.com" },
      update: { role: "ADMIN" },
      create: {
        email: "test-admin@example.com",
        username: "test-admin",
        name: "Test Admin",
        role: "ADMIN",
      },
    });
    
    // Only track for cleanup if we created it (not if it already existed)
    if (!existingAdmin) {
      testAdminUserId = adminUser.id;
    }

    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "PATCH",
      body: {
        title: member0Booking.title,
        startTime: member0Booking.startTime.toISOString(),
        endTime: member0Booking.endTime.toISOString(),
        userId: member0Booking.userId,
      },
      query: {
        id: member0Booking.id,
      },
    });

    req.userId = adminUser.id;
    req.isSystemWideAdmin = true;

    await handler(req, res);
    expect(res.statusCode).toBe(200);
  });

  it("Allows PATCH when user is org-wide admin", async () => {
    const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });

    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "PATCH",
      body: {
        title: member1Booking.title,
        startTime: member1Booking.startTime.toISOString(),
        endTime: member1Booking.endTime.toISOString(),
        userId: member1Booking.userId,
      },
      query: {
        id: member1Booking.id,
      },
    });

    req.userId = adminUser.id;
    req.isOrganizationOwnerOrAdmin = true;

    await handler(req, res);
    expect(res.statusCode).toBe(200);
  });
});
