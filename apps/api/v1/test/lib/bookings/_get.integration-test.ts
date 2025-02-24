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

  describe("Upcoming bookings feature", () => {
    it("Returns only upcoming bookings when status=upcoming for regular user", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          status: "upcoming",
        },
        pagination: DefaultPagination,
      });

      req.userId = proUser.id;

      const responseData = await handler(req);
      responseData.bookings.forEach((booking) => {
        expect(new Date(booking.startTime).getTime()).toBeGreaterThanOrEqual(new Date().getTime());
      });
    });

    it("Returns all bookings when status not specified for regular user", async () => {
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        pagination: DefaultPagination,
      });

      req.userId = proUser.id;

      const responseData = await handler(req);
      expect(responseData.bookings.find((b) => b.id === proUserBooking.id)).toBeDefined();

      const { req: req2 } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        pagination: DefaultPagination,
      });

      req2.userId = proUser.id;

      const responseData2 = await handler(req2);
      expect(responseData2.bookings.find((b) => b.id === proUserBooking.id)).toBeDefined();
    });

    it("Returns only upcoming bookings when status=upcoming for system-wide admin", async () => {
      const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          status: "upcoming",
        },
        pagination: {
          take: 100,
          skip: 0,
        },
      });

      req.isSystemWideAdmin = true;
      req.userId = adminUser.id;

      const responseData = await handler(req);
      responseData.bookings.forEach((booking) => {
        expect(new Date(booking.startTime).getTime()).toBeGreaterThanOrEqual(new Date().getTime());
      });
    });

    it("Returns only upcoming bookings when status=upcoming for org admin", async () => {
      const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          status: "upcoming",
        },
        pagination: DefaultPagination,
      });

      req.userId = adminUser.id;
      req.isOrganizationOwnerOrAdmin = true;

      const responseData = await handler(req);
      responseData.bookings.forEach((booking) => {
        expect(new Date(booking.startTime).getTime()).toBeGreaterThanOrEqual(new Date().getTime());
      });
    });
  });

  describe("Expand feature to add relational data in return payload", () => {
    it("Returns only team data when expand=team is set", async () => {
      const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });
      const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "GET",
        query: {
          expand: "team",
        },
        pagination: DefaultPagination,
      });

      req.userId = adminUser.id;
      req.isOrganizationOwnerOrAdmin = true;

      const responseData = await handler(req);
      console.log("bookings=>", responseData.bookings);
      responseData.bookings.forEach((booking) => {
        if (booking.id === 31) expect(booking.eventType?.team?.slug).toBe("team1");
        if (booking.id === 19) expect(booking.eventType?.team).toBe(null);
      });
    });
  });
});
