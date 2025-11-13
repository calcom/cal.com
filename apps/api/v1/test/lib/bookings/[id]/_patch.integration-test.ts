import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, it, expect } from "vitest";

import prisma from "@calcom/prisma";

import handler from "../../../../pages/api/bookings/[id]/_patch";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

describe("PATCH /api/bookings", () => {
  it("Returns 403 when user has no permission to the booking", async () => {
    const memberUser = await prisma.user.findFirstOrThrow({ where: { email: "member2-acme@example.com" } });
    const proUser = await prisma.user.findFirstOrThrow({ where: { email: "pro@example.com" } });
    const booking = await prisma.booking.findFirstOrThrow({ where: { userId: proUser.id } });

    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "PATCH",
      body: {
        title: booking.title,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        userId: memberUser.id,
      },
      query: {
        id: booking.id,
      },
    });

    req.userId = memberUser.id;

    await handler(req, res);
    expect(res.statusCode).toBe(403);
  });

  it("Allows PATCH when user is system-wide admin", async () => {
    const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "admin@example.com" } });
    const proUser = await prisma.user.findFirstOrThrow({ where: { email: "pro@example.com" } });
    const booking = await prisma.booking.findFirstOrThrow({ where: { userId: proUser.id } });

    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "PATCH",
      body: {
        title: booking.title,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        userId: proUser.id,
      },
      query: {
        id: booking.id,
      },
    });

    req.userId = adminUser.id;
    req.isSystemWideAdmin = true;

    await handler(req, res);
    expect(res.statusCode).toBe(200);
  });

  it("Allows PATCH when user is org-wide admin", async () => {
    const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });
    const memberUser = await prisma.user.findFirstOrThrow({ where: { email: "member1-acme@example.com" } });
    const booking = await prisma.booking.findFirstOrThrow({ where: { userId: memberUser.id } });

    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "PATCH",
      body: {
        title: booking.title,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        userId: memberUser.id,
      },
      query: {
        id: booking.id,
      },
    });

    req.userId = adminUser.id;
    req.isOrganizationOwnerOrAdmin = true;

    await handler(req, res);
    expect(res.statusCode).toBe(200);
  });
});
