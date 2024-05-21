import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, it } from "vitest";

import prisma from "@calcom/prisma";

import { handler } from "../../../pages/api/bookings/_get";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

const DefaultPagination = {
  take: 10,
  skip: 0,
};

describe("GET /api/bookings", async () => {
  const proUser = await prisma.user.findFirstOrThrow({ where: { email: "pro@example.com" } });
  const proUserBooking = await prisma.booking.findFirstOrThrow({ where: { userId: proUser.id } });

  it("Does not return bookings of other users when user has no permission", async () => {
    const memberUser = await prisma.user.findFirstOrThrow({ where: { email: "member2-acme@example.com" } });

    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      query: {
        userId: proUser.id,
      },
      pagination: DefaultPagination,
    });

    req.userId = memberUser.id;

    const responseData = await handler(req);
    const groupedUsers = new Set(responseData.bookings.map((b) => b.userId));

    expect(responseData.bookings.find((b) => b.userId === memberUser.id)).toBeDefined();
    expect(groupedUsers.size).toBe(1);
    expect(groupedUsers.entries().next().value[0]).toBe(memberUser.id);
  });

  it("Returns bookings for regular user", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      pagination: DefaultPagination,
    });

    req.userId = proUser.id;

    const responseData = await handler(req);
    expect(responseData.bookings.find((b) => b.id === proUserBooking.id)).toBeDefined();
    expect(responseData.bookings.find((b) => b.userId !== proUser.id)).toBeUndefined();
  });

  it("Returns bookings for specified user when accessed by system-wide admin", async () => {
    const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      pagination: DefaultPagination,
      query: {
        userId: proUser.id,
      },
    });

    req.isSystemWideAdmin = true;
    req.userId = adminUser.id;

    const responseData = await handler(req);
    expect(responseData.bookings.find((b) => b.id === proUserBooking.id)).toBeDefined();
    expect(responseData.bookings.find((b) => b.userId !== proUser.id)).toBeUndefined();
  });

  it("Returns bookings for all users when accessed by system-wide admin", async () => {
    const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      pagination: {
        take: 100,
        skip: 0,
      },
    });

    req.isSystemWideAdmin = true;
    req.userId = adminUser.id;

    const responseData = await handler(req);
    const groupedUsers = new Set(responseData.bookings.map((b) => b.userId));
    expect(responseData.bookings.find((b) => b.id === proUserBooking.id)).toBeDefined();
    expect(groupedUsers.size).toBeGreaterThan(2);
  });

  it("Returns bookings for org users when accessed by org admin", async () => {
    const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "GET",
      pagination: DefaultPagination,
    });

    req.userId = adminUser.id;
    req.isOrganizationOwnerOrAdmin = true;

    const responseData = await handler(req);
    const groupedUsers = new Set(responseData.bookings.map((b) => b.userId));
    expect(responseData.bookings.find((b) => b.id === proUserBooking.id)).toBeUndefined();
    expect(groupedUsers.size).toBeGreaterThanOrEqual(2);
  });
});
